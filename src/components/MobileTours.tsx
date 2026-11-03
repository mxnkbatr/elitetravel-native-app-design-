"use client";

import { SaveButton } from "@/components/SaveButton";
import { formatPrice, type TourSummary } from "@/data/tours";
import { useTours } from "@/lib/content";
import { daysUntil } from "@/lib/dates";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

const places = [
  { key: "all", label: "Бүгд" },
  { key: "hainan", label: "Хайнань" },
  { key: "hongkong", label: "Хонг Конг" },
  { key: "bali", label: "Бали" },
  { key: "soon", label: "Удахгүй" },
] as const;

const sorts = [
  { key: "soonest", label: "Ойрын огноо" },
  { key: "cheap", label: "Хямд нь эхэндээ" },
  { key: "pricey", label: "Үнэтэй нь эхэндээ" },
] as const;

type Place = (typeof places)[number]["key"];
type Sort = (typeof sorts)[number]["key"];


function sortTours(list: TourSummary[], sort: Sort) {
  const rank = (t: TourSummary) => daysUntil(t.dates) ?? 9999;
  return [...list].sort((a, b) => {
    if (a.tag === "soon" !== (b.tag === "soon")) return a.tag === "soon" ? 1 : -1;
    if (sort === "cheap") return (a.price ?? 0) - (b.price ?? 0);
    if (sort === "pricey") return (b.price ?? 0) - (a.price ?? 0);
    return rank(a) - rank(b);
  });
}

/** Phone tour list: compact rows, quick place chips and a filter/sort bottom sheet. */
export function MobileTours({ initialFilter = "all" }: { initialFilter?: string }) {
  const tours = useTours();
  const listed = useMemo(() => tours.filter((t) => t.status !== "ended"), [tours]);
  const priced = listed.filter((t) => t.price != null).map((t) => t.price!);
  const priceMax = priced.length ? Math.max(...priced) : 0;
  const priceMin = priced.length ? Math.min(...priced) : 0;
  const start = (places.some((p) => p.key === initialFilter) ? initialFilter : "all") as Place;
  const [place, setPlace] = useState<Place>(start);
  const [sort, setSort] = useState<Sort>("soonest");
  const [maxPrice, setMaxPrice] = useState(priceMax);
  const [sheet, setSheet] = useState(false);

  const result = useMemo(() => {
    const byPlace = listed.filter((t) => place === "all" || t.destinationKey === place);
    const byPrice = byPlace.filter((t) => t.price == null || t.price <= maxPrice);
    return sortTours(byPrice, sort);
  }, [listed, place, sort, maxPrice]);

  const activeFilters = (sort !== "soonest" ? 1 : 0) + (maxPrice < priceMax ? 1 : 0);

  return (
    <div>
      <div className="sticky top-[calc(0.5rem+env(safe-area-inset-top))] z-30 -mx-4 bg-gradient-to-b from-bg via-bg/95 to-bg/0 px-4 pb-3 pt-1">
        <div className="flex items-center gap-2">
          <div className="hide-scrollbar flex flex-1 gap-1.5 overflow-x-auto">
            {places.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPlace(p.key)}
                className={`relative shrink-0 rounded-full px-3.5 py-2 text-[0.82rem] font-semibold transition active:scale-95 ${
                  place === p.key ? "text-white" : "border border-[var(--line)] bg-bg-elevated"
                }`}
              >
                {place === p.key ? <motion.span layoutId="mt-place" className="absolute inset-0 rounded-full bg-ink" /> : null}
                <span className="relative">{p.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSheet(true)}
            aria-label="Шүүлтүүр"
            className="relative grid size-10 shrink-0 place-items-center rounded-full border border-[var(--line)] bg-bg-elevated active:scale-90"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="16" cy="7" r="2.2" stroke="currentColor" strokeWidth="1.8" />
              <circle cx="10" cy="17" r="2.2" stroke="currentColor" strokeWidth="1.8" />
            </svg>
            {activeFilters ? (
              <span className="absolute -right-0.5 -top-0.5 grid size-4 place-items-center rounded-full bg-[#e8b86d] text-[0.6rem] font-bold text-ink">{activeFilters}</span>
            ) : null}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">
          {result.length} аялал · {sorts.find((s) => s.key === sort)!.label}
        </p>
      </div>

      <motion.ul layout className="space-y-2.5">
        <AnimatePresence mode="popLayout" initial={false}>
          {result.map((t) => {
            const days = daysUntil(t.dates);
            return (
              <motion.li key={t.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.3 }}>
                <Link href={`/tours/${t.id}`} className="relative flex gap-3 rounded-2xl border border-[var(--line)] bg-bg-elevated p-2.5 active:scale-[0.98] active:bg-bg">
                  <div className="relative aspect-[4/5] w-28 shrink-0 overflow-hidden rounded-xl bg-accent-mist">
                    <Image src={t.image} alt="" fill className="object-cover" sizes="112px" />
                    {t.discount ? (
                      <span className="absolute left-1.5 top-1.5 rounded-md bg-accent px-1.5 py-0.5 text-[0.6rem] font-bold text-white">{t.discount}</span>
                    ) : null}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col py-0.5 pr-8">
                    <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-accent">{t.destination}</p>
                    <p className="mt-0.5 line-clamp-2 font-semibold leading-snug">{t.title}</p>
                    <p className="mt-1 text-xs text-muted">{t.duration}</p>
                    {t.dates ? <p className="truncate text-xs text-muted">{t.dates}</p> : null}
                    <div className="mt-auto flex items-baseline gap-2 pt-1.5">
                      <span className="font-num text-base text-accent">{formatPrice(t.price)}</span>
                      {t.oldPrice ? <span className="text-[0.7rem] text-muted line-through">{formatPrice(t.oldPrice)}</span> : null}
                    </div>
                    {days != null && days >= 0 && days <= 30 ? (
                      <span className="mt-1 w-fit rounded-full bg-[#e8b86d]/20 px-2 py-0.5 text-[0.65rem] font-semibold text-[#8a5a12]">
                        {days === 0 ? "Өнөөдөр хөдөлнө" : `${days} хоногийн дараа`}
                      </span>
                    ) : null}
                  </div>
                  <SaveButton tourId={t.id} className="absolute right-2.5 top-2.5 size-8 bg-bg shadow-none" />
                </Link>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </motion.ul>

      {!result.length ? (
        <div className="rounded-2xl border border-dashed border-[var(--line)] p-8 text-center text-sm text-muted">
          Шүүлтүүрт тохирох аялал алга.
          <button type="button" onClick={() => { setPlace("all"); setMaxPrice(priceMax); }} className="mt-3 block w-full font-semibold text-accent">
            Шүүлтүүр цэвэрлэх
          </button>
        </div>
      ) : null}

      <AnimatePresence>
        {sheet ? (
          <motion.div className="fixed inset-0 z-[80] flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="Хаах" onClick={() => setSheet(false)} className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]" />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(_, info) => (info.offset.y > 100 || info.velocity.y > 600) && setSheet(false)}
              data-lenis-prevent
              className="relative w-full rounded-t-[1.75rem] bg-bg-elevated px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3"
            >
              <div className="mx-auto h-1.5 w-10 rounded-full bg-[var(--line)]" />
              <div className="mt-4 flex items-center justify-between">
                <p className="font-display text-2xl font-semibold">Шүүлтүүр</p>
                <button
                  type="button"
                  onClick={() => {
                    setSort("soonest");
                    setMaxPrice(priceMax);
                  }}
                  className="text-sm font-semibold text-accent"
                >
                  Цэвэрлэх
                </button>
              </div>

              <p className="mt-5 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">Эрэмбэлэх</p>
              <div className="mt-2 grid gap-2">
                {sorts.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setSort(s.key)}
                    className={`flex h-12 items-center justify-between rounded-xl border px-4 text-sm font-medium transition ${
                      sort === s.key ? "border-accent bg-accent/5 text-accent" : "border-[var(--line)]"
                    }`}
                  >
                    {s.label}
                    <span className={`grid size-5 place-items-center rounded-full border-2 ${sort === s.key ? "border-accent" : "border-[var(--line)]"}`}>
                      {sort === s.key ? <span className="size-2.5 rounded-full bg-accent" /> : null}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-6 flex items-baseline justify-between">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">Дээд үнэ</p>
                <p className="font-num text-lg text-accent">{formatPrice(maxPrice)}</p>
              </div>
              <input
                type="range"
                min={priceMin}
                max={priceMax}
                step={100000}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="mt-3 w-full accent-[#0e8f84]"
                aria-label="Дээд үнэ"
              />
              <div className="mt-1 flex justify-between text-[0.7rem] text-muted">
                <span className="font-num font-medium">{formatPrice(priceMin)}</span>
                <span className="font-num font-medium">{formatPrice(priceMax)}</span>
              </div>

              <button type="button" onClick={() => setSheet(false)} className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-ink text-sm font-semibold text-white active:scale-[0.98]">
                {result.length} аялал харах
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
