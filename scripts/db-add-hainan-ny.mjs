// Upserts Hainan New Year (connecting flight via Beijing Daxing → Sanya).
//   node scripts/db-add-hainan-ny.mjs

import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = path.resolve(import.meta.dirname, "..");
const env = Object.fromEntries(
  readFileSync(path.join(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) throw new Error("SUPABASE_URL / SUPABASE_SECRET_KEY missing");

const db = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const cloud = env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "ev6fygsf";
const img = (id) => `https://res.cloudinary.com/${cloud}/image/upload/${id}`;

const gallery = [
  img("elitetravel/tours/tropical-aerial-coast"),
  img("elitetravel/tours/day2-baishilin-glass-bridge"),
  img("elitetravel/tours/day4-open-sea-trip"),
  img("elitetravel/tours/day5-atlantis-slide"),
  img("elitetravel/tours/day5-atlantis-splash"),
  img("elitetravel/tours/day7-resort-pool"),
  img("elitetravel/tours/day8-monkey-island"),
];

const tour = {
  id: "hainan-ny",
  title: "Хайнань шинэ жилийн аялал · дамжин нислэг",
  destination: "Хайнань, Хятад",
  destinationKey: "hainan",
  description:
    "Бээжин Daxing-ээр дамжин Санья руу нисэх шинэ жилийн аялал. Шилэн гүүр, задгай далайн аялал, Атлантис усан парк, далайн эрэг дээрх шинэ он угтах хөтөлбөр багтсан.",
  story:
    "Шинэ оноо Саняад угтана — 8 өдөр 7 шөнө, Бээжин Daxing-ээр дамжин нислэгтэй. Байшилин шилэн гүүр, задгай далайн аялал, Атлантис усан парк, далайн эргийн лоунжид Daniel, Bayraa, Очироотой шинэ он угтах хөтөлбөр. Mangrove Tree 4* · Timton Fuhe 5* · Howard Johnson 5* · Crowne Plaza 5* сонголттой. Суудлын тоо хязгаартай — эрт бүртгүүлнэ үү!",
  price: 4290000,
  duration: "8 өдөр · 7 шөнө",
  nights: 7,
  tag: "hot",
  dates: "12/27 – 01/03 · 12/28 – 01/04 · 12/29 – 01/05 · 12/30 – 01/06",
  departure:
    "УБ 17:55 → Бээжин Daxing 20:10 · маргааш 07:00 → Саняа 10:55 · буцах Саняа 11:55 → Бээжин 16:10 · 21:30 → УБ 00:05",
  stay: "Mangrove Tree Resort (King Palm Tower) 4* / Timton Fuhe 5* / Howard Johnson 5* / Crowne Plaza 5*",
  image: img("elitetravel/tours/hainan-overview"),
  gallery,
  highlights: [
    "Дамжин нислэг · Бээжин Daxing",
    "Суудлын тоо хязгаартай",
    "Шинэ оноо угтах шоу",
    "Байшилин шилэн гүүр",
    "Атлантис усан парк",
  ],
  includes: [
    "Дамжин нислэгийн тийз (УБ ↔ Бээжин Daxing ↔ Саняа)",
    "Сонгосон 4–5 одтой буудал",
    "Хөтөлбөрт заасан өглөөний болон оройн хоол",
    "Аяллын даатгал (зохион байгуулагчийн нөхцлөөр)",
    "Хөтөлбөрийн дагуух автобус",
    "Мэргэжлийн монгол хөтөч, орчуулагч",
    "Хөтөлбөрт заасан үзвэрүүд",
    "Шинэ он угтах хөтөлбөр",
  ],
  excludes: [
    "Хөтөлбөрт ороогүй хоол, үзвэр, үйлчилгээ",
    "Хувийн зардал",
    "Хөтөч, жолоочийн гарын мөнгө",
    "Ганцаараа өрөөнд байрлах нэмэгдэл",
  ],
  itinerary: [
    {
      day: "1-р өдөр",
      title: "Улаанбаатар → Бээжин",
      detail:
        "15:00 цагт Чингис хаан нисэх буудалд ирнэ. 17:55 цагт нисэж Бээжин Daxing-д 20:10 цагт газардана. Хөтөч тосч буудалдаа байрлана.",
      flight: "17:55 – 20:10 · УБ → Бээжин Daxing",
      hotel: "Бээжин",
    },
    {
      day: "2-р өдөр",
      title: "Бээжин → Саняа",
      detail:
        "07:00 цагт Бээжин Daxing-ээс нисэж Саняа Phoenix-д 10:55 цагт газардана. Буудал руу хөдөлнө. Үлдсэн өдөр нь буудал болон ойр орчимд чөлөөтэй.",
      flight: "07:00 – 10:55 · Бээжин → Саняа",
      meals: "Өглөөний цай",
    },
    {
      day: "3-р өдөр",
      title: "Байшилиний шилэн гүүр",
      detail:
        "10:00 цагт цуглан Байшилин шилэн гүүр рүү хөдөлнө — уул, хавцлын дээгүүр шилэн шалтай гүүрээр алхана. Оройн хоолны дараа буудалдаа буцна.",
      meals: "Өглөөний цай, оройн хоол",
    },
    {
      day: "4-р өдөр",
      title: "Задгай далайн аялал",
      detail:
        "10:00 цагт сувдны дэлгүүр орно. 12:00 цагаас 3 цагийн задгай далайн аялалд гарна. Оройн буффет хоолтой.",
      meals: "Өглөөний цай, оройн хоол",
    },
    {
      day: "5-р өдөр",
      title: "Шинэ он угтах",
      detail:
        "Өдөр нь чөлөөтэй. 20:00 цагаас далайн эргийн лоунжид шинэ оноо угтана — буффет хоолтой, дуучин Даниел, Байраа шоумэн, хошин урлагийн жүжигчин Очироо оролцоно.",
      meals: "Өглөөний цай, оройн хоол",
      host: "Daniel · Bayraa · Очироо",
    },
    {
      day: "6-р өдөр",
      title: "Чөлөөт өдөр",
      detail: "Далайн эрэг, бассейн, дэлгүүр хэсэх боломжтой.",
      meals: "Өглөөний цай",
    },
    {
      day: "7-р өдөр",
      title: "Атлантис усан парк",
      detail: "Бүтэн өдөр усан паркт өнгөрүүлнэ. Өглөөний цайтай.",
      meals: "Өглөөний цай",
    },
    {
      day: "8-р өдөр",
      title: "Саняа → Бээжин → Улаанбаатар",
      detail:
        "11:55 цагт Саняаас Бээжин рүү нисэж 16:10 цагт газардана. Дамжин нислэг хүлээнэ. 21:30 цагт Бээжингээс нисэж шөнийн 00:05 цагт Улаанбаатарт буна.",
      flight: "11:55 – 16:10 · Саняа → Бээжин · 21:30 – 00:05 · Бээжин → УБ",
    },
  ],
  pricing: {
    child: "2–11 нас: ₮3'990'000 · Нярай 0–1.99 нас: ₮670'000",
    childSharedBed: 3990000,
    depositPercent: 30,
  },
  notes: [
    "Суудлын тоо хязгаартай тул эрт бүртгүүлнэ үү!",
    "Үнэ тогтмол: том хүн ₮4'290'000 · хүүхэд ₮3'990'000 · нярай ₮670'000",
    "Буудал сонголтоор: Mangrove Tree Resort (King Palm Tower) 4* · Timton Fuhe 5* · Howard Johnson 5* · Crowne Plaza 5*",
    "Өрөөнд ганцаараа орох тохиолдолд өрөөний нэмэлт төлнө",
    "Дэлгэрэнгүй PDF: http://tiny.cc/HainanNYdamjin",
    "Холбоо барих: 9003 1771, 9003 2772",
  ],
  documents: ["passport_scan", "visa_photo"],
};

const { data: last } = await db.from("tours").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
const { data: existing } = await db.from("tours").select("position").eq("id", tour.id).maybeSingle();
const position = existing?.position ?? (last?.position ?? 0) + 1;
const { error } = await db.from("tours").upsert(
  { id: tour.id, position, data: tour, updated_at: new Date().toISOString(), updated_by: "script:hainan-ny" },
  { onConflict: "id" },
);
if (error) throw error;
console.log(`saved ${tour.id} → /tours/${tour.id} · ₮${tour.price.toLocaleString("en-US")}`);
try {
  await import("./revalidate-content.mjs");
} catch {
  console.log("revalidate skipped");
}
console.log("done");
