import "server-only";

import { formatPrice } from "@/data/tours";
import { reportError } from "@/lib/server/error-log";
import { pushToBooking, pushToStaff, sendLater } from "@/lib/server/push";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import type { TripStatus } from "@/lib/trips";
import { revalidateTag } from "next/cache";
import { randomBytes } from "node:crypto";

/** Cache tag for seat availability; expire it whenever a booking's status or party changes. */
export const SEATS_TAG = "seats";

export function db() {
  const client = supabaseAdmin();
  if (!client) throw new Error("Supabase is not configured");
  return client;
}

export function refreshSeats() {
  revalidateTag(SEATS_TAG, { expire: 0 });
}

/** Device secret for one booking: reading it, chatting, paying. */
export function newAccessToken() {
  return randomBytes(24).toString("base64url");
}

export type BookingRow = {
  id: string;
  created_at: string;
  tour_id: string;
  tour_title: string;
  travel_date: string | null;
  name: string;
  phone: string;
  adults: number;
  kids_own_bed: number;
  kids_shared_bed: number;
  single_rooms: number;
  total: number;
  deposit: number;
  paid_amount: number;
  note: string | null;
  status: TripStatus;
  staff_note: string | null;
  source: string;
  passengers_count: number;
  passengers_ready: number;
  passport_consent_at: string | null;
  traveller_seen_at: string | null;
  staff_seen_at: string | null;
};

/** Everything except the access token and passport details (see passports.ts). */
export const BOOKING_COLUMNS =
  "id, created_at, tour_id, tour_title, travel_date, name, phone, adults, kids_own_bed, kids_shared_bed, single_rooms, total, deposit, paid_amount, note, status, staff_note, source, calculator, passengers_count, passengers_ready, passport_consent_at, traveller_seen_at, staff_seen_at";

/**
 * Adds a message to a booking's thread and pushes it: staff and system messages to the
 * traveller's phones, traveller messages to staff. With `key`, the message is sent at most
 * once per booking (reminders, notices), so jobs can safely run again. `push: false` skips
 * the notification for notes about something the traveller just did themselves.
 */
export async function postMessage(
  bookingId: string,
  sender: "traveller" | "staff" | "system",
  body: string,
  opts: { author?: string; key?: string; push?: boolean } = {},
) {
  const row = { booking_id: bookingId, sender, body: body.slice(0, 2000), author: opts.author ?? null, key: opts.key ?? null };
  const query = opts.key
    ? db().from("booking_messages").upsert(row, { onConflict: "booking_id,key", ignoreDuplicates: true }).select("id")
    : db().from("booking_messages").insert(row).select("id");
  const { data, error } = await query;
  if (error) await reportError("message insert failed", error, { booking: bookingId });
  const inserted = !error && (data?.length ?? 0) > 0;
  if (inserted && opts.push !== false) sendLater(() => notifyMessage(bookingId, sender, row.body));
  return !error;
}

async function notifyMessage(bookingId: string, sender: "traveller" | "staff" | "system", body: string) {
  const text = body.replace(/\s+/g, " ").trim();
  if (sender !== "traveller") {
    return pushToBooking(bookingId, { title: sender === "staff" ? "Elite Travel 💬" : "Elite Travel", body: text, url: `/bookings/${bookingId}`, tag: bookingId });
  }
  const { data } = await db().from("booking_requests").select("name").eq("id", bookingId).maybeSingle();
  return pushToStaff("bookings.view", { title: `💬 ${data?.name ?? "Аялагч"} · ${bookingId}`, body: text, url: `/admin?q=${bookingId}`, tag: bookingId });
}

/** The automatic note a traveller gets when staff move their booking to `status`. */
export function statusNotice(status: TripStatus, b: { total: number; deposit: number; paid_amount: number }) {
  switch (status) {
    case "confirmed": {
      const due = b.deposit > b.paid_amount ? b.deposit - b.paid_amount : b.total - b.paid_amount;
      return [
        "Таны захиалга баталгаажлаа ✅",
        due > 0 ? `«Төлбөр» хэсгээс ${formatPrice(due)}-ийг QPay-ээр төлснөөр суудал тань баталгаажна.` : "",
        "Зорчигчдын паспортын мэдээллийг «Зорчигчид» хэсэгт оруулаарай.",
      ]
        .filter(Boolean)
        .join("\n");
    }
    case "paid":
      return "Төлбөр бүрэн төлөгдлөө. Баярлалаа! Хөдлөхөөс өмнө бүх мэдээллийг энд илгээнэ.";
    case "cancelled":
      return "Таны захиалга цуцлагдлаа. Асуух зүйл байвал энд бичээрэй.";
    case "waitlist":
      return "Сонгосон огноо дүүрсэн тул хүлээлгийн жагсаалтад орлоо. Суудал гармагц энд мэдэгдэнэ.";
    default:
      return null;
  }
}

/**
 * Recomputes what a booking has paid from its settled payments and moves it forward:
 * any payment confirms it, the full amount marks it paid.
 */
export async function applyPayments(bookingId: string, justPaid: number) {
  const client = db();
  const [{ data: booking }, { data: paidRows }] = await Promise.all([
    client.from("booking_requests").select("status, total, name").eq("id", bookingId).maybeSingle(),
    client.from("payments").select("amount").eq("booking_id", bookingId).eq("status", "paid"),
  ]);
  if (!booking) return;
  const paid = (paidRows ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const total = Number(booking.total);
  const before = booking.status as TripStatus;
  let status = before;
  if (paid >= total) status = "paid";
  else if (status === "new" || status === "contacted" || status === "waitlist") status = "confirmed";

  await client.from("booking_requests").update({ paid_amount: paid, status, updated_at: new Date().toISOString() }).eq("id", bookingId);
  await postMessage(
    bookingId,
    "system",
    [
      paid >= total
        ? `${formatPrice(justPaid)} төлбөр хүлээн авлаа. Төлбөр бүрэн төлөгдлөө — баярлалаа! 🎉`
        : `${formatPrice(justPaid)} төлбөр хүлээн авлаа. Нийт төлсөн: ${formatPrice(paid)} / ${formatPrice(total)}. Үлдэгдлийг хөдлөхөөс 14 хоногийн өмнө төлнө.`,
      before !== "confirmed" && before !== "paid" ? "Таны захиалга баталгаажлаа ✅ Зорчигчдын паспортын мэдээллийг «Зорчигчид» хэсэгт оруулаарай." : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  sendLater(() =>
    pushToStaff("bookings.view", {
      title: `💰 ${formatPrice(justPaid)} · ${bookingId}`,
      body: `${booking.name ?? "Аялагч"} төлбөр төллөө. Нийт ${formatPrice(paid)} / ${formatPrice(total)}.`,
      url: `/admin?q=${bookingId}`,
      tag: `pay-${bookingId}`,
    }),
  );
  refreshSeats();
}
