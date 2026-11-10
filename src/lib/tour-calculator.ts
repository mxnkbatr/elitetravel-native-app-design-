import { formatPrice, type TourCalculatorConfig, type TourSummary } from "@/data/tours";

export type { TourCalculatorConfig };

export type PairChoice = "double" | "twin" | "twoSingles";
export type OddChoice = "single" | "shared" | "withChild";

export type RoomKids = {
  /** Extra bed in this room (max 1). Child pays adult fare. */
  extraBed: boolean;
  /** Children sleeping with parents, no bed (0–2). */
  withParents: number;
};

export type CalculatorState = {
  adults: number;
  children: number;
  /** Full stored pair arrays — not truncated when adults drop (Lovable quirk). */
  pairRooms: { choice: PairChoice | null; kids: RoomKids }[];
  /** May persist when adults become even (Lovable quirk). */
  oddRoom: { choice: OddChoice | null; kids: RoomKids } | null;
  expandedPairs: boolean[];
};

export type CalculatorQuote = {
  /** All travellers placed and every visible room chosen — booking can proceed (incl. 1 adult). */
  ready: boolean;
  /** Completed summary table — requires pairCount > 0 (never for 1 adult). */
  summaryReady: boolean;
  totalRemaining: number;
  remainingAdults: number;
  remainingChildren: number;
  remainingLabel: string;
  adultPrice: number;
  childPrice: number;
  childWithBed: number;
  childNoBed: number;
  oddFee: number;
  pairSinglesFee: number;
  twoSinglesCount: number;
  total: number;
  deposit: number;
  savings: number;
  perChildDiscount: number;
  saleActive: boolean;
  saleEndsAt: number | null;
  lines: { label: string; amount: number }[];
  party: { adults: number; kidsOwnBed: number; kidsSharedBed: number; singleRooms: number };
};

export type ResolvedCalculator = {
  enabled: boolean;
  adultPrice: number;
  childDiscount: number;
  childBasePrice: number | null;
  childSalePrice: number | null;
  singleSupplement: number;
  allowChildExtraBed: boolean;
  depositPercent: number;
  singleAdultChildAsAdult: boolean;
  saleEndsAt: number | null;
  childBedFullPrice: true;
};

export const CHILD_DISCOUNT_DEFAULT = 500_000;
export const SINGLE_SUPPLEMENT_DEFAULT = 700_000;

const emptyKids = (): RoomKids => ({ extraBed: false, withParents: 0 });

export function resolveCalculator(tour: Pick<TourSummary, "price" | "pricing" | "calculator">): ResolvedCalculator {
  const c = tour.calculator ?? {};
  const endsRaw = c.sale?.endsAt ?? tour.pricing?.saleEndsAt;
  const endsAt = endsRaw ? Date.parse(endsRaw) : NaN;
  return {
    enabled: c.enabled === true,
    adultPrice: c.adultPrice ?? tour.price ?? 0,
    childDiscount: c.childDiscount ?? CHILD_DISCOUNT_DEFAULT,
    childBasePrice: c.childBasePrice ?? null,
    childSalePrice: c.childSalePrice ?? null,
    singleSupplement: c.singleSupplement ?? SINGLE_SUPPLEMENT_DEFAULT,
    allowChildExtraBed: c.allowChildExtraBed ?? true,
    depositPercent: c.depositPercent ?? 0,
    singleAdultChildAsAdult: c.singleAdultChildAsAdult ?? true,
    saleEndsAt: Number.isFinite(endsAt) ? endsAt : null,
    childBedFullPrice: true,
  };
}

/** Sale only affects Bali childSalePrice; adult priceValue never flips. */
export function isSaleActive(settings: Pick<ResolvedCalculator, "saleEndsAt">, now = Date.now()) {
  return settings.saleEndsAt != null && now < settings.saleEndsAt;
}

export function childUnitPrice(settings: ResolvedCalculator, adults: number, childrenInput: number, now = Date.now()): number {
  const sale = isSaleActive(settings, now);
  let price: number;
  if (settings.childBasePrice != null) {
    price = sale && settings.childSalePrice != null ? settings.childSalePrice : settings.childBasePrice;
  } else {
    price = Math.max(0, settings.adultPrice - settings.childDiscount);
  }
  if (settings.singleAdultChildAsAdult && adults === 1 && childrenInput === 1) {
    price = settings.adultPrice;
  }
  return price;
}

export function pairCountOf(adults: number) {
  return Math.floor(Math.max(1, adults) / 2);
}

export function hasOddOf(adults: number) {
  return Math.max(1, adults) % 2 === 1;
}

export function logicalRoomsOf(adults: number) {
  const a = Math.max(1, adults);
  return pairCountOf(a) + (hasOddOf(a) ? 1 : 0);
}

export function childrenMaxOf(adults: number) {
  return logicalRoomsOf(adults) * 3;
}

/** Visible pair slots for current adult count (stored array may be longer). */
export function visiblePairs(state: CalculatorState) {
  const n = pairCountOf(state.adults);
  return Array.from({ length: n }, (_, i) => state.pairRooms[i] ?? { choice: null as PairChoice | null, kids: emptyKids() });
}

export function initialCalculatorState(adults = 2): CalculatorState {
  const a = Math.max(1, adults);
  const pairs = pairCountOf(a);
  return {
    adults: a,
    children: 0,
    pairRooms: Array.from({ length: pairs }, () => ({ choice: null, kids: emptyKids() })),
    oddRoom: hasOddOf(a) ? { choice: null, kids: emptyKids() } : null,
    expandedPairs: Array.from({ length: pairs }, () => true),
  };
}

function roomKidCount(k: RoomKids) {
  return (k.extraBed ? 1 : 0) + k.withParents;
}

function placedChildren(state: CalculatorState) {
  const pairs = visiblePairs(state);
  let n = pairs.reduce((s, r) => s + roomKidCount(r.kids), 0);
  // Lovable: odd kids count whenever oddRoom !== null, even if !hasOdd
  if (state.oddRoom?.choice != null) n += roomKidCount(state.oddRoom.kids);
  else if (state.oddRoom != null && state.oddRoom.choice === null) {
    /* unselected odd — kids cleared by effect, but count kids if any */
    n += roomKidCount(state.oddRoom.kids);
  }
  return n;
}

/**
 * Lovable totalAllocated: selected pair = 2 + kids; selected odd = 1 + kids.
 * Odd slot is counted whenever oddRoom !== null (even if adults became even).
 */
export function totalAllocated(state: CalculatorState) {
  let n = visiblePairs(state).reduce((s, r) => s + (r.choice != null ? 2 + roomKidCount(r.kids) : 0), 0);
  if (state.oddRoom?.choice != null) n += 1 + roomKidCount(state.oddRoom.kids);
  return n;
}

/** Trim excess kids: odd no-bed → odd bed → last pair no-bed → last pair bed. */
export function trimChildren(state: CalculatorState): CalculatorState {
  let excess = placedChildren(state) - state.children;
  if (excess <= 0) return state;
  const next: CalculatorState = {
    ...state,
    pairRooms: state.pairRooms.map((r) => ({ ...r, kids: { ...r.kids } })),
    oddRoom: state.oddRoom ? { ...state.oddRoom, kids: { ...state.oddRoom.kids } } : null,
  };

  const removeFrom = (kids: RoomKids) => {
    while (excess > 0 && kids.withParents > 0) {
      kids.withParents -= 1;
      excess -= 1;
    }
    if (excess > 0 && kids.extraBed) {
      kids.extraBed = false;
      excess -= 1;
    }
  };

  if (next.oddRoom) removeFrom(next.oddRoom.kids);
  for (let i = Math.min(next.pairRooms.length, pairCountOf(next.adults)) - 1; i >= 0 && excess > 0; i--) {
    removeFrom(next.pairRooms[i].kids);
  }
  return next;
}

export function setAdults(state: CalculatorState, adults: number): CalculatorState {
  const a = Math.max(1, Math.floor(adults));
  const pairs = pairCountOf(a);
  const pairRooms = [...state.pairRooms];
  while (pairRooms.length < pairs) pairRooms.push({ choice: null, kids: emptyKids() });
  // Do not truncate — hidden slots can reappear (Lovable)

  let expandedPairs = state.expandedPairs.slice(0, pairs);
  while (expandedPairs.length < pairs) expandedPairs.push(true);

  let oddRoom = state.oddRoom;
  if (hasOddOf(a) && !oddRoom) oddRoom = { choice: null, kids: emptyKids() };
  // When even, keep oddRoom in state (Lovable) — oddFee still requires hasOdd

  return trimChildren({ adults: a, children: state.children, pairRooms, oddRoom, expandedPairs });
}

export function setChildren(state: CalculatorState, children: number): CalculatorState {
  const max = childrenMaxOf(state.adults);
  const c = Math.max(0, Math.min(max, Math.floor(children)));
  return trimChildren({ ...state, children: c });
}

export function setOddChoice(state: CalculatorState, choice: OddChoice | null): CalculatorState {
  const odd = state.oddRoom ?? { choice: null, kids: emptyKids() };
  if (choice == null || odd.choice === choice) {
    return { ...state, oddRoom: null };
  }
  return { ...state, oddRoom: { choice, kids: { ...odd.kids } } };
}

/** Toggle: clicking the active choice clears it and its kids. */
export function setPairChoice(state: CalculatorState, index: number, choice: PairChoice): CalculatorState {
  const pairRooms = [...state.pairRooms];
  while (pairRooms.length <= index) pairRooms.push({ choice: null, kids: emptyKids() });
  const cur = pairRooms[index];
  pairRooms[index] = cur.choice === choice ? { choice: null, kids: emptyKids() } : { ...cur, choice };
  return { ...state, pairRooms };
}

export function setPairKids(state: CalculatorState, index: number, kids: RoomKids): CalculatorState {
  const pairRooms = state.pairRooms.map((r, i) => (i === index ? { ...r, kids } : r));
  while (pairRooms.length <= index) pairRooms.push({ choice: null, kids: emptyKids() });
  if (!state.pairRooms[index]) pairRooms[index] = { choice: null, kids };
  return trimChildren({ ...state, pairRooms });
}

export function setOddKids(state: CalculatorState, kids: RoomKids): CalculatorState {
  if (!state.oddRoom) return state;
  return trimChildren({ ...state, oddRoom: { ...state.oddRoom, kids } });
}

export function togglePairExpanded(state: CalculatorState, index: number): CalculatorState {
  const expandedPairs = [...state.expandedPairs];
  while (expandedPairs.length <= index) expandedPairs.push(true);
  expandedPairs[index] = !(expandedPairs[index] ?? true);
  return { ...state, expandedPairs };
}

function remainingLabelMn(remainingAdults: number, remainingChildren: number): string {
  const parts: string[] = [];
  if (remainingAdults === 1) parts.push("1 том хүн");
  else if (remainingAdults > 1) parts.push(`${remainingAdults} том хүн`);
  if (remainingChildren === 1) parts.push("1 хүүхэд");
  else if (remainingChildren > 1) parts.push(`${remainingChildren} хүүхэд`);
  return parts.length ? `${parts.join(" ")} үлдсэн` : "";
}

export function calculateTourPrice(
  tour: Pick<TourSummary, "price" | "pricing" | "calculator">,
  state: CalculatorState,
  now = Date.now(),
): CalculatorQuote {
  const settings = resolveCalculator(tour);
  const saleActive = isSaleActive(settings, now);
  const adultPrice = settings.adultPrice;
  const childPrice = childUnitPrice(settings, state.adults, state.children, now);
  const pairs = visiblePairs(state);
  const pairCount = pairs.length;
  const hasOdd = hasOddOf(state.adults);

  // Extra-bed / no-bed from rooms that have a selection; Lovable also counts
  // odd kids whenever oddRoom !== null (choice selected for bed flags).
  let childWithBed = 0;
  let childNoBed = 0;
  for (const r of pairs) {
    if (r.choice == null) continue;
    if (r.kids.extraBed) childWithBed += 1;
    childNoBed += r.kids.withParents;
  }
  // Lovable: oddExtraBedCount = oddRoom !== null && oddChildBed
  if (state.oddRoom?.choice != null) {
    if (state.oddRoom.kids.extraBed) childWithBed += 1;
    childNoBed += state.oddRoom.kids.withParents;
  }

  const allocated = totalAllocated(state);
  const remaining = Math.max(0, state.adults + state.children - allocated);

  const assignedBaseSlots = pairs.filter((r) => r.choice != null).length * 2 + (state.oddRoom?.choice != null ? 1 : 0);
  const assignedAdults = Math.min(state.adults, assignedBaseSlots);
  const assignedChildrenTotal = allocated - assignedAdults;
  const remainingAdults = Math.max(0, state.adults - assignedAdults);
  const remainingChildren = Math.max(0, state.children - assignedChildrenTotal);

  const twoSinglesCount = pairs.filter((r) => r.choice === "twoSingles").length;
  const pairSinglesFee = twoSinglesCount * 2 * settings.singleSupplement;
  // oddFee requires hasOdd
  const oddFee = hasOdd && state.oddRoom?.choice === "single" ? settings.singleSupplement : 0;

  // Live total: all adults always priced; only allocated children contribute
  const total = (state.adults + childWithBed) * adultPrice + childNoBed * childPrice + oddFee + pairSinglesFee;
  const deposit = settings.depositPercent > 0 ? Math.round((total * settings.depositPercent) / 100) : 0;

  // Savings (summary only): Bali clamps P−C; others use configured D (not 1+1 adjusted)
  const perChildDiscount =
    settings.childBasePrice != null ? Math.max(0, adultPrice - childPrice) : settings.childDiscount;
  const savings = childNoBed * perChildDiscount;

  const roomsSelected = pairs.every((r) => r.choice != null) && (!hasOdd || state.oddRoom?.choice != null);
  const ready = roomsSelected && remaining === 0;
  const summaryReady = pairCount > 0 && ready;

  const lines: CalculatorQuote["lines"] = [];
  if (state.adults) lines.push({ label: `${state.adults} том хүн × ${formatPrice(adultPrice)}`, amount: state.adults * adultPrice });
  if (childWithBed) lines.push({ label: `${childWithBed} хүүхэд /нэмэлт ортой/ × ${formatPrice(adultPrice)}`, amount: childWithBed * adultPrice });
  if (childNoBed) lines.push({ label: `${childNoBed} хүүхэд /нэмэлт оргүй/ × ${formatPrice(childPrice)}`, amount: childNoBed * childPrice });
  if (pairSinglesFee) lines.push({ label: `Тус тусдаа ганц өрөө × ${twoSinglesCount}`, amount: pairSinglesFee });
  if (oddFee) lines.push({ label: "Ганц өрөөний нэмэгдэл", amount: oddFee });

  const singleRooms = twoSinglesCount * 2 + (hasOdd && state.oddRoom?.choice === "single" ? 1 : 0);

  return {
    ready,
    summaryReady,
    totalRemaining: remaining,
    remainingAdults,
    remainingChildren,
    remainingLabel: remainingLabelMn(remainingAdults, remainingChildren),
    adultPrice,
    childPrice,
    childWithBed,
    childNoBed,
    oddFee,
    pairSinglesFee,
    twoSinglesCount,
    total,
    deposit,
    savings,
    perChildDiscount,
    saleActive,
    saleEndsAt: settings.saleEndsAt,
    lines,
    party: {
      adults: state.adults,
      kidsOwnBed: childWithBed,
      kidsSharedBed: childNoBed,
      singleRooms,
    },
  };
}

export function calculatorPayload(state: CalculatorState, quote: CalculatorQuote) {
  const pairs = visiblePairs(state);
  return {
    adults: state.adults,
    children: state.children,
    pairRooms: pairs.map((r) => ({
      choice: r.choice,
      extraBed: r.kids.extraBed,
      withParents: r.kids.withParents,
    })),
    oddRoom: state.oddRoom
      ? { choice: state.oddRoom.choice, extraBed: state.oddRoom.kids.extraBed, withParents: state.oddRoom.kids.withParents }
      : null,
    childWithBed: quote.childWithBed,
    childNoBed: quote.childNoBed,
    singleRooms: quote.party.singleRooms,
    total: quote.total,
    deposit: quote.deposit,
    savings: quote.savings,
  };
}

export function parseCalculatorState(raw: unknown): CalculatorState | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const adults = typeof o.adults === "number" ? o.adults : null;
  const children = typeof o.children === "number" ? o.children : 0;
  if (adults == null || adults < 1) return null;
  const base = initialCalculatorState(adults);
  base.children = Math.max(0, Math.min(childrenMaxOf(adults), children));

  const pairs = Array.isArray(o.pairRooms) ? o.pairRooms : [];
  base.pairRooms = Array.from({ length: Math.max(pairCountOf(adults), pairs.length) }, (_, i) => {
    const row = (pairs[i] ?? {}) as Record<string, unknown>;
    const choice = row.choice === "twin" || row.choice === "twoSingles" || row.choice === "double" ? row.choice : null;
    return {
      choice,
      kids: {
        extraBed: row.extraBed === true,
        withParents: Math.max(0, Math.min(2, Number(row.withParents ?? 0) || 0)),
      },
    };
  });

  const odd = (o.oddRoom ?? null) as Record<string, unknown> | null;
  if (odd || hasOddOf(adults)) {
    const choice =
      odd?.choice === "single" || odd?.choice === "shared" || odd?.choice === "withChild" ? odd.choice : null;
    base.oddRoom = {
      choice,
      kids: {
        extraBed: odd?.extraBed === true,
        withParents: Math.max(0, Math.min(2, Number(odd?.withParents ?? 0) || 0)),
      },
    };
  }

  return trimChildren(base);
}

export function assignedChildrenCount(state: CalculatorState) {
  return placedChildren(state);
}

export function canAddMoreChildren(state: CalculatorState) {
  return assignedChildrenCount(state) < state.children;
}
