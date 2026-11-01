import { firstName, maskPhone, salesSummary, tourDiff, type SalesBooking } from "@/lib/agent";
import { describe, expect, it } from "vitest";

describe("privacy helpers", () => {
  it("keeps only the last four digits of a phone", () => {
    expect(maskPhone("+976 9911 2233")).toBe("****2233");
    expect(maskPhone("12")).toBe("****");
    expect(maskPhone(null)).toBe("****");
  });

  it("keeps only the first name", () => {
    expect(firstName("  Болд Бат-Эрдэнэ ")).toBe("Болд");
  });
});

const b = (over: Partial<SalesBooking>): SalesBooking => ({
  created_at: "2026-10-05T03:00:00Z",
  tour_id: "bali",
  tour_title: "Бали",
  status: "confirmed",
  total: 10_000_000,
  paid_amount: 4_000_000,
  adults: 2,
  kids_own_bed: 0,
  kids_shared_bed: 1,
  ...over,
});

describe("salesSummary", () => {
  const bookings = [
    b({}),
    b({ status: "paid", paid_amount: 10_000_000, tour_id: "hainan", tour_title: "Хайнань", total: 10_000_000 }),
    b({ status: "new", paid_amount: 0 }),
    b({ status: "cancelled", paid_amount: 0 }),
    b({ status: "waitlist", paid_amount: 0 }),
    b({ created_at: "2026-09-20T00:00:00Z" }),
  ];
  const payments = [
    { amount: 4_000_000, paid_at: "2026-10-06T00:00:00Z", method: "qpay" },
    { amount: 10_000_000, paid_at: "2026-10-07T00:00:00Z", method: "pocket" },
    { amount: 4_000_000, paid_at: "2026-09-21T00:00:00Z", method: "qpay" },
  ];

  it("counts requests, conversion, value, cash and receivables inside the period", () => {
    const s = salesSummary(bookings, payments, { from: "2026-10-01", to: "2026-11-01", groupBy: "tour" });
    expect(s.totals).toEqual({
      requests: 5,
      confirmed_bookings: 2,
      conversion_percent: 50, // 2 of 4 decided (waitlist excluded)
      travellers_booked: 6,
      booked_value: 20_000_000,
      collected: 14_000_000,
      receivable: 6_000_000,
      cancelled: 1,
    });
    // Same booked value; Hainan collected more, so it comes first
    expect(s.groups.map((g) => [g.key, g.confirmed, g.booked_value, g.collected])).toEqual([
      ["hainan", 1, 10_000_000, 10_000_000],
      ["bali", 1, 10_000_000, 4_000_000],
    ]);
  });

  it("groups money by payment method and months in order", () => {
    expect(salesSummary(bookings, payments, { groupBy: "method" }).groups.map((g) => [g.key, g.collected])).toEqual([
      ["pocket", 10_000_000],
      ["qpay", 8_000_000],
    ]);
    expect(salesSummary(bookings, payments, { groupBy: "month" }).groups.map((g) => [g.key, g.requests, g.collected])).toEqual([
      ["2026-09", 1, 4_000_000],
      ["2026-10", 5, 14_000_000],
    ]);
  });
});

describe("tourDiff", () => {
  it("lists only changed fields, comparing lists and objects by value", () => {
    const before = { id: "bali", title: "Бали", price: 5_000_000, highlights: ["a", "b"], pricing: { depositPercent: 50 } };
    const after = { ...before, price: 5_500_000, highlights: ["a", "b"], pricing: { depositPercent: 30 } };
    expect(tourDiff(before, after)).toEqual([
      { field: "price", before: 5_000_000, after: 5_500_000 },
      { field: "pricing", before: { depositPercent: 50 }, after: { depositPercent: 30 } },
    ]);
  });

  it("shows every filled field for a new tour", () => {
    expect(tourDiff(null, { id: "tokyo", title: "Токио" }).map((d) => d.field)).toEqual(["id", "title"]);
  });
});
