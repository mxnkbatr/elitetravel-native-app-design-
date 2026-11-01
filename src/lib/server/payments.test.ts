import { fake } from "../../../test/fake-supabase";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BookingRow } from "./trips";

vi.mock("./supabase-admin", async () => {
  const m = await import("../../../test/fake-supabase");
  return { supabaseAdmin: () => m.fake };
});
vi.mock("next/cache", () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn(), unstable_cache: (fn: unknown) => fn }));

const { createQpayPayment, settleQpayPayment, recheckPendingQpay } = await import("./payments");
const { markMockInvoicePaid } = await import("./qpay");

const booking = {
  id: "ET-TESTAAAA",
  tour_id: "bali",
  tour_title: "Бали",
  travel_date: "11/20",
  status: "new",
  total: 10_000_000,
  deposit: 5_000_000,
  paid_amount: 0,
} as unknown as BookingRow;

const payments = () => fake.rows("payments");
const bookingRow = () => fake.rows("booking_requests")[0];

beforeEach(() => {
  vi.stubEnv("QPAY_MODE", "mock");
  vi.stubEnv("EBARIMT_MODE", "mock");
  vi.stubEnv("VERCEL_ENV", "");
  fake.reset();
  fake.seed("booking_requests", [{ ...booking }]);
});

describe("QPay payment flow", () => {
  it("does not mark anything paid when the callback arrives before the payment", async () => {
    const p = await createQpayPayment(booking, "deposit", "http://localhost");
    expect(p.mock).toBe(true);
    expect(p.amount).toBe(5_000_000);
    expect(await settleQpayPayment(p.paymentId)).toBe(false);
    expect(payments()[0].status).toBe("pending");
    expect(bookingRow().paid_amount).toBe(0);
  });

  it("reuses the open invoice for the same amount", async () => {
    const a = await createQpayPayment(booking, "deposit", "http://localhost");
    const b = await createQpayPayment(booking, "deposit", "http://localhost");
    expect(b.paymentId).toBe(a.paymentId);
    expect(payments()).toHaveLength(1);
  });

  it("settles exactly once under repeated and concurrent callbacks", async () => {
    const p = await createQpayPayment(booking, "deposit", "http://localhost");
    markMockInvoicePaid(String(payments()[0].qpay_invoice_id));

    const results = await Promise.all([settleQpayPayment(p.paymentId), settleQpayPayment(p.paymentId), settleQpayPayment(p.paymentId)]);
    expect(results.every(Boolean)).toBe(true);
    await settleQpayPayment(p.paymentId);

    expect(payments().filter((x) => x.status === "paid")).toHaveLength(1);
    expect(bookingRow().paid_amount).toBe(5_000_000);
    expect(bookingRow().status).toBe("confirmed");

    const receipts = fake.rows("receipts");
    expect(receipts).toHaveLength(1);
    expect(receipts[0]).toMatchObject({ status: "issued", provider: "mock", amount: 5_000_000 });

    const notices = fake.rows("booking_messages").filter((m) => String(m.body).includes("төлбөр хүлээн авлаа"));
    expect(notices).toHaveLength(1);
  });

  it("marks the booking paid when the full amount arrives", async () => {
    const p = await createQpayPayment(booking, "full", "http://localhost");
    markMockInvoicePaid(String(payments()[0].qpay_invoice_id));
    await settleQpayPayment(p.paymentId);
    expect(bookingRow()).toMatchObject({ paid_amount: 10_000_000, status: "paid" });
  });

  it("lets the daily re-check settle a payment whose callback was lost", async () => {
    await createQpayPayment(booking, "deposit", "http://localhost");
    markMockInvoicePaid(String(payments()[0].qpay_invoice_id));
    expect(await recheckPendingQpay()).toBe(1);
    expect(bookingRow().status).toBe("confirmed");
  });

  it("never checks a mock invoice against live QPay", async () => {
    const p = await createQpayPayment(booking, "deposit", "http://localhost");
    markMockInvoicePaid(String(payments()[0].qpay_invoice_id));
    vi.stubEnv("QPAY_MODE", "live");
    vi.stubEnv("QPAY_USERNAME", "u");
    vi.stubEnv("QPAY_PASSWORD", "p");
    vi.stubEnv("QPAY_INVOICE_CODE", "c");
    expect(await settleQpayPayment(p.paymentId)).toBe(false);
    expect(payments()[0].status).toBe("pending");
  });

  it("refuses to open an invoice for a waitlisted booking", async () => {
    await expect(createQpayPayment({ ...booking, status: "waitlist" }, "deposit", "http://localhost")).rejects.toThrow();
  });
});
