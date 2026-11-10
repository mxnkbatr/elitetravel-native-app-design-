// Upserts Nha Trang (Natrang) direct-flight tour (8 days / 7 nights).
//   node scripts/db-add-nhatrang.mjs

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
  img("elitetravel/tours/day4-open-sea-trip"),
  img("elitetravel/tours/tropical-aerial-coast"),
  img("elitetravel/tours/day7-resort-pool"),
  img("elitetravel/tours/day5-atlantis-splash"),
  img("elitetravel/tours/nusa-penida-kelingking"),
  img("elitetravel/tours/day5-atlantis-slide"),
];

const tour = {
  id: "nhatrang",
  title: "Натранг шууд нислэгтэй аялал",
  destination: "Натранг, Вьетнам",
  destinationKey: "nhatrang",
  description:
    "Улаанбаатараас Натранг руу шууд нислэгтэй. Yangbay хүрхрээ, Vinwonders парк, Hon Mun ба Hon Tam арлын аялал, шавран ванн, 3 чөлөөт өдөр багтсан далайн эргийн амралт.",
  story:
    "Вьетнамын Натранг — Баасан гараг бүр шууд нислэгээр 8 өдөр 7 шөнө. Yangbay хүрхрээ, Vinwonders парк, Hon Mun · Hon Tam арлын аялал, шавран ванн, усан массаж, далайн эргийн 3 чөлөөт өдөр. Regalia Gold 5* эсвэл Diamond Bay 5* сонголттой. Хөтөлбөртэй болон чөлөөт багц, дан тийз боломжтой.",
  price: 3890000,
  duration: "8 өдөр · 7 шөнө",
  nights: 7,
  tag: "hot",
  dates:
    "11/27 – 12/04 · 12/04 – 12/11 · 12/11 – 12/18 · 12/18 – 12/25 · 12/25 – 01/01 · 01/01 – 01/08 · 01/08 – 01/15 · 01/15 – 01/22 · 01/22 – 01/29 · 01/29 – 02/05 · 02/05 – 02/12",
  departure: "Улаанбаатар 12:00 → Натранг 17:00 · буцах Натранг 01:40 → УБ 08:30",
  stay: "Regalia Gold 5* / Diamond Bay 5*",
  image: img("elitetravel/tours/day4-open-sea-trip"),
  gallery,
  highlights: [
    "УБ ↔ Натранг шууд нислэг",
    "Yangbay хүрхрээ",
    "Vinwonders парк",
    "Hon Mun · Hon Tam арал",
    "3 чөлөөт өдөр · далайн эрэг",
  ],
  includes: [
    "Шууд нислэгийн тийз (Улаанбаатар ↔ Натранг)",
    "Сонгосон 5 одтой буудал",
    "Хөтөлбөрт заасан хоол",
    "Аяллын даатгал (зохион байгуулагчийн нөхцлөөр)",
    "Хөтөлбөрийн дагуух автобус",
    "Мэргэжлийн монгол хөтөч, орчуулагч",
    "Хөтөлбөрт заасан үзвэрүүд",
  ],
  excludes: [
    "Хөтөлбөрт ороогүй хоол, үзвэр, үйлчилгээ",
    "Чөлөөт өдрүүдийн өдрийн болон оройн хоол",
    "Хувийн зардал",
    "Хөтөч, жолоочийн гарын мөнгө",
  ],
  itinerary: [
    {
      day: "1-р өдөр",
      title: "Улаанбаатар → Натранг",
      detail:
        "09:00 цагт Чингис хаан нисэх буудалд цуглана. 12:00 цагт нисэж 17:00 цагт Натрангт газардана. Хөтөч тосч аваад буудал руу явна. Оройн хоолтой.",
      flight: "12:00 – 17:00 · УБ → Натранг",
      meals: "Оройн хоол",
      hotel: "Regalia Gold 5* / Diamond Bay 5*",
    },
    {
      day: "2-р өдөр",
      title: "Хотын аялал · Yangbay хүрхрээ",
      detail:
        "Yangbay хүрхрээ үзэж, нутгийн иргэдийн соёлтой танилцана, халуун рашаанд орох боломжтой. Шавран болон эмийн ургамлын ваннд нэмэлт төлбөртэй орж болно. Өглөө, өдөр, оройн хоолтой.",
      meals: "Өглөө, өдөр, орой",
      hotel: "Regalia Gold 5* / Diamond Bay 5*",
    },
    {
      day: "3-р өдөр",
      title: "Vinwonders парк",
      detail:
        "Тоглоомын болон усан парктай Vinwonders. Өдөр нь буффет, орой нь Вьетнам маягийн хоол идэнэ. Өглөө, өдөр, оройн хоолтой.",
      meals: "Өглөө, өдөр, орой",
      hotel: "Regalia Gold 5* / Diamond Bay 5*",
    },
    {
      day: "4-р өдөр",
      title: "Чөлөөт өдөр",
      detail: "Далайн эрэг, бассейнд амарч, дэлгүүр хэсэх боломжтой. Өглөөний цайтай.",
      meals: "Өглөөний цай",
      hotel: "Regalia Gold 5* / Diamond Bay 5*",
    },
    {
      day: "5-р өдөр",
      title: "Арлын аялал · Hon Mun · Hon Tam",
      detail:
        "Hon Mun арал дээр нэмэлт төлбөртэй snorkeling хийж болно. Дараа нь Hon Tam арал дээр шавран ванн, усан массажид орно. Өглөө, өдөр, оройн хоолтой.",
      meals: "Өглөө, өдөр, орой",
      hotel: "Regalia Gold 5* / Diamond Bay 5*",
    },
    {
      day: "6-р өдөр",
      title: "Чөлөөт өдөр",
      detail: "Тааваараа амарч, далайн эрэг, бассейн, шоппинг. Өглөөний цайтай.",
      meals: "Өглөөний цай",
      hotel: "Regalia Gold 5* / Diamond Bay 5*",
    },
    {
      day: "7-р өдөр",
      title: "Чөлөөт өдөр",
      detail: "Далайн эргийн амралт үргэлжилнэ. Өглөөний цайтай.",
      meals: "Өглөөний цай",
      hotel: "Regalia Gold 5* / Diamond Bay 5*",
    },
    {
      day: "8-р өдөр",
      title: "Натранг → Улаанбаатар",
      detail:
        "12:00 цагт өрөөгөө хүлээлгэж өгнө. Үлдсэн хагас өдөр чөлөөтэй. Шөнийн 01:40 цагт хөөрч, 08:30 цагт Улаанбаатарт буна. Өглөөний цайтай.",
      flight: "01:40 – 08:30 · Натранг → УБ",
      meals: "Өглөөний цай",
    },
  ],
  pricing: {
    child:
      "2–11 нас: багцаас хамаарч ₮3'590'000–₮4'590'000 · Нярай 0–1.99: ₮590'000 · Оргил өдөр (12/25, 1/1, 1/8) нэмэгдэлтэй",
    childSharedBed: 3590000,
    singleSupplement: 520000,
    depositPercent: 30,
  },
  notes: [
    "Гарах өдрүүд: Баасан гараг бүр",
    "Үнэ (том хүн 12+ / хүүхэд 2–11 / нярай 0–1.99) — хэвийн өдөр:",
    "· Хөтөлбөртэй Regalia Gold 5*: ₮4'690'000 / ₮4'290'000 / ₮590'000",
    "· Хөтөлбөртэй Diamond Bay 5*: ₮4'690'000-аас / ₮4'090'000-аас / ₮590'000 (хамгийн ихдээ ₮5'690'000)",
    "· Чөлөөт Regalia Gold 5*: ₮3'890'000 / ₮3'590'000 / ₮590'000",
    "· Чөлөөт Diamond Bay 5*: ₮3'990'000-аас / ₮3'590'000-аас / ₮590'000 (хамгийн ихдээ ₮4'790'000)",
    "Оргил өдрүүд (12/25, 1/1, 1/8): хөтөлбөртэй Regalia ₮5'090'000 / ₮4'590'000 · чөлөөт Regalia ₮4'390'000 / ₮3'990'000",
    "Дан тийз: ₮2'990'000–₮3'690'000",
    "Өрөөнд ганцаараа байрлавал Regalia Gold ₮520'000, Diamond Bay ₮820'000 нэмэгдэнэ",
    "1 том хүн 1 хүүхэдтэй явбал хүүхдийг том хүнээр тооцно",
    "Дэлгэрэнгүй PDF: http://tiny.cc/Nhatrang26-27",
    "Холбоо барих: 9003 1771, 9003 2772",
  ],
  documents: ["passport_scan", "visa_photo"],
};

const { data: last } = await db.from("tours").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
const { data: existing } = await db.from("tours").select("position").eq("id", tour.id).maybeSingle();
const position = existing?.position ?? (last?.position ?? 0) + 1;
const { error } = await db.from("tours").upsert(
  { id: tour.id, position, data: tour, updated_at: new Date().toISOString(), updated_by: "script:nhatrang" },
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
