import type { Tour } from "@/data/tours";
import { calculateTourPrice, initialCalculatorState, setOddChoice, type CalculatorState } from "@/lib/tour-calculator";
import { describe, expect, it } from "vitest";

const hainan2 = {
  id: "hainan-2",
  price: 2_590_000,
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

function doubleWithChild(state: CalculatorState, mode: "withParents" | "extraBed"): CalculatorState {
  return {
    ...state,
    children: 1,
    pairRooms: [{ choice: "double", kids: { extraBed: mode === "extraBed", withParents: mode === "withParents" ? 1 : 0 } }],
    oddRoom: null,
  };
}

describe("calculateTourPrice (hainan-2)", () => {
  it("2 adults + 1 child without bed in a double → ₮9'570'000", () => {
    const state = doubleWithChild(initialCalculatorState(2), "withParents");
    const q = calculateTourPrice(hainan2, state);
    expect(q.ready).toBe(true);
    expect(q.total).toBe(9_570_000);
    expect(q.deposit).toBe(2_871_000);
    expect(q.savings).toBe(300_000);
  });

  it("same party with child on an extra bed → ₮9'870'000", () => {
    const state = doubleWithChild(initialCalculatorState(2), "extraBed");
    const q = calculateTourPrice(hainan2, state);
    expect(q.ready).toBe(true);
    expect(q.total).toBe(9_870_000);
    expect(q.deposit).toBe(2_961_000);
  });

  it("1 adult + 1 child in a single room, child without bed → ₮7'280'000", () => {
    let state = initialCalculatorState(1);
    state = { ...state, children: 1 };
    state = setOddChoice(state, "single");
    state = {
      ...state,
      oddRoom: state.oddRoom ? { ...state.oddRoom, kids: { extraBed: false, withParents: 1 } } : null,
    };
    const q = calculateTourPrice(hainan2, state);
    expect(q.ready).toBe(true);
    expect(q.total).toBe(7_280_000);
  });

  it("hides readiness until the odd room is chosen", () => {
    const state = initialCalculatorState(3);
    expect(calculateTourPrice(hainan2, state).ready).toBe(false);
    expect(calculateTourPrice(hainan2, setOddChoice(state, "shared")).ready).toBe(true);
  });
});
