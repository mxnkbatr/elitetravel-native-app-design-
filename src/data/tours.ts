import { cldImage } from "@/lib/cloudinary";
import type { DocType } from "@/lib/documents";

export type ItineraryDay = {
  day: string;
  title: string;
  detail: string;
  flight?: string;
  meals?: string;
  hotel?: string;
  host?: string;
};

export type Tour = {
  id: string;
  title: string;
  destination: string;
  /** Slug for filters/map grouping — known presets or any custom key admins add */
  destinationKey: string;
  description: string;
  story: string;
  price: number | null;
  oldPrice?: number | null;
  duration: string;
  nights: number | null;
  tag?: "hot" | "soon" | "sale";
  /** Past departures stay reachable by URL but drop out of listings */
  status?: "ended";
  /** Bookable by direct link only (staff test tours): never in listings, search, menus, chat or the sitemap */
  unlisted?: boolean;
  discount?: string;
  image: string;
  gallery: string[];
  dates?: string;
  stay?: string;
  departure?: string;
  highlights: string[];
  includes: string[];
  excludes: string[];
  itinerary: ItineraryDay[];
  pricing?: {
    child?: string;
    /** Per-child price (2–12) when sharing parents' bed; own bed costs the adult price */
    childSharedBed?: number;
    /** False when the operator gives no own-bed child rate */
    childOwnBed?: boolean;
    singleSupplement?: number;
    depositPercent?: number;
  };
  notes?: string[];
  /** Documents travellers upload in the app for this tour */
  documents?: DocType[];
};

/**
 * What cards, menus and search need. Every page carries the whole catalogue, so the long
 * day-by-day text stays out of it and ships only with the tour's own page.
 */
export type TourSummary = Omit<Tour, "itinerary" | "includes" | "excludes" | "notes" | "gallery">;

export function toSummary(t: Tour): TourSummary {
  const { itinerary, includes, excludes, notes, gallery, ...summary } = t;
  void [itinerary, includes, excludes, notes, gallery];
  return summary;
}

export function getTour<T extends TourSummary>(tours: T[], id: string) {
  return tours.find((t) => t.id === id);
}

/** «11/03–11/10 · 11/10–11/17» → one label per departure */
export function tourDates(t: Pick<Tour, "dates">) {
  return (t.dates ?? "").split("·").map((d) => d.trim()).filter(Boolean);
}

export function formatPrice(price: number | null) {
  if (price == null) return "Удахгүй";
  const digits = String(price).replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `₮${digits}`;
}

export function isBookable(t: Pick<Tour, "tag" | "status">) {
  return t.tag !== "soon" && t.status !== "ended";
}

export function relatedTours<T extends TourSummary>(tours: T[], tourId: string, limit = 3) {
  const current = getTour(tours, tourId);
  const pool = tours.filter((t) => t.id !== tourId && t.status !== "ended");
  if (!current) return pool.slice(0, limit);
  const same = pool.filter((t) => t.destinationKey === current.destinationKey);
  const rest = pool.filter((t) => t.destinationKey !== current.destinationKey);
  return [...same, ...rest].slice(0, limit);
}

/** Former elitetravel.mn asset path → its Cloudinary copy (elitetravel/tours/<file name>) */
const asset = (path: string) => cldImage(`elitetravel/tours/${path.split("/").pop()!.replace(/\.\w+$/, "")}`);

/** Admin preset chips + tour filters. Custom keys are allowed beyond this list. */
export const DESTINATION_PRESETS = [
  { key: "hainan", label: "Хайнань" },
  { key: "hongkong", label: "Хонг Конг" },
  { key: "bali", label: "Бали" },
  { key: "egypt", label: "Египет" },
  { key: "soon", label: "Удахгүй / бусад" },
] as const;

export function slugDestinationKey(raw: string) {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

/** Filter chips: core destinations that have live tours, then any custom keys. */
export function tourDestinationFilters(tours: Pick<TourSummary, "destinationKey" | "destination" | "status">[]) {
  const live = tours.filter((t) => t.status !== "ended");
  const counts = new Map<string, number>();
  const labels = new Map<string, string>(DESTINATION_PRESETS.map((p) => [p.key, p.label]));
  for (const t of live) {
    counts.set(t.destinationKey, (counts.get(t.destinationKey) ?? 0) + 1);
    if (!labels.has(t.destinationKey)) labels.set(t.destinationKey, t.destination || t.destinationKey);
  }

  const chips = [{ key: "all", label: "Бүгд" }];
  for (const key of ["hainan", "hongkong", "bali"] as const) {
    if ((counts.get(key) ?? 0) > 0) chips.push({ key, label: labels.get(key) ?? key });
  }
  for (const [key, label] of labels) {
    if (key === "soon" || chips.some((c) => c.key === key)) continue;
    if ((counts.get(key) ?? 0) > 0) chips.push({ key, label });
  }
  if ((counts.get("soon") ?? 0) > 0) chips.push({ key: "soon", label: "Удахгүй" });
  return chips;
}

/** Synced from elitetravel.mn — 2026-10-27 */
export const destinations = [
  {
    key: "hainan",
    name: "Хайнань",
    en: "Hainan",
    blurb: "Саняагийн далай, Атлантис усан парк, тогтмол огноотой аялал",
    image: asset("8ce9b508-74d0-44a0-89ed-cf34d352091e/hainan-overview.png"),
  },
  {
    key: "hongkong",
    name: "Хонг Конг",
    en: "Hong Kong",
    blurb: "Викториа оргил, гэрэлт хот, The Weeknd тоглолт",
    image: asset("c38f5ae9-77ea-46f7-bed4-345fc9952db6/weeknd-hongkong.png"),
  },
  {
    key: "bali",
    name: "Бали",
    en: "Bali",
    blurb: "Нуса Пенида, Убуд, Диваажингийн хаалга — хүссэн үедээ",
    image: asset("5c891b94-99c0-43e5-ba48-5bd368e46bfb/bali-island.png"),
  },
  {
    key: "egypt",
    name: "Египет",
    en: "Egypt",
    blurb: "Удахгүй — SHAKIRA үзвэртэй аялал",
    image: asset("847e6995-61b5-4cbc-b64b-cee410b3a47d/shakira-egypt.png"),
  },
] as const;

/* ── Shared Hainan program (hainan, hainan-2, hainan-3, hainan-4) ── */

const HAINAN_FLIGHT_OUT = "22:10 – 03:10 · Чингис хаан ОУНБ → Мейлан ОУНБ";
const HAINAN_FLIGHT_BACK = "04:10 – 09:10 · Мейлан ОУНБ → Чингис хаан ОУНБ";
const SANYA_HOTEL = "Timton Fuhe Hotel";

const freeDay = (day: string): ItineraryDay => ({
  day,
  title: "Чөлөөт өдөр",
  detail:
    "Тааваараа амарч, далайн эрэгт биеэ шаран, бассейнд цагийг хөгжилтэй өнгөрүүлэх эсвэл шоппинг хийх зэргээр бүтэн өдрийг хүссэнээрээ өнгөрүүлнэ.",
  meals: "Өглөө",
  hotel: SANYA_HOTEL,
});

const hainanDay1: ItineraryDay = {
  day: "1-р өдөр",
  title: "Улаанбаатар → Хайкоу шууд нислэг",
  detail:
    "Чингис хаан ОУНБ-аас орой 22:10 цагт нисэх тул 19:00 гэхэд ирсэн байна. Хайкоу хотод шөнийн 03:10 цагт газардаж, хилээр орсны дараа аяллын автобусаар буудал руу хөдөлнө.",
  flight: HAINAN_FLIGHT_OUT,
  hotel: "Hampton Hotel, Хайкоу",
};

const hainanProgram: ItineraryDay[] = [
  hainanDay1,
  {
    day: "2-р өдөр",
    title: "Хайкоу → Саняа · Байшилин шилэн гүүр",
    detail:
      "Өглөөний цайны дараа 12:00 цагт буудлаа хүлээлгэн өгч Саняа руу хөдөлнө. Замдаа уул, хавцлын дээгүүр байрлах Байшилин шилэн гүүрээр алхаж, доорх гүн хавцал, ногоон ойг шууд харна. Саняад оройн хоол идээд буудалдаа амарна.",
    meals: "Өглөө, орой",
    hotel: SANYA_HOTEL,
  },
  freeDay("3-р өдөр"),
  {
    day: "4-р өдөр",
    title: "Задгай далайн аялал",
    detail:
      "10:00 цагт сувдны дэлгүүр орж, 12:00 цагт 3 цагийн задгай далайн аялалд гарна. Далай дээр олон төрлийн экстрем тоглоомоор хөгжилдөнө. Оройн буфет хоолны дараа буудалдаа буцна.",
    meals: "Өглөө, орой",
    hotel: SANYA_HOTEL,
  },
  {
    day: "5-р өдөр",
    title: "Атлантис усан парк",
    detail:
      "Азид хоёрт ордог том усан парк — Атлантист бүтэн өдрийг өнгөрүүлнэ. Бүх насныханд зориулсан олон төрлийн усан тоглоомтой. Оройн хоолны дараа буудалдаа буцна.",
    meals: "Өглөө, орой",
    hotel: SANYA_HOTEL,
  },
  freeDay("6-р өдөр"),
  freeDay("7-р өдөр"),
  {
    day: "8-р өдөр",
    title: "Саняа → Хайкоу → Улаанбаатар · Сармагчингийн арал",
    detail:
      "12:00 цагт буудлаа хүлээлгэн өгч Хайкоу руу хөдөлнө. Замдаа хэдэн мянган сармагчин чөлөөтэй амьдардаг Nanwan Monkey Island-д зочилно. Хайкоуд оройн хоол, шоппинг хийсний дараа нисэх буудалд бүртгүүлж, өглөөний 09:10 цагт Улаанбаатарт газардана.",
    flight: HAINAN_FLIGHT_BACK,
    meals: "Өглөө, орой",
  },
];

const hainanIncludes = [
  "Улаанбаатар ↔ Хайнань нислэгийн тийз",
  "Зочид буудал",
  "Хөтөлбөрт тусгасан хоол",
  "Хөтөлбөрт заасан үзвэрүүдийн тийз",
  "Монгол хөтөч",
  "Аяллын даатгал",
];

const hainanExcludes = ["Хөтөлбөрт тусгагдаагүй хоол", "Хувийн зардал, шоппинг"];

const hainanHighlights = ["Байшилин шилэн гүүр", "Задгай далайн аялал", "Атлантис усан парк", "Сармагчингийн арал"];

const hainanStay = "Timton Fuhe Hotel, Саняа";

const hainanChildNote =
  "12 хүртэлх насны хүүхэд эцэг эхтэйгээ нэг оронд (нэмэлт оргүй) унтвал ₮300'000 хямдралтай, тусдаа нэмэлт ортой бол насанд хүрсэн хүнтэй ижил үнээр аялна.";

const hainanGallery = [
  asset("fdd22cd7-b160-4283-ad8d-4c1b480f02fe/tropical-aerial-coast.webp"),
  asset("7b5ed1a8-babf-40dd-96da-6f5d03decabb/day2-baishilin-glass-bridge.webp"),
  asset("2d8aedf6-198b-4f9c-89d9-dc103f74791c/day4-open-sea-trip.jpg"),
  asset("6e554dbe-0cc5-4764-b3ee-5c034d6f238d/day5-atlantis-slide.webp"),
  asset("1fdc184f-1bde-4948-a6d5-bf486234f33c/day5-atlantis-splash.webp"),
  asset("03b74806-5cfa-4635-b054-4429502b220a/day7-resort-pool.webp"),
  asset("0e82da58-a1d0-4b0c-8fd7-21543fa8c2ad/day8-monkey-island.jpg"),
];

const hainanBase = {
  destination: "Хайнань",
  destinationKey: "hainan" as const,
  duration: "8 өдөр · 7 шөнө",
  nights: 7,
  stay: hainanStay,
  departure: "Улаанбаатар",
  gallery: hainanGallery,
  highlights: hainanHighlights,
  includes: hainanIncludes,
  excludes: hainanExcludes,
  itinerary: hainanProgram,
  notes: [hainanChildNote],
};

/** Initial catalogue; seeded into the `tours` table, which is the live source (edit in /admin). */
export const seedTours: Tour[] = [
  {
    id: "weeknd-world-tour",
    title: "The Weeknd: Hong Kong аялал",
    destination: "Хонг Конг",
    destinationKey: "hongkong",
    description: "Тусгай аялал",
    story:
      "The Weeknd-ийн тоглолт болон Хонг Конг хотын аялал нэг дор. Тоглолт болох газраас ердөө 600 метрт байрлах буудалд байрлаж, Викториа оргил, Оддын гудамж, Монстер барилгаар аялна.",
    price: 6290000,
    oldPrice: 6590000,
    duration: "5 өдөр · 4 шөнө",
    nights: 4,
    tag: "hot",
    discount: "-10%",
    dates: "10/28 – 11/01",
    stay: "Harbour Plaza & Degrees",
    departure: "Улаанбаатар",
    image: asset("c38f5ae9-77ea-46f7-bed4-345fc9952db6/weeknd-hongkong.png"),
    gallery: [
      asset("e8c21d55-430a-4efc-bacb-debcb816eb6f/hongkong-skyline.jpg"),
      asset("2e169e9d-ca05-4b94-91a5-498b017b7ad8/victoria-peak.jpg"),
      asset("5ca5dad3-7b36-4d29-9388-268f9f0d500c/monster-building.jpg"),
      asset("3a37852a-f726-4df9-bac7-b599b8de51c1/weeknd-stage.jpg"),
    ],
    highlights: [
      "The Weeknd тоглолтын тасалбар",
      "Тоглолтын газраас 600 м буудал",
      "Викториа оргил · Оддын гудамж",
      "Викториа булангаар завиар нар жаргалт",
    ],
    includes: [
      "Улаанбаатар ↔ Хонг Конг нислэгийн тийз",
      "Зочид буудал",
      "The Weeknd тоглолтын тасалбар",
      "Өглөөний цай",
      "Хөтөч, орчуулагч",
      "Аяллын даатгал",
    ],
    excludes: ["Өдөр, оройн хоол", "Хувийн зардал, шоппинг", "Чөлөөт өдрийн нэмэлт хөтөлбөрүүд"],
    itinerary: [
      {
        day: "10/28 · 1-р өдөр",
        title: "Улаанбаатар → Хонг Конг",
        detail: "Өглөөний 06:45 цагт Улаанбаатараас хөөрч, 11:25 цагт Хонг Конгт газардана. Буудалдаа очиж амарна.",
        flight: "06:45 – 11:25",
        hotel: "Harbour Plaza & Degrees",
      },
      {
        day: "10/29 · 2-р өдөр",
        title: "Хонг Конг хотын аялал",
        detail:
          "Далайн түвшнээс 396 м өндөрт орших Викториа оргилоос Викториа булан, тэнгэр баганадсан барилгууд, Коулун хойгийг нэг дор харна. Өдрийн хоолны дараа Брюс Лигийн хүрэл хөшөөтэй Оддын гудамжаар (Avenue of Stars) алхаж, орой нь Викториа булангаар завиар нар жаргахыг үзнэ.",
        meals: "Өглөөний цай",
        hotel: "Harbour Plaza & Degrees",
      },
      {
        day: "10/30 · 3-р өдөр",
        title: "Чөлөөт өдөр",
        detail:
          "Шоппинг хийх, эсвэл Transformers: Age of Extinction болон Ghost in the Shell кинонд гарсан алдарт Монстер барилгын цогцолборыг үзэх боломжтой.",
        meals: "Өглөөний цай",
        hotel: "Harbour Plaza & Degrees",
      },
      {
        day: "10/31 · 4-р өдөр",
        title: "The Weeknd тоглолт",
        detail:
          "Өдөр нь тоглолтдоо бэлдэж, Хонг Конгийн Halloween-ийг сонирхоно. Тоглолт эхлэхээс 2 цагийн өмнө цугларч стадион руу орно. Хүсэн хүлээсэн тоглолтын дараа буудалдаа буцна, эсвэл үдшийг чөлөөтэй үргэлжлүүлнэ.",
        meals: "Өглөөний цай",
        hotel: "Harbour Plaza & Degrees",
      },
      {
        day: "11/01 · 5-р өдөр",
        title: "Хонг Конг → Улаанбаатар",
        detail: "Өглөөний цайны дараа өрөөгөө хүлээлгэн өгч нисэх буудал руу хөдөлнө. 12:25 цагт хөөрч, 17:05 цагт Улаанбаатарт газардана.",
        flight: "12:25 – 17:05",
        meals: "Өглөөний цай",
      },
    ],
    pricing: {
      child: "2–12 нас: нэмэлт ортой болон хамт унтвал ч том хүнтэй ижил үнэ",
      childSharedBed: 6290000,
      singleSupplement: 1200000,
      depositPercent: 50,
    },
  },
  {
    id: "dately-show-hainan",
    title: "Dately Show: Hainan Escape",
    destination: "Хайнань",
    destinationKey: "hainan",
    description: "Тусгай хөтөлбөртэй аялал — ганцхан удаа",
    story:
      "Залуусад зориулсан тусгай хөтөлбөртэй Хайнань аялал: танилцах үдэшлэг, далайн эргийн Dately Show, дарвуулт завин дээрх Yacht Party, Comedy Show болон Атлантис усан парк.",
    price: 2990000,
    duration: "8 өдөр · 7 шөнө",
    nights: 7,
    tag: "hot",
    dates: "Тусгай аялал — огноог лавлана уу",
    stay: hainanStay,
    departure: "Улаанбаатар",
    image: asset("378c2bed-1ce8-486a-a59d-1c97c2546511/dately-show-hainan.png"),
    gallery: [
      asset("fdd22cd7-b160-4283-ad8d-4c1b480f02fe/tropical-aerial-coast.webp"),
      asset("64d6e690-d5aa-45e9-8980-a3101fc32989/dately-show-day3.jpg"),
      asset("6d4ac404-a8d5-4e1a-92a0-b049bb301580/yacht-party-day4.jpg"),
      asset("b2caeed7-806e-4fa9-88d9-caa4b6bdd763/comedy-show-day5.webp"),
      asset("827743b0-3171-4c3e-8935-8bce511193ee/atlantis-waterpark.webp"),
    ],
    highlights: ["Dately Blindfold Show", "Yacht Party · DJ Maexst", "Comedy Show", "Атлантис усан парк"],
    includes: [
      "Улаанбаатар ↔ Хайнань нислэгийн тийз",
      "Зочид буудал, хөтөлбөрт заасан хоол",
      "Dately Blindfold Show-ны бүртгэл, оролцоо",
      "Yacht Party, Comedy Show, усан парк",
      "Монгол хөтөч, зохион байгуулагч",
      "Аяллын даатгал",
    ],
    excludes: ["Хувийн зардал, шоппинг", "Хөтөлбөрт заагаагүй хоол, үзвэрүүд"],
    itinerary: [
      hainanDay1,
      {
        day: "2-р өдөр",
        title: "Хайкоу → Саняа · Танилцах үдэшлэг",
        detail:
          "12:00 цагт буудлаа хүлээлгэн өгч халуун орны Саняа хотыг зорино. Буудалдаа байрлаж амарсны дараа оройн хоол, “Танилцах цаг” болно — хамт аялж буй залуустай ойр дотно танилцаж, шинэ найз нөхөдтэй болно.",
        meals: "Өглөө, орой",
        hotel: SANYA_HOTEL,
        host: "Turuu & Zaya",
      },
      {
        day: "3-р өдөр",
        title: "Dately Show",
        detail:
          "Өдөр нь далайн эрэг дээр амрах, усанд сэлэх, хоттой танилцах чөлөөт цагтай. Орой 18:00–22:00 цагт далайн эргийн Lounge-д “Dately Show” тусгай арга хэмжээ болно.",
        meals: "Өглөө",
        hotel: SANYA_HOTEL,
        host: "Turuu & Zaya",
      },
      {
        day: "4-р өдөр",
        title: "Yacht Party",
        detail:
          "Үдээс хойш дарвуулт завиар Саняагийн задгай тэнгист гарч, нар жаргах үеэр хөгжим, бүжиг, тоглоом, зураг авалттай Yacht Party-д оролцоно.",
        meals: "Өглөө",
        hotel: SANYA_HOTEL,
        host: "Bayraa Showman · DJ Maexst",
      },
      {
        day: "5-р өдөр",
        title: "Comedy Show",
        detail:
          "Өдөр нь чөлөөтэй. Орой аяллын багаараа цугларч, өрсөлдөх бус хамтдаа инээлдэж, дурсамж бүтээх Comedy Show-д оролцоно.",
        meals: "Өглөө",
        hotel: SANYA_HOTEL,
        host: "Баяраа, Тэмүүлэн, Даби, Төрөө, Заяа, Мөнхжин",
      },
      freeDay("6-р өдөр"),
      {
        day: "7-р өдөр",
        title: "Атлантис усан парк",
        detail: "Азид хоёрт ордог том усан парк — Атлантист бүтэн өдрийг өнгөрүүлж, оройн хоолны дараа буудалдаа буцна.",
        meals: "Өглөө, орой",
        hotel: SANYA_HOTEL,
        host: "Bayraa Showman",
      },
      {
        day: "8-р өдөр",
        title: "Саняа → Хайкоу → Улаанбаатар",
        detail:
          "12:00 цагт буудлаа хүлээлгэн өгч Хайкоу руу хөдөлнө. Өдрийн хоол, шоппинг хийсний дараа нисэх буудалд бүртгүүлж, өглөөний 09:10 цагт Улаанбаатарт газардана.",
        flight: HAINAN_FLIGHT_BACK,
        meals: "Өглөө, өдөр",
        host: "Bayraa Showman",
      },
    ],
    pricing: {
      child: "2–12 нас: хамт унтвал ₮2'690'000, нэмэлт ортой бол том хүнтэй ижил",
      childSharedBed: 2690000,
      singleSupplement: 700000,
      depositPercent: 30,
    },
    notes: [
      hainanChildNote,
      "Арга хэмжээний үеэр согтууруулах ундааг хариуцлагатай хэрэглэж, бусад аялагчдын тав тух, аюулгүй байдлыг хүндэтгэнэ үү.",
    ],
  },
  {
    ...hainanBase,
    id: "hainan-3",
    title: "Хайнань үндсэн аялал",
    description: "Үндсэн хөтөлбөртэй аялал",
    story:
      "Хайнань арлын шилдэг үзвэрүүд — Байшилин шилэн гүүр, задгай далайн аялал, Атлантис усан парк, Сармагчингийн арал — болон Саняагийн далайн эрэг дээрх чөлөөт өдрүүд.",
    price: 3290000,
    dates: "11/03 – 11/10",
    image: asset("269c7c28-b5a3-46ae-b9ee-4b239417cbfa/hainan-main-sep15.png"),
    pricing: { child: "2–12 нас: хамт унтвал ₮300'000 хямд", childSharedBed: 2990000, singleSupplement: 700000, depositPercent: 30 },
  },
  {
    ...hainanBase,
    id: "hainan-4",
    title: "Хайнань үндсэн аялал 11/10",
    description: "Үндсэн хөтөлбөртэй аялал",
    story:
      "11-р сарын Хайнань аялал — шилэн гүүр, задгай далай, Атлантис усан парк, Сармагчингийн арал, Саняагийн далайн эрэг дээрх чөлөөт өдрүүд.",
    price: 2990000,
    dates: "11/10 – 11/17",
    image: asset("269c7c28-b5a3-46ae-b9ee-4b239417cbfa/hainan-main-sep15.png"),
    pricing: { child: "2–12 нас: хамт унтвал ₮300'000 хямд", childSharedBed: 2690000, singleSupplement: 700000, depositPercent: 30 },
  },
  {
    id: "bali",
    title: "Бали, Индонез",
    destination: "Бали",
    destinationKey: "bali",
    description: "Үндсэн хөтөлбөртэй аялал — хүссэн үедээ",
    story:
      "Балигийн хүрхрээ, ширэнгэн ой, сүм хийд, Нуса Пенида арлын оюу өнгөт далай. ATV, Bali Swing, pool club-ууд болон скутертэй чөлөөт өдрүүд. Огноогоо өөрөө сонгоно.",
    price: 5790000,
    oldPrice: 6290000,
    duration: "9 өдөр · 8 шөнө",
    nights: 8,
    tag: "sale",
    discount: "-8%",
    dates: "Хүссэн үедээ",
    stay: "Bing Tang Bali Resort",
    departure: "Улаанбаатар",
    image: asset("5c891b94-99c0-43e5-ba48-5bd368e46bfb/bali-island.png"),
    gallery: [
      asset("bda988b8-e92b-4bae-b69d-06439c461d63/nusa-penida-kelingking.jpeg"),
      asset("94f4e234-ba23-4955-90a4-a2805d3b64dc/lempuyang-temple.jpeg"),
      asset("acfd3918-56d6-4f92-a1bc-cd009716585e/bali-swing.jpeg"),
      asset("d5ea132a-e522-4b8b-b655-9041ae09d3e1/cretya-ubud.jpeg"),
      asset("663aa649-a1ea-463c-a87a-7cee5dc6ae8f/tirta-gangga.jpeg"),
      asset("917fb7fd-616a-4765-bf2c-3ed32c051a43/uluwatu-surf-temple.jpeg"),
    ],
    highlights: ["Нуса Пенида · Kelingking", "Lempuyang Heaven Gate", "Bali Swing · Cretya Ubud", "ATV · Tegenungan хүрхрээ"],
    includes: [
      "Улаанбаатар ↔ Денпасар нислэгийн тийз",
      "Вилла / зочид буудал",
      "Өглөөний цай, хөтөлбөрт багтсан хоол",
      "Убуд, Нуса Пенида, сүмүүдийн тийз, тээвэр",
      "Нутгийн англи хэлтэй хөтөч",
      "Аяллын даатгал",
    ],
    excludes: ["Хөтөлбөрт багтаагүй хоол", "Хувийн зардал, spa, surf сургалт", "Индонезын визийн хөлс (шаардлагатай бол)"],
    itinerary: [
      { day: "1-р өдөр", title: "Дамжин нислэг", detail: "Улаанбаатараас дамжин нислэгээр Бали арал руу ниснэ.", hotel: "Bing Tang Bali Resort" },
      {
        day: "2-р өдөр",
        title: "Kanto Lampo хүрхрээ · Bali Swing · Cretya Ubud",
        detail:
          "Шаталсан хадан дээгүүр урсах Kanto Lampo хүрхрээ, ширэнгэн ойг харсан аварга савлуур Bali Swing, үдээс хойш будааны дэнжийг харсан олон шатлалт усан сантай Cretya Ubud Pool & Day Club.",
        meals: "Өглөө, өдөр",
        hotel: "Bing Tang Bali Resort",
      },
      {
        day: "3-р өдөр",
        title: "ATV · Tegenungan хүрхрээ · Pool Club",
        detail:
          "Мэргэжлийн зааварлагчтай ATV-гээр ширэнгэн ой, шаварлаг замаар адал явдалт аялал. Дараа нь Tegenungan хүрхрээ болон хүрхрээг харсан pool club-д амарна.",
        meals: "Өглөө, өдөр",
        hotel: "Bing Tang Bali Resort",
      },
      {
        day: "4-р өдөр",
        title: "Чөлөөт өдөр",
        detail: "Скутер түрээслэн Балигийн ногоон замаар аялах, далайн эрэгт амрах, серф хийх эсвэл нэмэлт аялалд хамрагдах боломжтой.",
        meals: "Өглөө",
        hotel: "Bing Tang Bali Resort",
      },
      {
        day: "5-р өдөр",
        title: "Lempuyang Heaven Gate · Tirta Gangga",
        detail:
          "1,200 м өндөрт орших “Диваажингийн хаалга”-аас Агунг галт уулын үзэмжтэй зураг авна. Дараа нь 1948 онд баригдсан Tirta Gangga усан ордны чулуун гишгүүр, усан оргилуураар аялна.",
        meals: "Өглөө, өдөр",
        hotel: "Bing Tang Bali Resort",
      },
      {
        day: "6-р өдөр",
        title: "Нуса Пенида арал",
        detail:
          "Хурдны завиар Нуса Пенида арал руу аялж, Kelingking Beach, Broken Beach, Angel's Billabong зэрэг дэлхийд алдартай газруудаар хөтөчтэй зочилно.",
        meals: "Өглөө, өдөр",
        hotel: "Bing Tang Bali Resort",
      },
      {
        day: "7-р өдөр",
        title: "Чөлөөт өдөр · Uluwatu сүм",
        detail: "Өдөр нь чөлөөтэй. Үд дунд өмнөд эргийн хадан цохио дээрх Uluwatu сүмд очиж, нар жаргах үзэмжийг харна.",
        meals: "Өглөө",
        hotel: "Bing Tang Bali Resort",
      },
      {
        day: "8–9-р өдөр",
        title: "Чөлөөт өдөр · Буцах нислэг",
        detail: "Далайн эрэг, дэлгүүр, кафегаар зочилж бэлэг дурсгал авна. Нислэгийн цагийн дагуу Денпасарын нисэх буудлаас Улаанбаатар руу буцна.",
        hotel: "Bing Tang Bali Resort",
      },
    ],
    pricing: {
      child: "2–12 нас: ₮5'490'000 (ор эзлэхгүй тохиолдолд)",
      childSharedBed: 5490000,
      childOwnBed: false,
      singleSupplement: 1100000,
      depositPercent: 50,
    },
  },
  {
    ...hainanBase,
    id: "hainan-2",
    title: "Хайнань 9-р сарын сүүлийн аялал",
    description: "Үндсэн хөтөлбөртэй аялал",
    story: "09/29 – 10/06 огноотой Хайнань үндсэн аялал.",
    price: 2590000,
    oldPrice: 3290000,
    tag: "sale",
    discount: "-19%",
    status: "ended",
    dates: "09/29 – 10/06",
    image: asset("269c7c28-b5a3-46ae-b9ee-4b239417cbfa/hainan-main-sep15.png"),
    pricing: { child: "2–12 нас: хамт унтвал ₮2'290'000", childSharedBed: 2290000, singleSupplement: 700000, depositPercent: 30 },
  },
  {
    ...hainanBase,
    id: "hainan",
    title: "Хайнань 10-р сарын аялал",
    description: "Үндсэн хөтөлбөртэй аялал",
    story: "10/06 – 10/27 хооронд гурван огноотой Хайнань үндсэн аялал.",
    price: 2690000,
    status: "ended",
    dates: "10/06–10/13 · 10/13–10/20 · 10/20–10/27",
    image: asset("8ce9b508-74d0-44a0-89ed-cf34d352091e/hainan-overview.png"),
    pricing: { child: "2–12 нас: хамт унтвал ₮2'390'000", childSharedBed: 2390000, singleSupplement: 700000, depositPercent: 30 },
  },
  {
    id: "bts",
    title: "BTS үзвэртэй аялал",
    destination: "Удахгүй",
    destinationKey: "soon",
    description: "Шинэ аялал бэлтгэгдэж байна",
    story: "BTS үзвэртэй шинэ аялал бэлтгэгдэж байна. Мэдээлэл авахыг хүсвэл бидэнтэй холбогдоорой.",
    price: null,
    duration: "Тун удахгүй",
    nights: null,
    tag: "soon",
    image: asset("53fbda70-e185-458e-ac5f-6c0ff65288a2/bts-tour.jpg"),
    gallery: [],
    highlights: ["Концерт аялал", "Тун удахгүй"],
    includes: [],
    excludes: [],
    itinerary: [],
  },
  {
    id: "shakira-egypt",
    title: "SHAKIRA Египет үзвэртэй аялал",
    destination: "Египет",
    destinationKey: "soon",
    description: "Шинэ аялал бэлтгэгдэж байна",
    story: "SHAKIRA-гийн тоглолт болон Египетийн аялал бэлтгэгдэж байна. Мэдээлэл авахыг хүсвэл бидэнтэй холбогдоорой.",
    price: null,
    duration: "Тун удахгүй",
    nights: null,
    tag: "soon",
    image: asset("847e6995-61b5-4cbc-b64b-cee410b3a47d/shakira-egypt.png"),
    gallery: [],
    highlights: ["Концерт аялал", "Египет", "Тун удахгүй"],
    includes: [],
    excludes: [],
    itinerary: [],
  },
];
