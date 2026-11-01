import "server-only";

import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { db, postMessage, refreshSeats, SEATS_TAG } from "@/lib/server/trips";
import { HOLDING_STATUSES, type SeatMap } from "@/lib/trips";
import { unstable_cache } from "next/cache";

type DepartureRow = { tour_id: string; date_label: string; capacity: number | null; closed: boolean };
type HeldRow = { tour_id: string; travel_date: string | null; adults: number; kids_own_bed: number; kids_shared_bed: number };

const people = (r: HeldRow) => r.adults + r.kids_own_bed + r.kids_shared_bed;

/** People holding seats per "tourId|label" (new, contacted, confirmed and paid bookings). */
export async function heldSeats(tourIds?: string[]) {
  const db = supabaseAdmin();
  const held = new Map<string, number>();
  if (!db) return held;
  let query = db.from("booking_requests").select("tour_id, travel_date, adults, kids_own_bed, kids_shared_bed").in("status", HOLDING_STATUSES);
  if (tourIds) query = query.in("tour_id", tourIds);
  const { data } = await query;
  for (const r of (data ?? []) as HeldRow[]) {
    const key = `${r.tour_id}|${r.travel_date ?? ""}`;
    held.set(key, (held.get(key) ?? 0) + people(r));
  }
  return held;
}

async function loadSeats(): Promise<SeatMap> {
  const db = supabaseAdmin();
  if (!db) return {};
  const { data, error } = await db.from("departures").select("tour_id, date_label, capacity, closed");
  if (error) {
    console.error("departures load failed", error.code, error.message);
    return {};
  }
  const rows = (data ?? []) as DepartureRow[];
  const tracked = rows.filter((r) => r.closed || r.capacity != null);
  if (!tracked.length) return {};
  const held = await heldSeats([...new Set(tracked.map((r) => r.tour_id))]);

  const map: SeatMap = {};
  for (const r of tracked) {
    const left = r.closed ? 0 : Math.max(0, (r.capacity ?? 0) - (held.get(`${r.tour_id}|${r.date_label}`) ?? 0));
    (map[r.tour_id] ??= {})[r.date_label] = { left, closed: r.closed };
  }
  return map;
}

export const getSeats = unstable_cache(loadSeats, ["seats"], { tags: [SEATS_TAG], revalidate: 600 });

/** Live (uncached) state of one departure, for accepting a booking. */
export async function departureState(tourId: string, label: string) {
  const db = supabaseAdmin();
  if (!db) return { capacity: null, closed: false, held: 0 };
  const { data } = await db.from("departures").select("capacity, closed").eq("tour_id", tourId).eq("date_label", label).maybeSingle();
  if (!data || (data.capacity == null && !data.closed)) return { capacity: null, closed: false, held: 0 };
  const held = await heldSeats([tourId]);
  return { capacity: data.capacity as number | null, closed: data.closed as boolean, held: held.get(`${tourId}|${label}`) ?? 0 };
}

/** Moves waitlisted requests (oldest first) back into the queue while seats are free. Returns how many. */
export async function promoteWaitlist(tourId: string, label: string) {
  const dep = await departureState(tourId, label);
  if (dep.capacity == null || dep.closed) return 0;
  let free = dep.capacity - dep.held;
  if (free <= 0) return 0;

  let query = db().from("booking_requests").select("id, adults, kids_own_bed, kids_shared_bed").eq("tour_id", tourId).eq("status", "waitlist");
  query = label ? query.eq("travel_date", label) : query.is("travel_date", null);
  const { data } = await query.order("created_at");

  let promoted = 0;
  for (const w of data ?? []) {
    const size = w.adults + w.kids_own_bed + w.kids_shared_bed;
    if (size > free) continue;
    const { data: moved } = await db()
      .from("booking_requests")
      .update({ status: "new", updated_at: new Date().toISOString() })
      .eq("id", w.id)
      .eq("status", "waitlist")
      .select("id");
    if (!moved?.length) continue;
    await postMessage(w.id, "system", "Суудал гарлаа! 🎉 Таны хүсэлт хүлээлгээс гарч идэвхжлээ. Манай баг удахгүй холбогдож баталгаажуулна.");
    free -= size;
    promoted++;
  }
  if (promoted) refreshSeats();
  return promoted;
}
