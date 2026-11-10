"use client";

import { formatPrice, isBookable, type TourSummary } from "@/data/tours";
import { cldImage } from "@/lib/cloudinary";
import { useTours } from "@/lib/content";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

/** Curated copy/photos for known hotels; anything else comes from tour.stay text. */
const curated = [
  {
    name: "Timton Fuhe Hotel",
    place: "Саняа, Хайнань",
    blurb: "Хайнань аяллуудын 6 шөнийг өнгөрүүлэх Саняагийн буудал — далайн эрэг, бассейн, чөлөөт өдрүүд.",
    image: cldImage("elitetravel/tours/day7-resort-pool"),
    match: (stay?: string) => stay?.includes("Timton") ?? false,
  },
  {
    name: "Bing Tang Bali Resort",
    place: "Бали, Индонез",
    blurb: "Убуд, хүрхрээ, Нуса Пенида руу гарах аяллын төв. 8 шөнийн турш эндээ буудаллана.",
    image: cldImage("elitetravel/tours/cretya-ubud"),
    match: (stay?: string) => stay?.includes("Bing Tang") ?? false,
  },
  {
    name: "Harbour Plaza & Degrees",
    place: "Хонг Конг",
    blurb: "The Weeknd-ийн тоглолт болох газраас ердөө 600 метрт. Хотын аялал, тоглолт хоёуланд нь ойр.",
    image: cldImage("elitetravel/tours/hongkong-skyline"),
    match: (stay?: string) => stay?.includes("Harbour Plaza") ?? false,
  },
] as const;

export type StayCard = {
  name: string;
  place: string;
  blurb: string;
  image: string;
  linked: TourSummary[];
  from: number | null;
};

function lowestPrice(linked: TourSummary[]) {
  return linked.reduce<number | null>((min, t) => (t.price && (!min || t.price < min) ? t.price : min), null);
}

function splitStay(stay: string) {
  const [name, ...rest] = stay.split(",");
  return { name: name.trim(), place: rest.join(",").trim() };
}

/** Each hotel with the open tours that stay there and their lowest price. */
export function useStays() {
  const tours = useTours();
  return useMemo(() => {
    const bookable = tours.filter(isBookable);
    const stays: StayCard[] = curated.map((s) => {
      const linked = bookable.filter((t) => s.match(t.stay));
      return { name: s.name, place: s.place, blurb: s.blurb, image: s.image, linked, from: lowestPrice(linked) };
    });

    const covered = new Set(
      bookable.filter((t) => t.stay && curated.some((s) => s.match(t.stay))).map((t) => t.stay!.trim()),
    );

    const extras = new Map<string, TourSummary[]>();
    for (const t of bookable) {
      const stay = t.stay?.trim();
      if (!stay || covered.has(stay)) continue;
      const list = extras.get(stay) ?? [];
      list.push(t);
      extras.set(stay, list);
    }

    for (const [stay, linked] of extras) {
      const { name, place } = splitStay(stay);
      stays.push({
        name,
        place: place || linked[0]?.destination || "",
        blurb: `${place || linked[0]?.destination || "Аялал"}-ын буудал — аяллын багцад багтсан.`,
        image: linked[0]?.image ?? curated[0].image,
        linked,
        from: lowestPrice(linked),
      });
    }

    return stays;
  }, [tours]);
}

export function ResortsPage() {
  const stays = useStays();
  return (
    <div className="space-y-6">
      {stays.map((s, i) => (
        <motion.article
          key={s.name}
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className={`epic-card group grid overflow-hidden md:grid-cols-2 ${i % 2 ? "md:[&>*:first-child]:order-2" : ""}`}
        >
          <div className="relative aspect-[16/11] overflow-hidden md:aspect-auto md:min-h-[360px]">
            <Image
              src={s.image}
              alt={s.place}
              fill
              className="object-cover transition duration-1000 group-hover:scale-105"
              sizes="(max-width:768px) 100vw, 50vw"
            />
          </div>
          <div className="flex flex-col justify-center gap-4 p-6 sm:p-10">
            <p className="type-eyebrow text-accent">{s.place}</p>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{s.name}</h2>
            <p className="max-w-md text-sm leading-relaxed text-muted sm:text-base">{s.blurb}</p>

            {s.linked.length ? (
              <ul className="flex flex-wrap gap-2">
                {s.linked.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/tours/${t.id}`}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-bg px-3 py-1.5 text-xs font-medium transition hover:border-accent hover:text-accent"
                    >
                      {t.title}
                      {t.dates ? <span className="text-muted">· {t.dates}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-2 flex flex-wrap items-center gap-4">
              {s.from ? (
                <p className="text-sm text-muted">
                  Аялал <span className="font-num text-2xl font-semibold text-accent">{formatPrice(s.from)}</span>-аас
                </p>
              ) : null}
              {s.linked[0] ? (
                <Link
                  href={`/tours/${s.linked[0].id}`}
                  className="btn-shine inline-flex h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-white"
                >
                  Аялал үзэх →
                </Link>
              ) : null}
            </div>
          </div>
        </motion.article>
      ))}
    </div>
  );
}
