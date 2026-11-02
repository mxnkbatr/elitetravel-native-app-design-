import { formatPrice, getTour, isBookable, tourDates } from "@/data/tours";
import { getTours } from "@/lib/server/content";
import { quote } from "@/lib/pricing";
import { currentTraveller } from "@/lib/server/account";
import { pushToStaff, sendLater } from "@/lib/server/push";
import { departureState } from "@/lib/server/seats";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { newAccessToken, postMessage, refreshSeats, statusNotice } from "@/lib/server/trips";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";

type Body = {
  tourId?: unknown;
  date?: unknown;
  name?: unknown;
  phone?: unknown;
  note?: unknown;
  adults?: unknown;
  kidsOwnBed?: unknown;
  kidsSharedBed?: unknown;
  singleRooms?: unknown;
  /** Honeypot — real visitors never see or fill it */
  website?: unknown;
};

const count = (v: unknown, min: number) => (Number.isInteger(v) && (v as number) >= min && (v as number) <= 30 ? (v as number) : null);
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Short, unambiguous reference the traveller can read out over the phone. */
function bookingId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return "ET-" + Array.from(randomBytes(8), (b) => alphabet[b % alphabet.length]).join("");
}

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

/**
 * Saves a booking request. Price is recomputed here from the tour's published rules,
 * so the stored total never depends on what the browser sent.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return fail(400, "Хүсэлт буруу байна.");
  }

  if (text(body.website, 100)) return Response.json({ id: bookingId() }); // quietly drop bots

  const tour = typeof body.tourId === "string" ? getTour(await getTours(), body.tourId) : undefined;
  if (!tour || !isBookable(tour)) return fail(400, "Энэ аялал захиалгад нээлттэй биш байна.");

  const name = text(body.name, 80);
  const phone = text(body.phone, 20);
  const note = text(body.note, 500) || null;
  const date = text(body.date, 60) || null;
  const adults = count(body.adults, 1);
  const kidsOwnBed = count(body.kidsOwnBed ?? 0, 0);
  const kidsSharedBed = count(body.kidsSharedBed ?? 0, 0);
  const singleRooms = count(body.singleRooms ?? 0, 0);

  if (name.length < 2) return fail(400, "Нэрээ оруулна уу.");
  if (!/^[0-9+ ]{8,20}$/.test(phone)) return fail(400, "Утасны дугаараа шалгана уу.");
  if (adults == null || kidsOwnBed == null || kidsSharedBed == null || singleRooms == null) return fail(400, "Хүний тоо буруу байна.");
  const dateOptions = tourDates(tour);
  if (date && dateOptions.length > 1 && !dateOptions.includes(date)) return fail(400, "Огноо буруу байна.");

  const { total, deposit } = quote(tour, { adults, kidsOwnBed, kidsSharedBed, singleRooms });

  const db = supabaseAdmin();
  if (!db) return fail(503, "Захиалгын сан түр холбогдохгүй байна.");

  const departure = await departureState(tour.id, date ?? "");
  if (departure.closed) return fail(400, "Энэ огноо захиалгад хаагдсан байна. Өөр огноо сонгоно уу.");
  const people = adults + kidsOwnBed + kidsSharedBed;
  const status = departure.capacity != null && departure.capacity - departure.held < people ? "waitlist" : "new";

  const id = bookingId();
  const token = newAccessToken();
  const traveller = await currentTraveller();
  const { error } = await db.from("booking_requests").insert({
    access_token: token,
    user_id: traveller?.id ?? null,
    status,
    id,
    tour_id: tour.id,
    tour_title: tour.title,
    travel_date: date,
    name,
    phone,
    adults,
    kids_own_bed: kidsOwnBed,
    kids_shared_bed: kidsSharedBed,
    single_rooms: Math.min(singleRooms, adults),
    total,
    deposit,
    note,
  });

  if (error) {
    console.error("booking insert failed", error.code, error.message);
    return fail(502, "Хүсэлт хадгалахад алдаа гарлаа.");
  }

  await postMessage(
    id,
    "system",
    status === "waitlist"
      ? statusNotice("waitlist", { total, deposit, paid_amount: 0 })!
      : `Сайн байна уу, ${name}! «${tour.title}» аяллын хүсэлтийг хүлээн авлаа (${id}). ${deposit ? `Урьдчилгаа ${formatPrice(deposit)}` : "Төлбөрөө"} «Төлбөр» хэсгээс QPay эсвэл хуваан төлөх аргаар төлмөгц захиалга автоматаар баталгаажна. Асуух зүйлээ энд бичээрэй.`,
  );
  await db.from("booking_requests").update({ traveller_seen_at: new Date().toISOString() }).eq("id", id);
  refreshSeats();
  sendLater(() =>
    pushToStaff("bookings.view", {
      title: status === "waitlist" ? `⏳ Хүлээлэгт · ${id}` : `🆕 Шинэ захиалга · ${id}`,
      body: `${name} · ${tour.title}${date ? ` (${date})` : ""} · ${people} хүн · ${formatPrice(total)}`,
      url: `/admin?q=${id}`,
      tag: id,
    }),
  );

  return Response.json({ id, total, deposit, token, status }, { status: 201 });
}
