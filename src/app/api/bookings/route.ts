import { formatPrice, getTour, isBookable, tourDates } from "@/data/tours";
import { calculateTourPrice, parseCalculatorState } from "@/lib/tour-calculator";
import { quote } from "@/lib/pricing";
import { getTours } from "@/lib/server/content";
import { currentTraveller } from "@/lib/server/account";
import { clientIp, rateLimit } from "@/lib/server/chat-security";
import { reportError } from "@/lib/server/error-log";
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
  calculator?: unknown;
  /** Honeypot — real visitors never see or fill it */
  website?: unknown;
};

const count = (v: unknown, min: number) => (Number.isInteger(v) && (v as number) >= min && (v as number) <= 30 ? (v as number) : null);
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

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

  if (text(body.website, 100)) return Response.json({ id: bookingId() });
  if (!rateLimit(`booking:${clientIp(request)}`, 5) || !rateLimit(`booking-phone:${text(body.phone, 20).replace(/\D/g, "")}`, 3, 10 * 60_000)) {
    return fail(429, "Хэт олон хүсэлт илгээлээ. Хэдэн минут хүлээгээд дахин оролдоно уу, эсвэл манай утсаар холбогдоно уу.");
  }

  const tour = typeof body.tourId === "string" ? getTour(await getTours(), body.tourId) : undefined;
  if (!tour || !isBookable(tour)) return fail(400, "Энэ аялал захиалгад нээлттэй биш байна.");

  const name = text(body.name, 80);
  const phone = text(body.phone, 20);
  const note = text(body.note, 500) || null;
  const date = text(body.date, 60) || null;

  if (name.length < 2) return fail(400, "Нэрээ оруулна уу.");
  if (!/^[0-9+ ]{8,20}$/.test(phone)) return fail(400, "Утасны дугаараа шалгана уу.");
  const dateOptions = tourDates(tour);
  if (date && dateOptions.length > 1 && !dateOptions.includes(date)) return fail(400, "Огноо буруу байна.");

  let adults: number;
  let kidsOwnBed: number;
  let kidsSharedBed: number;
  let singleRooms: number;
  let total: number;
  let deposit: number;
  let calculator: Record<string, unknown> | null = null;

  const calcState = tour.calculator?.enabled ? parseCalculatorState(body.calculator) : null;
  if (calcState) {
    const q = calculateTourPrice(tour, calcState);
    if (!q.ready) return fail(400, "Өрөөний сонголтоо бүрэн хийнэ үү.");
    adults = q.party.adults;
    kidsOwnBed = q.party.kidsOwnBed;
    kidsSharedBed = q.party.kidsSharedBed;
    singleRooms = q.party.singleRooms;
    total = q.total;
    deposit = q.deposit;
    calculator = {
      adults: calcState.adults,
      children: calcState.children,
      pairRooms: calcState.pairRooms.map((r) => ({
        choice: r.choice,
        extraBed: r.kids.extraBed,
        withParents: r.kids.withParents,
      })),
      oddRoom: calcState.oddRoom
        ? { choice: calcState.oddRoom.choice, extraBed: calcState.oddRoom.kids.extraBed, withParents: calcState.oddRoom.kids.withParents }
        : null,
      childWithBed: q.childWithBed,
      childNoBed: q.childNoBed,
      singleRooms,
      total,
      deposit,
      savings: q.savings,
    };
  } else {
    const a = count(body.adults, 1);
    const own = count(body.kidsOwnBed ?? 0, 0);
    const shared = count(body.kidsSharedBed ?? 0, 0);
    const singles = count(body.singleRooms ?? 0, 0);
    if (a == null || own == null || shared == null || singles == null) return fail(400, "Хүний тоо буруу байна.");
    adults = a;
    kidsOwnBed = own;
    kidsSharedBed = shared;
    singleRooms = singles;
    const q = quote(tour, { adults, kidsOwnBed, kidsSharedBed, singleRooms }, date);
    total = q.total;
    deposit = q.deposit;
  }

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
    calculator,
  });

  if (error) {
    await reportError("booking insert failed", error, { tour: tour.id });
    return fail(502, "Хүсэлт хадгалахад алдаа гарлаа.");
  }

  const calcSummary = calculator
    ? ` Өрөө: ${JSON.stringify({
        pairs: (calculator.pairRooms as unknown[])?.length ?? 0,
        odd: calculator.oddRoom ?? null,
        kidsBed: calculator.childWithBed,
        kidsNoBed: calculator.childNoBed,
      })}.`
    : "";

  await postMessage(
    id,
    "system",
    status === "waitlist"
      ? statusNotice("waitlist", { total, deposit, paid_amount: 0 })!
      : `Сайн байна уу, ${name}! «${tour.title}» аяллын хүсэлтийг хүлээн авлаа (${id}). ${deposit ? `Урьдчилгаа ${formatPrice(deposit)}` : "Төлбөрөө"} «Төлбөр» хэсгээс QPay эсвэл хуваан төлөх аргаар төлмөгц захиалга автоматаар баталгаажна.${calcSummary} Асуух зүйлээ энд бичээрэй.`,
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
