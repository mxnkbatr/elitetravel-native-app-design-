// Upserts Danang direct-flight tour (8 days / 7 nights).
//   node scripts/db-add-danang.mjs

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
  img("elitetravel/tours/day4-open-sea-trip"),
  img("elitetravel/tours/day7-resort-pool"),
  img("elitetravel/tours/day5-atlantis-slide"),
  img("elitetravel/tours/nusa-penida-kelingking"),
  img("elitetravel/tours/cretya-ubud"),
];

const tour = {
  id: "danang",
  title: "Дананг шууд нислэгтэй аялал",
  destination: "Дананг, Вьетнам",
  destinationKey: "danang",
  description:
    "Улаанбаатараас Дананг руу шууд нислэгтэй, Vinwonders парк, Bana Hills, Хой Ан эртний хот, массажтай, 3 чөлөөт өдөртэй далайн эргийн амралт.",
  story:
    "Вьетнамын Дананг — шууд нислэгээр 8 өдөр 7 шөнө. Vinwonders усан парк, 67 метрийн цагаан Будда, Гантиг уул, Хой Ан эртний хотын дэнлүүтэй гудамж, Bana Hills, массаж, далайн эргийн 3 чөлөөт өдөр. Wyndham Soleil 5* эсвэл Royal Hotel 4* сонголттой. Хөтөлбөртэй болон чөлөөт багц, дан тийз боломжтой.",
  price: 3990000,
  duration: "8 өдөр · 7 шөнө",
  nights: 7,
  tag: "hot",
  dates:
    "12/12 – 12/19 · 12/19 – 12/26 · 12/26 – 01/02 · 01/02 – 01/09 · 01/09 – 01/16 · 01/16 – 01/23 · 01/23 – 01/30 · 01/30 – 02/06 · 02/06 – 02/13 · 02/13 – 02/20",
  departure: "Улаанбаатар 07:00 → Дананг 12:30 · буцах Дананг 13:30 → УБ 19:00",
  stay: "Wyndham Soleil 5* / Royal Hotel 4*",
  image: img("elitetravel/tours/tropical-aerial-coast"),
  gallery,
  highlights: [
    "УБ ↔ Дананг шууд нислэг",
    "Vinwonders парк",
    "Bana Hills + массаж",
    "Хой Ан эртний хот",
    "3 чөлөөт өдөр · далайн эрэг",
  ],
  includes: [
    "Шууд нислэгийн тийз (Улаанбаатар ↔ Дананг)",
    "4* эсвэл 5* зочид буудал — сонголтоор",
    "Хөтөлбөрт заасан хоол",
    "Аяллын даатгал (зохион байгуулагчийн нөхцлөөр)",
    "Хөтөлбөрийн дагуух автобус",
    "Мэргэжлийн монгол хөтөч, орчуулагч",
    "Хөтөлбөрт заасан үзвэрүүд",
  ],
  excludes: [
    "Хөтөлбөрт ороогүй хоол, үзвэр, үйлчилгээ",
    "Хувийн зардал",
    "Хөтөч, жолоочийн гарын мөнгө",
  ],
  itinerary: [
    {
      day: "1-р өдөр",
      title: "Улаанбаатар → Дананг",
      detail:
        "05:00 цагт Чингис хаан нисэх буудалд ирнэ. 07:00 цагт нисэж 12:30 цагт Данангт газардана. Хилээр орсны дараа буудал руу явна. Оройн хоолтой.",
      flight: "07:00 – 12:30 · УБ → Дананг",
      meals: "Оройн хоол",
      hotel: "Wyndham Soleil 5* / Royal Hotel 4*",
    },
    {
      day: "2-р өдөр",
      title: "Vinwonders парк",
      detail:
        "Усан парк болон энгийн парктай, бүх насныханд тохиромжтой. Өдөржин тэнд байна. Өглөө, өдөр, оройн хоолтой.",
      meals: "Өглөө, өдөр, орой",
      hotel: "Wyndham Soleil 5* / Royal Hotel 4*",
    },
    {
      day: "3-р өдөр",
      title: "Хотын аялал · Хой Ан",
      detail:
        "67 метр өндөр цагаан Будда бурхны хөшөө, Гантиг уул, кокосын ширэнгэн ой, Хой Ан эртний хотод дэнлүүтэй гудамжаар шоппинг хийнэ. Өглөө, өдөр, оройн хоолтой.",
      meals: "Өглөө, өдөр, орой",
      hotel: "Wyndham Soleil 5* / Royal Hotel 4*",
    },
    {
      day: "4-р өдөр",
      title: "Чөлөөт өдөр",
      detail: "Далайн эрэг, бассейн, дэлгүүр хэсэх боломжтой. Өглөөний цайтай.",
      meals: "Өглөөний цай",
      hotel: "Wyndham Soleil 5* / Royal Hotel 4*",
    },
    {
      day: "5-р өдөр",
      title: "Bana Hills · массаж",
      detail: "Bana Hills үзвэр, массажтай өдөр. Өглөө, өдөр, оройн хоолтой.",
      meals: "Өглөө, өдөр, орой",
      hotel: "Wyndham Soleil 5* / Royal Hotel 4*",
    },
    {
      day: "6-р өдөр",
      title: "Чөлөөт өдөр",
      detail: "Тааваараа амарч, далайн эрэг, бассейн, шоппинг. Өглөөний цайтай.",
      meals: "Өглөөний цай",
      hotel: "Wyndham Soleil 5* / Royal Hotel 4*",
    },
    {
      day: "7-р өдөр",
      title: "Чөлөөт өдөр",
      detail: "Далайн эргийн амралт үргэлжилнэ. Өглөөний цайтай.",
      meals: "Өглөөний цай",
      hotel: "Wyndham Soleil 5* / Royal Hotel 4*",
    },
    {
      day: "8-р өдөр",
      title: "Дананг → Улаанбаатар",
      detail:
        "Буудлаа хүлээлгэж өгөөд онгоцны буудал руу явна. 13:30 цагт Данангаас нисэж 19:00 цагт Улаанбаатарт газардана. Өглөөний цайтай.",
      flight: "13:30 – 19:00 · Дананг → УБ",
      meals: "Өглөөний цай",
    },
  ],
  pricing: {
    child:
      "2–11 нас: багцаас хамаарч ₮3'690'000–₮4'690'000 · Нярай 0–1.99: ₮590'000 · Оргил өдөр (12/26, 1/2, 1/9, 1/16, 2/6) нэмэгдэлтэй",
    childSharedBed: 3690000,
    singleSupplement: 992800,
    depositPercent: 30,
  },
  notes: [
    "Үнэ (том хүн 12+ / хүүхэд 2–11 / нярай 0–1.99) — хэвийн өдөр:",
    "· Хөтөлбөртэй 5*: ₮4'990'000 / ₮4'290'000 / ₮590'000",
    "· Хөтөлбөртэй 4*: ₮4'790'000 / ₮3'990'000 / ₮590'000",
    "· Чөлөөт 5*: ₮4'290'000 / ₮3'690'000 / ₮590'000",
    "· Чөлөөт 4*: ₮3'990'000 / ₮3'690'000 / ₮590'000",
    "Оргил өдрүүд (12/26, 1/2, 1/9, 1/16, 2/6): хөтөлбөртэй 5* ₮5'390'000 / ₮4'690'000 · хөтөлбөртэй 4* ₮5'190'000 / ₮4'390'000 · чөлөөт 5* ₮4'690'000 / ₮4'090'000 · чөлөөт 4* ₮4'390'000 / ₮4'090'000",
    "Дан тийз: ₮2'990'000–₮3'390'000",
    "Өрөөнд ганцаараа байрлавал ₮992'800 нэмэгдэнэ",
    "1 том хүн 1 хүүхэдтэй явбал хүүхдийг том хүнээр тооцно",
    "Дэлгэрэнгүй PDF: http://tiny.cc/Danang26-27",
    "Холбоо барих: 9003 1771, 9003 2772",
  ],
  documents: ["passport_scan", "visa_photo"],
};

const { data: last } = await db.from("tours").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
const { data: existing } = await db.from("tours").select("position").eq("id", tour.id).maybeSingle();
const position = existing?.position ?? (last?.position ?? 0) + 1;
const { error } = await db.from("tours").upsert(
  { id: tour.id, position, data: tour, updated_at: new Date().toISOString(), updated_by: "script:danang" },
  { onConflict: "id" },
);
if (error) throw error;
console.log(`saved ${tour.id} → /tours/${tour.id} · from ₮${tour.price.toLocaleString("en-US")}`);
try {
  await import("./revalidate-content.mjs");
} catch {
  console.log("revalidate skipped");
}
console.log("done");
