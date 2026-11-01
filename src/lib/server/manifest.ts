import "server-only";

import { logPassportAccess, readPassengers } from "@/lib/server/passports";
import { BOOKING_COLUMNS, db, type BookingRow } from "@/lib/server/trips";
import { STATUS_LABEL, passengerIssue, type Passenger } from "@/lib/trips";

/** Every booking on one departure ('' = tours without a fixed date), oldest first. */
export async function departureBookings(tourId: string, label: string) {
  let query = db().from("booking_requests").select(BOOKING_COLUMNS).eq("tour_id", tourId);
  query = label ? query.eq("travel_date", label) : query.is("travel_date", null);
  const { data } = await query.order("created_at");
  return (data ?? []) as BookingRow[];
}

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Decrypts passports for a manifest and records the export in the access log. */
export async function manifestPassengers(bookings: BookingRow[], actor: string) {
  const live = bookings.filter((b) => b.status !== "cancelled" && b.passengers_count > 0);
  const entries = await Promise.all(live.map(async (b) => [b.id, await readPassengers(b.id)] as const));
  await Promise.all(live.map((b) => logPassportAccess(actor, b.id, "export")));
  return new Map(entries);
}

/** Passenger manifest for hotels / airlines: one line per passenger, UTF-8 with BOM so Excel reads Cyrillic. */
export function manifestCsv(bookings: BookingRow[], passengersById: Map<string, Passenger[]>) {
  const header = ["№", "Захиалга", "Төлөв", "Овог нэр (паспорт)", "Хүйс", "Төрсөн огноо", "Паспорт №", "Дуусах", "Анхааруулга", "Захиалагч", "Утас", "Ганц өрөө", "Төлсөн", "Нийт", "Тэмдэглэл"];
  const lines = [header];
  let n = 0;
  for (const b of bookings.filter((b) => b.status !== "cancelled")) {
    const passengers = passengersById.get(b.id) ?? [];
    const size = b.adults + b.kids_own_bed + b.kids_shared_bed;
    for (let i = 0; i < Math.max(size, passengers.length); i++) {
      const p = passengers[i];
      lines.push([
        String(++n),
        b.id,
        STATUS_LABEL[b.status],
        p?.name ?? "",
        p?.gender ?? "",
        p?.birth ?? "",
        p?.passport ?? "",
        p?.expiry ?? "",
        p ? (passengerIssue(p, b.travel_date) ?? "") : "Мэдээлэл ирээгүй",
        i === 0 ? b.name : "",
        i === 0 ? b.phone : "",
        i === 0 && b.single_rooms ? String(b.single_rooms) : "",
        i === 0 ? String(b.paid_amount) : "",
        i === 0 ? String(b.total) : "",
        i === 0 ? [b.note, b.staff_note].filter(Boolean).join(" / ") : "",
      ]);
    }
  }
  return "\uFEFF" + lines.map((l) => l.map(cell).join(",")).join("\r\n");
}
