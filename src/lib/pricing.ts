import { formatPrice, type TourSummary } from "@/data/tours";

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
 * The operator's published pricing rules (tours.ts `pricing`). Used by the booking
 * planner for the live estimate and by the API so a posted total is never trusted.
 */
export function quote(tour: TourSummary, party: Party): Quote {
  const p = tour.pricing ?? {};
  const price = tour.price ?? 0;
  const kidsOwnBed = p.childOwnBed === false ? 0 : party.kidsOwnBed;
  const kidsSharedBed = p.childSharedBed ? party.kidsSharedBed : 0;
  const singleRooms = p.singleSupplement ? Math.min(party.singleRooms, party.adults) : 0;

  const lines: Quote["lines"] = [{ label: `${party.adults} том хүн × ${formatPrice(price)}`, amount: party.adults * price }];
  if (kidsOwnBed) lines.push({ label: `${kidsOwnBed} хүүхэд, тусдаа ор × ${formatPrice(price)}`, amount: kidsOwnBed * price });
  if (kidsSharedBed && p.childSharedBed)
    lines.push({ label: `${kidsSharedBed} хүүхэд, хамт × ${formatPrice(p.childSharedBed)}`, amount: kidsSharedBed * p.childSharedBed });
  if (singleRooms && p.singleSupplement)
    lines.push({ label: `Ганцаараа өрөө × ${singleRooms}`, amount: singleRooms * p.singleSupplement });

  const total = lines.reduce((s, l) => s + l.amount, 0);
  const deposit = p.depositPercent ? Math.round((total * p.depositPercent) / 100) : 0;
  return { lines, total, deposit };
}
