import { settleQpayPayment } from "@/lib/server/payments";

export const runtime = "nodejs";

/**
 * QPay calls this after a payment. The request itself proves nothing: the payment is re-read with
 * payment/check before anything is marked paid, and repeated callbacks are handled once.
 * TODO(confirm with provider): whether QPay retries failed callbacks (the daily job re-checks either way).
 */
async function handle(request: Request) {
  const id = new URL(request.url).searchParams.get("payment") ?? "";
  if (!/^ET-[A-Z0-9]{8}-[A-F0-9]{6}$/.test(id)) return new Response("bad request", { status: 400 });
  try {
    await settleQpayPayment(id);
  } catch (e) {
    console.error("qpay callback failed", id, e);
    return new Response("retry", { status: 502 });
  }
  return new Response("SUCCESS");
}

export const GET = handle;
export const POST = handle;
