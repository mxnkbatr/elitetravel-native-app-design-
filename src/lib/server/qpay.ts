import "server-only";

import { randomBytes } from "node:crypto";

/**
 * QPay merchant API v2 behind an adapter, so nothing calls QPay until real credentials exist.
 *   live — QPAY_USERNAME / QPAY_PASSWORD / QPAY_INVOICE_CODE set; QPAY_BASE_URL picks sandbox or production
 *   mock — local testing: fake invoices, paid through /api/payments/qpay/mock-pay. Never on Vercel production.
 *   off  — online payment hidden
 * Payment state is always re-read with checkInvoice(); a callback alone never marks anything paid.
 */
export type QpayMode = "live" | "mock" | "off";

export type QpayInvoice = {
  invoiceId: string;
  qrText: string | null;
  qrImage: string | null;
  urls: { name: string; description?: string; logo?: string; link: string }[];
};

export type QpayCheck = { paidAmount: number };

type Adapter = {
  createInvoice(o: { paymentId: string; amount: number; description: string; callbackUrl: string }): Promise<QpayInvoice>;
  checkInvoice(invoiceId: string): Promise<QpayCheck>;
};

/** QPay issues these as "client name" / "client secret"; both naming styles are accepted. */
const clientName = () => process.env.QPAY_USERNAME || process.env.QPAY_CLIENT_NAME;
const clientSecret = () => process.env.QPAY_PASSWORD || process.env.QPAY_CLIENT_SECRET;
const configured = () => Boolean(clientName() && clientSecret() && process.env.QPAY_INVOICE_CODE);
const onVercelProduction = () => process.env.VERCEL_ENV === "production";

export function qpayMode(): QpayMode {
  const requested = process.env.QPAY_MODE;
  if (requested === "mock") return onVercelProduction() ? "off" : "mock";
  if (requested === "live") return configured() ? "live" : "off";
  if (configured()) return "live";
  return process.env.NODE_ENV === "development" ? "mock" : "off";
}

/* ── live ─────────────────────────────────────────────────────────────── */

const BASE = () => process.env.QPAY_BASE_URL || (process.env.QPAY_AUTH_URL ? new URL(process.env.QPAY_AUTH_URL).origin : "https://merchant.qpay.mn");
let token: { value: string; until: number } | null = null;

async function accessToken(force = false) {
  if (!force && token && token.until > Date.now()) return token.value;
  const basic = Buffer.from(`${clientName()}:${clientSecret()}`).toString("base64");
  const res = await fetch(process.env.QPAY_AUTH_URL || `${BASE()}/v2/auth/token`, { method: "POST", headers: { Authorization: `Basic ${basic}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`QPay auth ${res.status}`);
  const json = (await res.json()) as { access_token: string };
  // TODO(confirm with provider): token lifetime and the refresh endpoint are not documented publicly;
  // reuse briefly and re-authenticate on 401 instead of relying on refresh_token.
  token = { value: json.access_token, until: Date.now() + 10 * 60_000 };
  return token.value;
}

async function call<T>(path: string, body: unknown, retried = false): Promise<T> {
  const res = await fetch(`${BASE()}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken(retried)}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (res.status === 401 && !retried) return call<T>(path, body, true);
  if (!res.ok) throw new Error(`QPay ${path} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()) as T;
}

const live: Adapter = {
  async createInvoice(o) {
    const r = await call<{ invoice_id: string; qr_text?: string; qr_image?: string; urls?: QpayInvoice["urls"] }>("/v2/invoice", {
      invoice_code: process.env.QPAY_INVOICE_CODE,
      sender_invoice_no: o.paymentId,
      invoice_receiver_code: "terminal",
      invoice_description: o.description.slice(0, 250),
      amount: o.amount,
      callback_url: o.callbackUrl,
    });
    // `urls` includes "Toki App" (seen 2026-10-31); Pocket, Simple and Dari were not in it.
    // TODO(confirm with provider): invoice expiry
    return { invoiceId: r.invoice_id, qrText: r.qr_text ?? null, qrImage: r.qr_image ?? null, urls: r.urls ?? [] };
  },
  async checkInvoice(invoiceId) {
    const r = await call<{ rows?: { payment_status: string; payment_amount: string | number }[] }>("/v2/payment/check", {
      object_type: "INVOICE",
      object_id: invoiceId,
      offset: { page_number: 1, page_limit: 100 },
    });
    // TODO(confirm with provider): whether Toki PayLater payments through the QR also come back as PAID
    const paidAmount = (r.rows ?? []).filter((x) => x.payment_status === "PAID").reduce((s, x) => s + Number(x.payment_amount), 0);
    return { paidAmount };
  },
};

/* ── mock ─────────────────────────────────────────────────────────────── */

const g = globalThis as typeof globalThis & { __qpayMock?: Map<string, { amount: number; paid: boolean }> };
const mockInvoices = (g.__qpayMock ??= new Map());

const mock: Adapter = {
  async createInvoice(o) {
    const invoiceId = `MOCK-${randomBytes(6).toString("hex")}`;
    mockInvoices.set(invoiceId, { amount: o.amount, paid: false });
    return { invoiceId, qrText: `MOCK:${o.paymentId}:${o.amount}`, qrImage: null, urls: [] };
  },
  async checkInvoice(invoiceId) {
    const inv = mockInvoices.get(invoiceId);
    return { paidAmount: inv?.paid ? inv.amount : 0 };
  },
};

/** Test helper for mock mode: pretend the customer paid. */
export function markMockInvoicePaid(invoiceId: string) {
  const inv = mockInvoices.get(invoiceId);
  if (!inv) return false;
  inv.paid = true;
  return true;
}

export function qpay(): Adapter {
  const mode = qpayMode();
  if (mode === "live") return live;
  if (mode === "mock") return mock;
  throw new Error("QPay is not configured");
}
