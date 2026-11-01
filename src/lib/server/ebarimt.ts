import "server-only";

import { db } from "@/lib/server/trips";
import { randomBytes } from "node:crypto";

/**
 * И-баримт for every settled payment (Татварын ерөнхий хууль 28.5), behind an adapter:
 *   mock   — local testing; receipts are clearly marked as test receipts
 *   posapi — PosAPI 3.0 (developer.itc.gov.mn); not implemented until tax credentials arrive
 *   off    — receipts stay 'pending' and are issued once an adapter is enabled
 * EBARIMT_MODE picks it; without it, development uses mock and everything else is off.
 */
export type EbarimtMode = "mock" | "posapi" | "off";

export type ReceiptRequest = {
  paymentId: string;
  bookingId: string;
  amount: number;
  description: string;
  // TODO(confirm with provider): B2B receipts (company register number) and VAT / city-tax treatment of
  // outbound tour packages are unconfirmed, so no tax split is computed here yet.
};

export type ReceiptResult = { billId: string; lottery: string | null; qrData: string | null };

type Adapter = { issue(req: ReceiptRequest): Promise<ReceiptResult> };

export function ebarimtMode(): EbarimtMode {
  const requested = process.env.EBARIMT_MODE;
  if (requested === "mock") return process.env.VERCEL_ENV === "production" ? "off" : "mock";
  if (requested === "posapi" || requested === "off") return requested;
  return process.env.NODE_ENV === "development" ? "mock" : "off";
}

const mock: Adapter = {
  async issue(req) {
    return { billId: `MOCK-${req.paymentId}-${randomBytes(2).toString("hex")}`, lottery: null, qrData: null };
  },
};

const posapi: Adapter = {
  async issue() {
    // TODO(confirm with provider): PosAPI 3.0 endpoint, merchant TIN / POS number, item classification
    // codes and the request format come with the tax office credentials.
    throw new Error("PosAPI 3.0 is not connected yet");
  },
};

const adapters: Record<Exclude<EbarimtMode, "off">, Adapter> = { mock, posapi };

/**
 * Creates (once) and tries to issue the receipt for a paid payment. Safe to call again:
 * the receipt row is unique per payment and issued rows are left alone.
 */
export async function issueReceipt(paymentId: string) {
  const client = db();
  const { data: payment } = await client
    .from("payments")
    .select("id, booking_id, amount, status, booking_requests(tour_title)")
    .eq("id", paymentId)
    .maybeSingle();
  if (!payment || payment.status !== "paid") return null;

  await client
    .from("receipts")
    .upsert({ payment_id: payment.id, booking_id: payment.booking_id, amount: payment.amount }, { onConflict: "payment_id", ignoreDuplicates: true });
  const { data: receipt } = await client.from("receipts").select("id, status, attempts").eq("payment_id", payment.id).single();
  if (!receipt || receipt.status === "issued") return receipt;

  const mode = ebarimtMode();
  if (mode === "off") return receipt;

  const tour = (payment.booking_requests as unknown as { tour_title: string } | null)?.tour_title ?? "Аялал";
  try {
    const r = await adapters[mode].issue({ paymentId: payment.id, bookingId: payment.booking_id, amount: Number(payment.amount), description: `${tour} · ${payment.booking_id}` });
    await client
      .from("receipts")
      .update({ status: "issued", provider: mode, bill_id: r.billId, lottery: r.lottery, qr_data: r.qrData, issued_at: new Date().toISOString(), attempts: receipt.attempts + 1, error: null })
      .eq("id", receipt.id);
  } catch (e) {
    await client
      .from("receipts")
      .update({ status: "failed", provider: mode, attempts: receipt.attempts + 1, error: String((e as Error).message).slice(0, 500) })
      .eq("id", receipt.id);
  }
  return receipt;
}

/** Issues receipts left pending or failed (adapter was off, PosAPI down…). */
export async function retryReceipts(limit = 100) {
  const { data } = await db().from("receipts").select("payment_id").neq("status", "issued").lt("attempts", 20).order("created_at").limit(limit);
  for (const r of data ?? []) await issueReceipt(r.payment_id);
  return data?.length ?? 0;
}
