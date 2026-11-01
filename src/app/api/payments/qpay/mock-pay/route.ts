import { settleQpayPayment } from "@/lib/server/payments";
import { markMockInvoicePaid, qpayMode } from "@/lib/server/qpay";
import { bookingFromRequest } from "@/lib/server/trip-view";
import { db } from "@/lib/server/trips";

export const runtime = "nodejs";

/** Mock mode only: simulates the customer paying the open invoice, then runs the normal callback path. */
export async function POST(request: Request) {
  if (qpayMode() !== "mock") return new Response("not found", { status: 404 });
  const b = await bookingFromRequest(request);
  if (!b) return Response.json({ error: "Захиалга олдсонгүй." }, { status: 404 });
  const { paymentId } = (await request.json().catch(() => ({}))) as { paymentId?: string };
  const { data: p } = await db().from("payments").select("id, qpay_invoice_id").eq("id", paymentId ?? "").eq("booking_id", b.id).maybeSingle();
  if (!p?.qpay_invoice_id || !markMockInvoicePaid(p.qpay_invoice_id)) {
    return Response.json({ error: "Туршилтын нэхэмжлэх олдсонгүй (сервер дахин асвал шинээр үүсгэнэ үү)." }, { status: 404 });
  }
  await settleQpayPayment(p.id);
  return Response.json({ ok: true });
}
