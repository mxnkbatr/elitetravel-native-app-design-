import { createQpayPayment, PaymentError } from "@/lib/server/payments";
import { bookingFromRequest } from "@/lib/server/trip-view";
import type { PayOption } from "@/lib/trips";

export const runtime = "nodejs";

/** Opens a QPay invoice for the traveller's booking. Body: { kind: "deposit" | "balance" | "full" }; header x-trip-token. */
export async function POST(request: Request) {
  const b = await bookingFromRequest(request);
  if (!b) return Response.json({ error: "Захиалга олдсонгүй." }, { status: 404 });
  const { kind } = (await request.json().catch(() => ({}))) as { kind?: PayOption["kind"] };
  if (kind !== "deposit" && kind !== "balance" && kind !== "full") return Response.json({ error: "Буруу хүсэлт." }, { status: 400 });

  try {
    return Response.json(await createQpayPayment(b, kind, new URL(request.url).origin));
  } catch (e) {
    if (e instanceof PaymentError) return Response.json({ error: e.message }, { status: e.status });
    console.error("qpay invoice failed", e);
    return Response.json({ error: "QPay нэхэмжлэх үүсгэж чадсангүй. Дахин оролдоно уу." }, { status: 502 });
  }
}
