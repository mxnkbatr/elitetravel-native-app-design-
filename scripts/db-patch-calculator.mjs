/**
 * Enable the room calculator on every priced tour in Supabase.
 * Known IDs get the Lovable defaults; others derive from price + pricing.
 * Usage: node scripts/db-patch-calculator.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const env = Object.fromEntries(
  readFileSync(path.join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^["']|["']$/g, "")]),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Missing SUPABASE URL or SERVICE_ROLE_KEY / SUPABASE_SECRET_KEY");
  process.exit(1);
}

const KNOWN = {
  "weeknd-world-tour": {
    enabled: true,
    adultPrice: 6_290_000,
    childDiscount: 0,
    singleSupplement: 1_200_000,
    allowChildExtraBed: false,
    depositPercent: 50,
    singleAdultChildAsAdult: true,
    sale: { endsAt: "2026-09-15T00:00:00+08:00" },
  },
  "dately-show-hainan": {
    enabled: true,
    adultPrice: 2_990_000,
    childDiscount: 300_000,
    singleSupplement: 700_000,
    allowChildExtraBed: true,
    depositPercent: 30,
    singleAdultChildAsAdult: true,
  },
  hainan: {
    enabled: true,
    adultPrice: 2_690_000,
    childDiscount: 300_000,
    singleSupplement: 700_000,
    allowChildExtraBed: true,
    depositPercent: 30,
    singleAdultChildAsAdult: true,
  },
  "hainan-2": {
    enabled: true,
    adultPrice: 3_290_000,
    childDiscount: 300_000,
    singleSupplement: 700_000,
    allowChildExtraBed: true,
    depositPercent: 30,
    singleAdultChildAsAdult: true,
  },
  "hainan-3": {
    enabled: true,
    adultPrice: 3_290_000,
    childDiscount: 300_000,
    singleSupplement: 700_000,
    allowChildExtraBed: true,
    depositPercent: 30,
    singleAdultChildAsAdult: true,
  },
  "hainan-4": {
    enabled: true,
    adultPrice: 2_990_000,
    childDiscount: 300_000,
    singleSupplement: 700_000,
    allowChildExtraBed: true,
    depositPercent: 30,
    singleAdultChildAsAdult: true,
  },
  bali: {
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
};

function derive(tour) {
  if (KNOWN[tour.id]) return { ...KNOWN[tour.id], ...tour.calculator, enabled: true };
  if (tour.calculator?.enabled === false) return tour.calculator;
  const adultPrice = tour.calculator?.adultPrice ?? tour.price;
  if (adultPrice == null || adultPrice <= 0) return tour.calculator ?? null;
  const childShared = tour.pricing?.childSharedBed;
  const childDiscount =
    childShared != null && childShared < adultPrice ? Math.max(0, adultPrice - childShared) : 300_000;
  return {
    enabled: true,
    adultPrice,
    childDiscount,
    singleSupplement: tour.pricing?.singleSupplement ?? 700_000,
    allowChildExtraBed: tour.pricing?.childOwnBed !== false,
    depositPercent: tour.pricing?.depositPercent ?? 30,
    singleAdultChildAsAdult: true,
    ...(tour.pricing?.saleEndsAt ? { sale: { endsAt: tour.pricing.saleEndsAt } } : {}),
    ...tour.calculator,
    enabled: true,
    adultPrice: tour.calculator?.adultPrice ?? adultPrice,
  };
}

const db = createClient(url, key, { auth: { persistSession: false } });
const { data: rows, error } = await db.from("tours").select("id, data");
if (error) throw error;

let updated = 0;
let skipped = 0;
for (const row of rows ?? []) {
  const tour = row.data ?? { id: row.id };
  tour.id = row.id;
  const calculator = derive(tour);
  if (!calculator?.enabled) {
    console.warn("skip (no price / disabled)", row.id);
    skipped += 1;
    continue;
  }
  const next = { ...tour, calculator };
  const { error: upErr } = await db.from("tours").update({ data: next, updated_at: new Date().toISOString() }).eq("id", row.id);
  if (upErr) throw upErr;
  updated += 1;
  console.log("patched", row.id, "→", calculator.adultPrice);
}
console.log(`done · ${updated} patched · ${skipped} skipped`);
