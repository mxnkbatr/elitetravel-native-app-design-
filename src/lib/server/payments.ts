import "server-only";

import { issueReceipt } from "@/lib/server/ebarimt";
import { reportError } from "@/lib/server/error-log";
import { qpay, qpayMode } from "@/lib/server/qpay";
import { applyPayments, db, type BookingRow } from "@/lib/server/trips";
import { payOptions, type PayOption } from "@/lib/trips";
import { randomBytes } from "node:crypto";

/** Everything that follows a settled payment: booking totals/status, traveller notice, И-баримт. */
export async function onPaymentPaid(paymentId: string, bookingId: string, amount: number) {
  await applyPayments(bookingId, amount);
  await issueReceipt(paymentId);
}

export type QpayPayment = {
  paymentId: string;
  amount: number;
  qrText: string | null;
  qrImage: string | null;
  urls: { name: string; description?: string; logo?: string; link: string }[];
  mock: boolean;
};

/**
 * Opens (or reuses, for 12 h) a QPay invoice for one of the booking's current pay options.
 * Older pending invoices stay open on purpose: if one of them gets paid it is still settled.
 */
export async function createQpayPayment(b: BookingRow, kind: PayOption["kind"], origin: string): Promise<QpayPayment> {
  const mode = qpayMode();
  if (mode === "off") throw new PaymentError(503, "Онлайн төлбөр түр ажиллахгүй байна. Манай багтай холбогдоно уу.");
  const option = payOptions(b.status, Number(b.total), Number(b.deposit), Number(b.paid_amount)).find((o) => o.kind === kind);
  if (!option) throw new PaymentError(400, "Одоогоор төлбөр хийх боломжгүй байна.");

  const client = db();
  const { data: open } = await client
    .from("payments")
    .select("id, amount, created_at, qr_text, qr_image, urls, qpay_invoice_id")
    .eq("booking_id", b.id)
    .eq("status", "pending")
    .eq("method", "qpay")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const reusable =
    open &&
    Number(open.amount) === option.amount &&
    Date.now() - new Date(open.created_at).getTime() < 12 * 3600_000 &&
    String(open.qpay_invoice_id).startsWith("MOCK-") === (mode === "mock");
  if (reusable) {
    return { paymentId: open.id, amount: option.amount, qrText: open.qr_text, qrImage: open.qr_image, urls: open.urls ?? [], mock: mode === "mock" };
  }

  const paymentId = `${b.id}-${randomBytes(3).toString("hex").toUpperCase()}`;
  const base = process.env.SITE_URL || origin;
  const invoice = await qpay().createInvoice({
    paymentId,
    amount: option.amount,
    description: `${b.id} · ${b.tour_title} · ${option.label}`,
    callbackUrl: `${base}/api/payments/qpay/callback?payment=${encodeURIComponent(paymentId)}`,
  });
  const { error } = await client.from("payments").insert({
    id: paymentId,
    booking_id: b.id,
    amount: option.amount,
    method: "qpay",
    qpay_invoice_id: invoice.invoiceId,
    qr_image: invoice.qrImage,
    qr_text: invoice.qrText,
    urls: invoice.urls,
  });
  if (error) throw new Error(error.message);
  return { paymentId, amount: option.amount, ...invoice, mock: mode === "mock" };
}

/**
 * Settles one pending QPay payment if QPay reports it paid. Idempotent and safe under concurrent
 * callers (callback, app polling, cron): only the call that flips pending → paid applies it.
 */
export async function settleQpayPayment(paymentId: string) {
  const client = db();
  const { data: p } = await client
    .from("payments")
    .select("id, booking_id, amount, status, method, qpay_invoice_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (!p || p.method !== "qpay") return false;
  if (p.status !== "pending" || !p.qpay_invoice_id) return p.status === "paid";
  if (String(p.qpay_invoice_id).startsWith("MOCK-") !== (qpayMode() === "mock")) return false;

  const { paidAmount } = await qpay().checkInvoice(p.qpay_invoice_id);
  if (paidAmount < Number(p.amount)) return false;

  const { data: flipped } = await client
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", p.id)
    .eq("status", "pending")
    .select("id");
  if (flipped?.length) await onPaymentPaid(p.id, p.booking_id, Number(p.amount));
  return true;
}

/** Re-checks a booking's (or all recent) pending QPay payments — for polling and the daily job. */
export async function recheckPendingQpay(bookingId?: string) {
  if (qpayMode() === "off") return 0;
  let query = db()
    .from("payments")
    .select("id")
    .eq("status", "pending")
    .eq("method", "qpay")
    .gt("created_at", new Date(Date.now() - 7 * 86400_000).toISOString());
  if (bookingId) query = query.eq("booking_id", bookingId);
  const { data } = await query;
  let settled = 0;
  for (const p of data ?? []) {
    try {
      if (await settleQpayPayment(p.id)) settled++;
    } catch (e) {
      await reportError("qpay recheck failed", e, { payment: p.id });
    }
  }
  return settled;
}

export class PaymentError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
