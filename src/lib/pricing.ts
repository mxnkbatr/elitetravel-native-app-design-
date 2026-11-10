import { formatPrice, priceForDate, type TourSummary } from "@/data/tours";

export type Party = {
  adults: number;
  kidsOwnBed: number;
  kidsSharedBed: number;
  singleRooms: number;
};

export type Quote = {
  lines: { label: string; amount: number }[];
  total: number;
  deposit: number;
};

/**
 * Legacy party quote (tours without the Lovable room calculator).
 * Uses published `pricing` + optional per-date overrides.
 */
export function quote(tour: TourSummary, party: Party, date?: string | null): Quote {
  const p = tour.pricing ?? {};
  const rates = priceForDate(tour, date);
  const price = rates.price ?? 0;
  const childSharedBed = rates.childSharedBed;
  const kidsOwnBed = p.childOwnBed === false ? 0 : party.kidsOwnBed;
  let kidsSharedBed = childSharedBed ? party.kidsSharedBed : 0;
  const singleRooms = p.singleSupplement ? Math.min(party.singleRooms, party.adults) : 0;

  // Exactly 1 adult + 1 child → child pays adult fare
  const totalKids = kidsOwnBed + kidsSharedBed;
  if (party.adults === 1 && totalKids === 1) {
    kidsSharedBed = 0;
  }
  const kidsAtAdult = party.adults === 1 && totalKids === 1 ? 1 : kidsOwnBed;

  const lines: Quote["lines"] = [{ label: `${party.adults} том хүн × ${formatPrice(price)}`, amount: party.adults * price }];
  if (kidsAtAdult) lines.push({ label: `${kidsAtAdult} хүүхэд × ${formatPrice(price)}`, amount: kidsAtAdult * price });
  if (kidsSharedBed && childSharedBed && !(party.adults === 1 && totalKids === 1))
    lines.push({ label: `${kidsSharedBed} хүүхэд, хамт × ${formatPrice(childSharedBed)}`, amount: kidsSharedBed * childSharedBed });
  if (singleRooms && p.singleSupplement)
    lines.push({ label: `Ганцаараа өрөө × ${singleRooms}`, amount: singleRooms * p.singleSupplement });

  const total = lines.reduce((s, l) => s + l.amount, 0);
  const deposit = p.depositPercent ? Math.round((total * p.depositPercent) / 100) : 0;
  return { lines, total, deposit };
}
