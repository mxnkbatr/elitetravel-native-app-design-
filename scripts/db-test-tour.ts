// Adds (or refreshes) the hidden 10₮ tour staff use to test booking and QPay end to end.
// It is unlisted: open it by link only — /tours/test-10.
//   npx tsx scripts/db-test-tour.ts            create / update
//   npx tsx scripts/db-test-tour.ts --remove   delete it

import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Tour } from "../src/data/tours";

const root = path.resolve(__dirname, "..");
const env = Object.fromEntries(
  readFileSync(path.join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => [m[1], m[2]]),
);
if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY missing in .env.local");
const db = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const ID = "test-10";

async function main() {
  if (process.argv.includes("--remove")) {
    const { error } = await db.from("tours").delete().eq("id", ID);
    if (error) throw error;
    console.log(`removed ${ID}`);
    return;
  }

  const { data: bali } = await db.from("tours").select("data").eq("id", "bali").maybeSingle();
  const image = (bali?.data as Tour | undefined)?.image;
  if (!image) throw new Error("bali tour image not found");

  const tour: Tour = {
    id: ID,
    title: "Туршилтын аялал (10₮)",
    destination: "Туршилт",
    destinationKey: "bali",
    description: "Захиалга, QPay төлбөрийг бодит мөнгөөр шалгах нууц аялал. Зөвхөн холбоосоор нээгдэнэ.",
    story: "Захиалгын бүх алхам, төлбөр, мэдэгдэл зөв ажиллаж буйг шалгахад зориулсан туршилтын аялал. Хүн бүр 10₮, урьдчилгаагүй — бүтэн дүнгээр төлнө.",
    price: 10,
    duration: "1 өдөр",
    nights: 0,
    unlisted: true,
    image,
    gallery: [],
    dates: "Туршилт",
    highlights: ["Захиалгын урсгал", "QPay төлбөр", "Мэдэгдэл"],
    includes: ["Төлбөрийн туршилт"],
    excludes: ["Бодит аялал"],
    itinerary: [{ day: "1-р өдөр", title: "Туршилт", detail: "Захиалга илгээгээд QPay-ээр 10₮ төлж шалгана." }],
    pricing: {},
  };

  const { data: last } = await db.from("tours").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await db
    .from("tours")
    .upsert({ id: ID, position: (last?.position ?? 0) + 1, data: tour, updated_at: new Date().toISOString(), updated_by: "script:test-tour" }, { onConflict: "id" });
  if (error) throw error;
  console.log(`saved ${ID} → /tours/${ID}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
