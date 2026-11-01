import { formatPrice, tourDates, type Tour } from "@/data/tours";
import { daysUntil } from "@/lib/dates";
import { CONTENT_TAG } from "@/lib/server/content";
import { documentSlots } from "@/lib/documents";
import { purgeOldEvents } from "@/lib/server/analytics";
import { getContractTemplate } from "@/lib/server/contract";
import { deleteDocuments } from "@/lib/server/documents";
import { retryReceipts } from "@/lib/server/ebarimt";
import { purgeExpiredPassports } from "@/lib/server/passports";
import { recheckPendingQpay } from "@/lib/server/payments";
import { promoteWaitlist } from "@/lib/server/seats";
import { checklistReminder } from "@/lib/server/trip-assistant";
import { BOOKING_COLUMNS, db, postMessage, type BookingRow } from "@/lib/server/trips";
import type { TripStatus } from "@/lib/trips";
import { revalidateTag } from "next/cache";

export const runtime = "nodejs";
// Reminder intros call the AI model
export const maxDuration = 300;

type Row = {
  id: string;
  tour_id: string;
  travel_date: string | null;
  status: TripStatus;
  total: number;
  paid_amount: number;
  adults: number;
  kids_own_bed: number;
  kids_shared_bed: number;
  passengers_ready: number;
  care_done: boolean;
};

/**
 * Daily housekeeping (vercel.json cron, 09:00 Ulaanbaatar). Every message has a key, so a
 * re-run or a missed day never sends anything twice.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("unauthorized", { status: 401 });

  const client = db();
  const done = { ended: [] as string[], reminders: 0, promoted: 0 };

  // 1. Tours whose last departure has left drop out of listings (staff can reopen in /admin)
  const { data: tourRows } = await client.from("tours").select("id, data");
  const tours = new Map<string, Tour>();
  for (const r of tourRows ?? []) {
    const t = r.data as Tour;
    tours.set(r.id, t);
    const dates = tourDates(t);
    if (t.status !== "ended" && dates.length && dates.every((d) => (daysUntil(d) ?? 1) < 0)) {
      const { error } = await client.from("tours").update({ data: { ...t, status: "ended" }, updated_at: new Date().toISOString(), updated_by: "cron" }).eq("id", r.id);
      if (!error) done.ended.push(r.id);
    }
  }
  if (done.ended.length) revalidateTag(CONTENT_TAG, { expire: 0 });

  // 2. Traveller reminders
  const { data: bookings } = await client
    .from("booking_requests")
    .select("id, tour_id, travel_date, status, total, paid_amount, adults, kids_own_bed, kids_shared_bed, passengers_ready, care_done")
    .in("status", ["confirmed", "paid"])
    .not("travel_date", "is", null)
    .limit(5000);
  const ids = (bookings ?? []).map((b) => b.id);
  const [{ data: uploaded }, { data: signedRows }, { data: sentRows }, template] = await Promise.all([
    ids.length ? client.from("booking_documents").select("booking_id, status").in("booking_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? client.from("booking_contracts").select("booking_id").in("booking_id", ids) : Promise.resolve({ data: [] }),
    ids.length ? client.from("booking_messages").select("booking_id, key").in("booking_id", ids).like("key", "todo-%") : Promise.resolve({ data: [] }),
    getContractTemplate(),
  ]);
  const sentKeys = new Set((sentRows ?? []).map((r) => `${r.booking_id}:${r.key}`));
  const uploadedCount = new Map<string, number>();
  for (const d of uploaded ?? []) if (d.status !== "rejected") uploadedCount.set(d.booking_id, (uploadedCount.get(d.booking_id) ?? 0) + 1);
  const signed = new Set((signedRows ?? []).map((r) => r.booking_id));

  const send = async (id: string, key: string, body: string) => {
    await postMessage(id, "system", body, { key });
    done.reminders++;
  };

  for (const b of (bookings ?? []) as Row[]) {
    const days = daysUntil(b.travel_date ?? undefined);
    if (days == null) continue;
    const tour = tours.get(b.tour_id);
    const title = tour?.title ?? "аялал";
    const due = Number(b.total) - Number(b.paid_amount);

    if (days >= 0 && days <= 14 && due > 0) {
      await send(
        b.id,
        days <= 5 ? "balance-5d" : "balance-14d",
        `Төлбөрийн сануулга: «${title}» аяллын үлдэгдэл ${formatPrice(due)}. Хөдлөхөөс өмнө «Төлбөр» хэсгээс QPay-ээр төлнө үү.`,
      );
    }
    // Missing materials: the exact checklist at three points before departure (quick pre-check skips complete bookings)
    const stage = [4, 10, 21].find((n) => days >= 0 && days <= n);
    if (stage != null) {
      const needed = documentSlots(tour?.documents, { adults: b.adults, kids: b.kids_own_bed + b.kids_shared_bed }).length;
      const incomplete =
        b.passengers_ready < b.adults + b.kids_own_bed + b.kids_shared_bed ||
        needed > (uploadedCount.get(b.id) ?? 0) ||
        !b.care_done ||
        (template.published && !signed.has(b.id));
      const key = `todo-${stage}d`;
      if (incomplete && !sentKeys.has(`${b.id}:${key}`)) {
        const { data: full } = await client.from("booking_requests").select(BOOKING_COLUMNS).eq("id", b.id).maybeSingle();
        const body = full ? await checklistReminder(full as BookingRow, days) : null;
        if (body) await send(b.id, key, body);
      }
    }
    if (days >= 2 && days <= 3) {
      await send(
        b.id,
        "remind-3d",
        [
          `«${title}» аялалд ${days} хоног үлдлээ! ✈`,
          tour?.departure ? `Нислэг: ${tour.departure}` : "",
          "Бэлдэх зүйлс: паспорт, валют/карт, цэнэглэгч, хувийн эм, нарны тос.",
          ...(tour?.notes ?? []).slice(0, 3).map((n) => `• ${n}`),
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
    if (days >= 0 && days <= 1) {
      await send(
        b.id,
        "remind-1d",
        `${days === 0 ? "Өнөөдөр" : "Маргааш"} хөдөлнө! Онгоцны буудал дээр нислэгээс 3 цагийн өмнө ирээрэй. Асуух зүйл байвал энд бичээрэй — бид онлайн байна.`,
      );
    }
    const back = tour?.nights != null ? -(tour.nights + 2) : null;
    if (back != null && days <= back && days >= back - 30) {
      await send(b.id, "review", `Эргэн тавтай морил! «${title}» аялал тань ямар байсан бэ? Сэтгэгдэл, зургаа энд хуваалцвал бид маш их баярлана. 🌴`);
    }
  }

  // 3. Requests left unpaid: a nudge after a day, and once more after three
  const dayAgo = new Date(Date.now() - 86400_000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString();
  const { data: unpaid } = await client
    .from("booking_requests")
    .select("id, tour_id, travel_date, created_at, total, deposit")
    .in("status", ["new", "contacted"])
    .eq("paid_amount", 0)
    .not("access_token", "is", null)
    .lt("created_at", dayAgo)
    .gt("created_at", weekAgo)
    .limit(2000);
  for (const b of unpaid ?? []) {
    const days = daysUntil(b.travel_date ?? undefined);
    if (days != null && days < 1) continue;
    const tour = tours.get(b.tour_id);
    if (tour && (tour.status === "ended" || tour.tag === "soon")) continue;
    const title = tour?.title ?? "аялал";
    const due = Number(b.deposit) || Number(b.total);
    const ageDays = (Date.now() - new Date(b.created_at).getTime()) / 86400_000;
    if (ageDays >= 3) {
      await send(
        b.id,
        "unpaid-72h",
        `«${title}» аяллын суудал хязгаартай тул урьдчилгаагаа эрт төлөхийг зөвлөж байна. ${formatPrice(due)}-ийг «Төлбөр» хэсгээс QPay эсвэл хуваан төлөх аргаар төлөөрэй. Асуух зүйл байвал энд бичээрэй 🙏`,
      );
    } else {
      await send(
        b.id,
        "unpaid-24h",
        `«${title}» аяллын захиалга тань төлбөр хүлээж байна. ${formatPrice(due)}-ийг «Төлбөр» хэсгээс төлмөгц суудал тань баталгаажна.`,
      );
    }
  }

  // 4. Seats freed since yesterday go to the waitlist
  const { data: deps } = await client.from("departures").select("tour_id, date_label").not("capacity", "is", null).eq("closed", false);
  for (const d of deps ?? []) done.promoted += await promoteWaitlist(d.tour_id, d.date_label);

  // 5. Payments whose QPay callback never arrived, receipts not yet issued, expired passport data
  const settled = await recheckPendingQpay();
  const receipts = await retryReceipts();
  const purgedIds = await purgeExpiredPassports();
  for (const id of purgedIds) await deleteDocuments(id);
  const oldEvents = await purgeOldEvents();

  return Response.json({ ...done, settled, receipts, purgedPersonalData: purgedIds.length, oldEvents });
}
