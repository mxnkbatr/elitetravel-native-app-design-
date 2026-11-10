import "server-only";

import type { NewsCategory, NewsItem } from "@/data/news";
import type { ItineraryDay, Tour } from "@/data/tours";
import { isDocType } from "@/lib/documents";

/**
 * Rebuilds a Tour / NewsItem from untrusted admin input, keeping only known fields.
 * Throws a Mongolian message naming the first bad field, shown back in the editor.
 */
class Invalid extends Error {}

const ID = /^[a-z0-9-]{2,60}$/;

function str(v: unknown, label: string, max = 4000): string {
  if (typeof v !== "string" || !v.trim()) throw new Invalid(`«${label}» хоосон байна.`);
  if (v.length > max) throw new Invalid(`«${label}» хэт урт байна.`);
  return v.trim();
}

function optStr(v: unknown, max = 4000): string | undefined {
  if (typeof v !== "string" || !v.trim()) return undefined;
  return v.trim().slice(0, max);
}

function num(v: unknown, label: string): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Invalid(`«${label}» тоо байх ёстой.`);
  return Math.round(n);
}

function list(v: unknown, label: string): string[] {
  if (!Array.isArray(v)) throw new Invalid(`«${label}» жагсаалт байх ёстой.`);
  return v.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim().slice(0, 1000));
}

function url(v: unknown, label: string): string {
  const s = str(v, label, 1000);
  if (!/^https:\/\//.test(s)) throw new Invalid(`«${label}» https:// холбоос байх ёстой.`);
  return s;
}

function oneOf<T extends string>(v: unknown, options: readonly T[], label: string): T {
  if (!options.includes(v as T)) throw new Invalid(`«${label}» буруу утгатай.`);
  return v as T;
}

function itineraryDay(v: unknown, i: number): ItineraryDay {
  const d = (v ?? {}) as Record<string, unknown>;
  const label = `Хөтөлбөр ${i + 1}`;
  return {
    day: str(d.day, `${label} — өдөр`, 60),
    title: str(d.title, `${label} — гарчиг`, 200),
    detail: str(d.detail, `${label} — тайлбар`),
    flight: optStr(d.flight, 200),
    meals: optStr(d.meals, 200),
    hotel: optStr(d.hotel, 200),
    host: optStr(d.host, 200),
  };
}

export function parseTour(input: unknown): Tour {
  const t = (input ?? {}) as Record<string, unknown>;
  const id = str(t.id, "ID", 60);
  if (!ID.test(id)) throw new Invalid("ID зөвхөн жижиг латин үсэг, тоо, зураас (-) агуулна.");
  const pricing = (t.pricing ?? {}) as Record<string, unknown>;
  const tour: Tour = {
    id,
    title: str(t.title, "Гарчиг", 200),
    destination: str(t.destination, "Чиглэл", 120),
    destinationKey: (() => {
      const key = str(t.destinationKey, "Чиглэлийн бүс", 40).toLowerCase();
      if (!/^[a-z0-9-]{2,40}$/.test(key)) throw new Invalid("«Чиглэлийн бүс» зөвхөн жижиг латин үсэг, тоо, зураас (-) агуулна.");
      return key;
    })(),
    description: str(t.description, "Товч тайлбар", 600),
    story: str(t.story, "Дэлгэрэнгүй"),
    price: num(t.price, "Үнэ"),
    oldPrice: num(t.oldPrice, "Хуучин үнэ"),
    duration: str(t.duration, "Хугацаа", 60),
    nights: num(t.nights, "Шөнө"),
    tag: t.tag ? oneOf(t.tag, ["hot", "soon", "sale"] as const, "Шошго") : undefined,
    status: t.status === "ended" ? "ended" : undefined,
    unlisted: t.unlisted === true ? true : undefined,
    discount: optStr(t.discount, 30),
    image: url(t.image, "Нүүр зураг"),
    gallery: list(t.gallery, "Галерей").filter((g) => g.startsWith("https://")),
    dates: optStr(t.dates, 400),
    stay: optStr(t.stay, 200),
    departure: optStr(t.departure, 200),
    highlights: list(t.highlights, "Онцлох"),
    includes: list(t.includes, "Багтсан"),
    excludes: list(t.excludes, "Багтаагүй"),
    itinerary: Array.isArray(t.itinerary) ? t.itinerary.map(itineraryDay) : [],
    pricing: {
      child: optStr(pricing.child, 400),
      childSharedBed: num(pricing.childSharedBed, "Хүүхэд (хамт унтах)") ?? undefined,
      childOwnBed: pricing.childOwnBed === false ? false : undefined,
      singleSupplement: num(pricing.singleSupplement, "Ганц өрөөний нэмэгдэл") ?? undefined,
      depositPercent: num(pricing.depositPercent, "Урьдчилгаа %") ?? undefined,
    },
    notes: list(t.notes ?? [], "Санамж"),
    documents: Array.isArray(t.documents) ? [...new Set(t.documents.filter(isDocType))] : undefined,
  };
  if (tour.pricing?.depositPercent != null && tour.pricing.depositPercent > 100) throw new Invalid("Урьдчилгаа 100%-аас их байж болохгүй.");
  return JSON.parse(JSON.stringify(tour)) as Tour; // drops undefined keys
}

const CATEGORIES: readonly NewsCategory[] = ["Мэдээ", "Урамшуулал", "Зөвлөгөө"];

export function parseNews(input: unknown): NewsItem {
  const n = (input ?? {}) as Record<string, unknown>;
  const id = str(n.id, "ID", 60);
  if (!ID.test(id)) throw new Invalid("ID зөвхөн жижиг латин үсэг, тоо, зураас (-) агуулна.");
  const body = list(n.body, "Агуулга");
  if (!body.length) throw new Invalid("«Агуулга» хоосон байна.");
  const item: NewsItem = {
    id,
    category: oneOf(n.category, CATEGORIES, "Ангилал"),
    title: str(n.title, "Гарчиг", 200),
    excerpt: str(n.excerpt, "Товч", 400),
    body,
    image: url(n.image, "Зураг"),
    tourId: optStr(n.tourId, 60),
    readMin: Math.max(1, Math.min(30, num(n.readMin, "Унших минут") ?? Math.ceil(body.join(" ").length / 900))),
  };
  return JSON.parse(JSON.stringify(item)) as NewsItem;
}

export function invalidMessage(e: unknown) {
  return e instanceof Invalid ? e.message : null;
}
