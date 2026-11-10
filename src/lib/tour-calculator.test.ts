import type { Tour } from "@/data/tours";
import { calculateTourPrice, initialCalculatorState, setOddChoice, setPairChoice, type CalculatorState } from "@/lib/tour-calculator";
import { describe, expect, it } from "vitest";

const hainan2 = {
  id: "hainan-2",
  price: 3_290_000,
  calculator: {
    enabled: true,
    adultPrice: 3_290_000,
    childDiscount: 300_000,
    singleSupplement: 700_000,
    allowChildExtraBed: true,
    depositPercent: 30,
    singleAdultChildAsAdult: true,
  },
} as unknown as Tour;

const bali = {
  id: "bali",
  price: 5_790_000,
  calculator: {
    enabled: true,
    adultPrice: 5_790_000,
    childDiscount: 0,
    childBasePrice: 5_990_000,
    childSalePrice: 5_490_000,
    singleSupplement: 1_100_000,
    allowChildExtraBed: true,
    depositPercent: 50,
    singleAdultChildAsAdult: true,
    sale: { endsAt: "2026-09-07T00:00:00+08:00" },
  },
} as unknown as Tour;

function doubleWithChild(mode: "withParents" | "extraBed"): CalculatorState {
  let state = initialCalculatorState(2);
  state = setPairChoice(state, 0, "double");
  return {
    ...state,
    children: 1,
    pairRooms: [{ choice: "double", kids: { extraBed: mode === "extraBed", withParents: mode === "withParents" ? 1 : 0 } }],
    oddRoom: null,
  };
}

describe("calculateTourPrice (complete Lovable parity)", () => {
  it("shows live total before rooms are chosen (2 × P)", () => {
    const state = initialCalculatorState(2);
    const q = calculateTourPrice(hainan2, state);
    expect(state.pairRooms[0].choice).toBeNull();
    expect(q.ready).toBe(false);
    expect(q.summaryReady).toBe(false);
    expect(q.totalRemaining).toBe(2);
    expect(q.total).toBe(6_580_000);
    expect(q.deposit).toBe(1_974_000);
  });

  it("2 adults + 1 child without bed in a double → ₮9'570'000", () => {
    const q = calculateTourPrice(hainan2, doubleWithChild("withParents"));
    expect(q.ready).toBe(true);
    expect(q.summaryReady).toBe(true);
    expect(q.total).toBe(9_570_000);
    expect(q.deposit).toBe(2_871_000);
    expect(q.savings).toBe(300_000);
  });

  it("same party with child on an extra bed → ₮9'870'000", () => {
    const q = calculateTourPrice(hainan2, doubleWithChild("extraBed"));
    expect(q.ready).toBe(true);
    expect(q.total).toBe(9_870_000);
    expect(q.deposit).toBe(2_961_000);
  });

  it("twoSingles adds 2 × S on hainan-2", () => {
    let state = doubleWithChild("withParents");
    state = setPairChoice(state, 0, "twoSingles");
    // setPairChoice toggles off double then we need to set twoSingles — after toggle from doubleWithChild it's already double; calling twoSingles switches
    const q = calculateTourPrice(hainan2, state);
    expect(q.total).toBe(9_570_000 + 1_400_000);
    expect(q.deposit).toBe(3_291_000);
  });

  it("1 adult + 1 child: total ready, no summary", () => {
    let state = initialCalculatorState(1);
    state = { ...state, children: 1 };
    state = setOddChoice(state, "single");
    state = {
      ...state,
      oddRoom: state.oddRoom ? { ...state.oddRoom, kids: { extraBed: false, withParents: 1 } } : null,
    };
    const q = calculateTourPrice(hainan2, state);
    expect(q.ready).toBe(true);
    expect(q.summaryReady).toBe(false);
    expect(q.total).toBe(7_280_000);
  });

  it("Bali expired sale: no-bed child uses base 5'990'000", () => {
    const afterSale = Date.parse("2026-09-07T00:00:00+08:00") + 1;
    const q = calculateTourPrice(bali, doubleWithChild("withParents"), afterSale);
    expect(q.childPrice).toBe(5_990_000);
    expect(q.total).toBe(2 * 5_790_000 + 5_990_000);
    expect(q.deposit).toBe(8_785_000);
  });

  it("Bali extra-bed child is cheaper than no-bed under expired sale", () => {
    const afterSale = Date.parse("2026-09-07T00:00:00+08:00") + 1;
    const q = calculateTourPrice(bali, doubleWithChild("extraBed"), afterSale);
    expect(q.total).toBe(3 * 5_790_000);
    expect(q.deposit).toBe(8_685_000);
  });
});
