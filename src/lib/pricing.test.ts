import type { Tour } from "@/data/tours";
import { quote } from "@/lib/pricing";
import { describe, expect, it } from "vitest";

const tour = {
  id: "t",
  title: "T",
  price: 3_000_000,
  pricing: { childSharedBed: 2_000_000, singleSupplement: 500_000, depositPercent: 30 },
} as unknown as Tour;

describe("quote", () => {
  it("charges adults, children and single rooms by the published rules", () => {
    const q = quote(tour, { adults: 2, kidsOwnBed: 1, kidsSharedBed: 1, singleRooms: 1 });
    // 3 × adult price (own-bed child pays adult price) + shared-bed child + one single supplement
    expect(q.total).toBe(3 * 3_000_000 + 2_000_000 + 500_000);
    expect(q.deposit).toBe(Math.round(q.total * 0.3));
  });

  it("ignores options the tour does not offer", () => {
    const plain = { ...tour, pricing: { childOwnBed: false } } as unknown as Tour;
    const q = quote(plain, { adults: 1, kidsOwnBed: 2, kidsSharedBed: 2, singleRooms: 1 });
    expect(q.total).toBe(3_000_000);
    expect(q.deposit).toBe(0);
  });

  it("never gives more single rooms than adults", () => {
    const q = quote(tour, { adults: 1, kidsOwnBed: 0, kidsSharedBed: 0, singleRooms: 5 });
    expect(q.total).toBe(3_000_000 + 500_000);
  });
});
