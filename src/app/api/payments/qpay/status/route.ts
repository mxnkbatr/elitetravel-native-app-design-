import { recheckPendingQpay } from "@/lib/server/payments";
import { bookingFromRequest, tripView } from "@/lib/server/trip-view";
import { BOOKING_COLUMNS, db, type BookingRow } from "@/lib/server/trips";

export const runtime = "nodejs";

/** Polled by the payment sheet while a QR is open, in case the callback never arrives. Header x-trip-token. */
export async function POST(request: Request) {
  const b = await bookingFromRequest(request);
  if (!b) return Response.json({ error: "Захиалга олдсонгүй." }, { status: 404 });
  await recheckPendingQpay(b.id);
  const { data } = await db().from("booking_requests").select(BOOKING_COLUMNS).eq("id", b.id).single();
  return Response.json(await tripView(data as BookingRow));
}
