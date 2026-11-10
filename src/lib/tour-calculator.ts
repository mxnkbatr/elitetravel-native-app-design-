import { formatPrice, type TourCalculatorConfig, type TourSummary } from "@/data/tours";

export type { TourCalculatorConfig };

export type PairChoice = "double" | "twin" | "twoSingles";
export type OddChoice = "single" | "shared";

export type RoomKids = {
  /** Extra bed in this room (max 1). Child pays adult fare. */
  extraBed: boolean;
  /** Children sleeping with parents, no bed (0–2). */
  withParents: number;
};

export type CalculatorState = {
  adults: number;
  children: number;
  pairRooms: { choice: PairChoice; kids: RoomKids }[];
  oddRoom: { choice: OddChoice | null; kids: RoomKids } | null;
};

export type CalculatorQuote = {
  ready: boolean;
  remainingAdults: number;
  remainingChildren: number;
  adultPrice: number;
  childPrice: number;
  childWithBed: number;
  childNoBed: number;
  oddFee: number;
  pairSinglesFee: number;
  total: number;
  deposit: number;
  savings: number;
  saleActive: boolean;
  saleEndsAt: number | null;
  lines: { label: string; amount: number }[];
  /** Mapped onto the legacy booking columns. */
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
  /** Always true per product rule — extra-bed children pay adult fare. */
  childBedFullPrice: true;
};

const emptyKids = (): RoomKids => ({ extraBed: false, withParents: 0 });

export function resolveCalculator(tour: Pick<TourSummary, "price" | "pricing" | "calculator">): ResolvedCalculator {
  const c = tour.calculator ?? {};
  const endsRaw = c.sale?.endsAt ?? tour.pricing?.saleEndsAt;
  const endsAt = endsRaw ? Date.parse(endsRaw) : NaN;
  return {
    enabled: c.enabled === true,
    adultPrice: c.adultPrice ?? tour.price ?? 0,
    childDiscount: c.childDiscount ?? 500_000,
    childBasePrice: c.childBasePrice ?? null,
    childSalePrice: c.childSalePrice ?? null,
    singleSupplement: c.singleSupplement ?? tour.pricing?.singleSupplement ?? 700_000,
    allowChildExtraBed: c.allowChildExtraBed ?? tour.pricing?.childOwnBed !== false,
    depositPercent: c.depositPercent ?? tour.pricing?.depositPercent ?? 0,
    singleAdultChildAsAdult: c.singleAdultChildAsAdult ?? true,
    saleEndsAt: Number.isFinite(endsAt) ? endsAt : null,
    childBedFullPrice: true,
  };
}

export function isSaleActive(settings: Pick<ResolvedCalculator, "saleEndsAt">, now = Date.now()) {
  return settings.saleEndsAt != null && now < settings.saleEndsAt;
}

export function childUnitPrice(settings: ResolvedCalculator, adults: number, children: number, now = Date.now()): number {
  const sale = isSaleActive(settings, now);
  let price: number;
  if (settings.childBasePrice != null) {
    price = sale && settings.childSalePrice != null ? settings.childSalePrice : settings.childBasePrice;
  } else {
    price = Math.max(0, settings.adultPrice - settings.childDiscount);
  }
  if (settings.singleAdultChildAsAdult && adults === 1 && children === 1) {
    price = settings.adultPrice;
  }
  return price;
}

/** Build the default room skeleton from adult count. */
export function buildRooms(adults: number): Pick<CalculatorState, "pairRooms" | "oddRoom"> {
  const a = Math.max(1, Math.min(20, Math.floor(adults)));
  const pairs = Math.floor(a / 2);
  const hasOdd = a % 2 === 1;
  return {
    pairRooms: Array.from({ length: pairs }, () => ({ choice: "double" as PairChoice, kids: emptyKids() })),
    oddRoom: hasOdd ? { choice: null, kids: emptyKids() } : null,
  };
}

export function initialCalculatorState(adults = 2): CalculatorState {
  const a = Math.max(1, Math.min(20, adults));
  return { adults: a, children: 0, ...buildRooms(a) };
}

function roomKidCount(k: RoomKids) {
  return (k.extraBed ? 1 : 0) + k.withParents;
}

function placedChildren(state: CalculatorState) {
  let n = state.pairRooms.reduce((s, r) => s + roomKidCount(r.kids), 0);
  if (state.oddRoom) n += roomKidCount(state.oddRoom.kids);
  return n;
}

/** Drop surplus placed kids when the children counter shrinks — odd room first, then last pair. */
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
  for (let i = next.pairRooms.length - 1; i >= 0 && excess > 0; i--) {
    removeFrom(next.pairRooms[i].kids);
  }
  return next;
}

export function setAdults(state: CalculatorState, adults: number): CalculatorState {
  const a = Math.max(1, Math.min(20, Math.floor(adults)));
  const rooms = buildRooms(a);
  // Preserve choices where room slots still exist
  const pairRooms = rooms.pairRooms.map((slot, i) => ({
    choice: state.pairRooms[i]?.choice ?? slot.choice,
    kids: state.pairRooms[i] ? { ...state.pairRooms[i].kids } : emptyKids(),
  }));
  let oddRoom = rooms.oddRoom;
  if (oddRoom && state.oddRoom) {
    oddRoom = { choice: state.oddRoom.choice, kids: { ...state.oddRoom.kids } };
  }
  return trimChildren({ adults: a, children: state.children, pairRooms, oddRoom });
}

export function setChildren(state: CalculatorState, children: number): CalculatorState {
  const c = Math.max(0, Math.min(20, Math.floor(children)));
  return trimChildren({ ...state, children: c });
}

export function setOddChoice(state: CalculatorState, choice: OddChoice | null): CalculatorState {
  if (!state.oddRoom) return state;
  if (choice == null) {
    return { ...state, oddRoom: { choice: null, kids: emptyKids() } };
  }
  return { ...state, oddRoom: { ...state.oddRoom, choice } };
}

export function calculateTourPrice(tour: Pick<TourSummary, "price" | "pricing" | "calculator">, state: CalculatorState, now = Date.now()): CalculatorQuote {
  const settings = resolveCalculator(tour);
  const saleActive = isSaleActive(settings, now);
  const adultPrice = settings.adultPrice;
  const childPrice = childUnitPrice(settings, state.adults, state.children, now);

  const needsOdd = state.adults % 2 === 1;
  const oddChosen = !needsOdd || (state.oddRoom != null && state.oddRoom.choice != null);
  const remainingAdults = oddChosen ? 0 : 1;

  let childWithBed = 0;
  let childNoBed = 0;
  for (const r of state.pairRooms) {
    if (r.kids.extraBed) childWithBed += 1;
    childNoBed += r.kids.withParents;
  }
  if (state.oddRoom) {
    if (state.oddRoom.kids.extraBed) childWithBed += 1;
    childNoBed += state.oddRoom.kids.withParents;
  }
  const placed = childWithBed + childNoBed;
  const remainingChildren = Math.max(0, state.children - placed);
  const overKids = placed > state.children;

  const ready = remainingAdults === 0 && remainingChildren === 0 && !overKids;

  const twoSingles = state.pairRooms.filter((r) => r.choice === "twoSingles").length;
  const pairSinglesFee = twoSingles * 2 * settings.singleSupplement;
  const oddFee = state.oddRoom?.choice === "single" ? settings.singleSupplement : 0;

  const total = (state.adults + childWithBed) * adultPrice + childNoBed * childPrice + oddFee + pairSinglesFee;
  const deposit = settings.depositPercent ? Math.round((total * settings.depositPercent) / 100) : 0;

  const savingsPerChild =
    settings.childBasePrice != null ? Math.max(0, adultPrice - childPrice) : settings.singleAdultChildAsAdult && state.adults === 1 && state.children === 1 ? 0 : settings.childDiscount;
  const savings = childNoBed * savingsPerChild;

  const lines: CalculatorQuote["lines"] = [];
  if (state.adults) lines.push({ label: `${state.adults} том хүн × ${formatPrice(adultPrice)}`, amount: state.adults * adultPrice });
  if (childWithBed) lines.push({ label: `${childWithBed} хүүхэд, нэмэлт ор × ${formatPrice(adultPrice)}`, amount: childWithBed * adultPrice });
  if (childNoBed) lines.push({ label: `${childNoBed} хүүхэд, оргүй × ${formatPrice(childPrice)}`, amount: childNoBed * childPrice });
  if (pairSinglesFee) lines.push({ label: `Хоёр ганц өрөө × ${twoSingles}`, amount: pairSinglesFee });
  if (oddFee) lines.push({ label: "Ганц өрөөний нэмэгдэл", amount: oddFee });

  const singleRooms = twoSingles * 2 + (state.oddRoom?.choice === "single" ? 1 : 0);

  return {
    ready,
    remainingAdults,
    remainingChildren: overKids ? 0 : remainingChildren,
    adultPrice,
    childPrice,
    childWithBed,
    childNoBed,
    oddFee,
    pairSinglesFee,
    total: ready ? total : total,
    deposit: ready ? deposit : deposit,
    savings: ready ? savings : savings,
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

/** Serialize calculator choices for booking_requests.calculator / emails. */
export function calculatorPayload(state: CalculatorState, quote: CalculatorQuote) {
  return {
    adults: state.adults,
    children: state.children,
    pairRooms: state.pairRooms.map((r) => ({
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
  if (adults == null || adults < 1 || adults > 20) return null;
  const base = initialCalculatorState(adults);
  base.children = Math.max(0, Math.min(20, children));

  const pairs = Array.isArray(o.pairRooms) ? o.pairRooms : Array.isArray(o.rooms) ? o.rooms : [];
  base.pairRooms = base.pairRooms.map((slot, i) => {
    const row = (pairs[i] ?? {}) as Record<string, unknown>;
    const choice = row.choice === "twin" || row.choice === "twoSingles" || row.choice === "double" ? row.choice : slot.choice;
    return {
      choice,
      kids: {
        extraBed: row.extraBed === true || (row.kids as RoomKids | undefined)?.extraBed === true,
        withParents: Math.max(0, Math.min(2, Number(row.withParents ?? (row.kids as RoomKids | undefined)?.withParents ?? 0) || 0)),
      },
    };
  });

  if (base.oddRoom) {
    const odd = (o.oddRoom ?? null) as Record<string, unknown> | null;
    if (odd) {
      const choice = odd.choice === "single" || odd.choice === "shared" ? odd.choice : null;
      base.oddRoom = {
        choice,
        kids: {
          extraBed: odd.extraBed === true || (odd.kids as RoomKids | undefined)?.extraBed === true,
          withParents: Math.max(0, Math.min(2, Number(odd.withParents ?? (odd.kids as RoomKids | undefined)?.withParents ?? 0) || 0)),
        },
      };
    }
  }

  return trimChildren(base);
}
