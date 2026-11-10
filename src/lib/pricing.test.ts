import type { Tour } from "@/data/tours";
import { fromPrice, priceForDate } from "@/data/tours";
import { quote } from "@/lib/pricing";
import { describe, expect, it } from "vitest";

const tour = {
  id: "t",
  title: "T",
  price: 3_000_000,
  pricing: { childSharedBed: 2_000_000, singleSupplement: 500_000, depositPercent: 30 },
  dates: "12/12 – 12/19 · 12/26 – 01/02",
  datePrices: {
    "12/26 – 01/02": { price: 3_500_000, childSharedBed: 2_400_000 },
  },
} as unknown as Tour;

describe("quote", () => {
  it("charges adults, children and single rooms by the published rules", () => {
    const q = quote(tour, { adults: 2, kidsOwnBed: 1, kidsSharedBed: 1, singleRooms: 1 });
    // 3 × adult price (own-bed child pays adult price) + shared-bed child + one single supplement
    expect(q.total).toBe(3 * 3_000_000 + 2_000_000 + 500_000);
    expect(q.deposit).toBe(Math.round(q.total * 0.3));
  });

  it("uses the per-date override when a departure is selected", () => {
    const q = quote(tour, { adults: 2, kidsOwnBed: 0, kidsSharedBed: 1, singleRooms: 0 }, "12/26 – 01/02");
    expect(q.total).toBe(2 * 3_500_000 + 2_400_000);
  });

  it("falls back to the base price for dates without an override", () => {
    const q = quote(tour, { adults: 1, kidsOwnBed: 0, kidsSharedBed: 0, singleRooms: 0 }, "12/12 – 12/19");
    expect(q.total).toBe(3_000_000);
  });

  it("ignores options the tour does not offer", () => {
    const plain = { ...tour, pricing: { childOwnBed: false }, datePrices: undefined } as unknown as Tour;
    const q = quote(plain, { adults: 1, kidsOwnBed: 2, kidsSharedBed: 2, singleRooms: 1 });
    expect(q.total).toBe(3_000_000);
    expect(q.deposit).toBe(0);
  });

  it("never gives more single rooms than adults", () => {
    const q = quote(tour, { adults: 1, kidsOwnBed: 0, kidsSharedBed: 0, singleRooms: 5 });
    expect(q.total).toBe(3_000_000 + 500_000);
  });
});

describe("priceForDate / fromPrice", () => {
  it("resolves override fields and the cheapest listing price", () => {
    expect(priceForDate(tour, "12/26 – 01/02").price).toBe(3_500_000);
    expect(priceForDate(tour, "12/12 – 12/19").childSharedBed).toBe(2_000_000);
    expect(fromPrice(tour)).toBe(3_000_000);
  });
});
