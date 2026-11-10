/**
 * Merge calculator configs into live Supabase tour JSON (additive only).
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

const CALCULATORS = {
  "weeknd-world-tour": { enabled: true, adultPrice: 6_290_000, childDiscount: 0, singleSupplement: 1_200_000, allowChildExtraBed: false, depositPercent: 50, singleAdultChildAsAdult: true },
  "dately-show-hainan": { enabled: true, adultPrice: 2_990_000, childDiscount: 300_000, singleSupplement: 700_000, allowChildExtraBed: true, depositPercent: 30, singleAdultChildAsAdult: true },
  hainan: { enabled: true, adultPrice: 2_690_000, childDiscount: 300_000, singleSupplement: 700_000, allowChildExtraBed: true, depositPercent: 30, singleAdultChildAsAdult: true },
  "hainan-2": { enabled: true, adultPrice: 3_290_000, childDiscount: 300_000, singleSupplement: 700_000, allowChildExtraBed: true, depositPercent: 30, singleAdultChildAsAdult: true },
  "hainan-3": { enabled: true, adultPrice: 3_290_000, childDiscount: 300_000, singleSupplement: 700_000, allowChildExtraBed: true, depositPercent: 30, singleAdultChildAsAdult: true },
  "hainan-4": { enabled: true, adultPrice: 2_990_000, childDiscount: 300_000, singleSupplement: 700_000, allowChildExtraBed: true, depositPercent: 30, singleAdultChildAsAdult: true },
  bali: { enabled: true, adultPrice: 5_790_000, childDiscount: 0, childBasePrice: 5_990_000, childSalePrice: 5_490_000, singleSupplement: 1_100_000, allowChildExtraBed: true, depositPercent: 50, singleAdultChildAsAdult: true },
};

const db = createClient(url, key, { auth: { persistSession: false } });
let updated = 0;
for (const [id, calculator] of Object.entries(CALCULATORS)) {
  const { data, error } = await db.from("tours").select("data").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data?.data) {
    console.warn("skip missing", id);
    continue;
  }
  const next = { ...data.data, calculator };
  const { error: upErr } = await db.from("tours").update({ data: next, updated_at: new Date().toISOString() }).eq("id", id);
  if (upErr) throw upErr;
  updated += 1;
  console.log("patched", id);
}
console.log(`done · ${updated} tours`);
