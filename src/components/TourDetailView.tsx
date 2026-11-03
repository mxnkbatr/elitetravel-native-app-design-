"use client";

import { BookingPlanner } from "@/components/BookingPlanner";
import { Icon, type IconName } from "@/components/Icon";
import { SaveButton } from "@/components/SaveButton";
import { GalleryLightbox } from "@/components/GalleryLightbox";
import { TourCard } from "@/components/TourCard";
import { TourHero } from "@/components/TourHero";
import { ItineraryStory } from "@/components/ItineraryStory";
import { BookingSheet, TourTabs } from "@/components/TourMobile";
import { formatPrice, isBookable, relatedTours, type ItineraryDay, type Tour } from "@/data/tours";
import { useTours } from "@/lib/content";
import { motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";

export function TourDetailView({ tour }: { tour: Tour }) {
  const related = relatedTours(useTours(), tour.id, 3);
  const [sheetOpen, setSheetOpen] = useState(false);
  const bookable = isBookable(tour);

  return (
    <div className="relative w-full max-w-[100vw] overflow-x-clip pb-16 sm:pb-20">
      <div className="mx-auto w-full max-w-6xl px-4 pt-[calc(5.5rem+env(safe-area-inset-top))] sm:px-6">
        <Link
          href="/tours"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-accent"
        >
          <span aria-hidden>←</span>
          Аяллууд руу буцах
        </Link>

        <TourHero tour={tour} onBook={() => setSheetOpen(true)} />

        {bookable ? <TourTabs onPrice={() => setSheetOpen(true)} /> : null}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="min-w-0 space-y-8">
            <section id="overview" className="scroll-mt-24">
              <div className="epic-rule mb-4" />
              <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Аяллын онцлох</h2>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {tour.highlights.map((h, i) => (
                  <motion.li
                    key={h}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.06, duration: 0.5 }}
                    className="group flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-bg-elevated p-3.5 transition hover:-translate-y-0.5 hover:border-accent/40 hover:shadow-[var(--shadow)]"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent/10 font-num text-sm text-accent transition group-hover:bg-accent group-hover:text-white">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[0.92rem] font-medium leading-snug text-foam">{h}</span>
                  </motion.li>
                ))}
              </ul>
            </section>

            {tour.gallery.length ? (
              <section>
                <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Зургийн цомог</h2>
                <GalleryLightbox images={tour.gallery} title={tour.title} />
              </section>
            ) : null}

            {tour.itinerary.length ? (
            <section id="itinerary">
              <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Хөтөлбөр</h2>
              <div className="mt-6 hidden lg:block">
                <ItineraryStory tour={tour} renderMeta={(d) => <DayMeta day={d} />} />
              </div>
              <ol className="relative mt-6 space-y-6 border-l border-dashed border-accent/35 pl-7 lg:hidden">
                {tour.itinerary.map((day, i) => (
                  <motion.li
                    key={day.day + day.title}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    className="relative"
                  >
                    <span className="absolute -left-[2.15rem] top-0.5 grid size-5 place-items-center rounded-full bg-accent text-[0.6rem] font-bold text-white ring-4 ring-bg">
                      {i + 1}
                    </span>
                    <p className="type-label text-accent">{day.day}</p>
                    <p className="mt-1 font-display text-lg font-semibold text-foam">{day.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{day.detail}</p>
                    <DayMeta day={day} />
                  </motion.li>
                ))}
              </ol>
            </section>
            ) : null}

            {tour.includes.length ? (
            <section id="included" className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-[var(--line)] bg-bg-elevated p-5">
                <h3 className="font-display text-xl font-semibold">Үнэд багтсан</h3>
                <ul className="mt-3 space-y-2.5 text-sm text-foam">
                  {tour.includes.map((x) => (
                    <li key={x} className="flex gap-2.5">
                      <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-accent text-white"><Icon name="check" size={10} strokeWidth={3} /></span>
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[1.25rem] border border-[var(--line)] bg-bg-elevated p-5">
                <h3 className="font-display text-xl font-semibold">Үнэд ороогүй</h3>
                <ul className="mt-3 space-y-2.5 text-sm text-muted">
                  {tour.excludes.map((x) => (
                    <li key={x} className="flex gap-2.5">
                      <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-muted/20 text-[0.6rem]">–</span>
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
            </section>
            ) : null}

            {tour.notes?.length ? (
              <section className="rounded-[1.25rem] border border-[#e8b86d]/40 bg-[#e8b86d]/10 p-5">
                <h3 className="font-display text-xl font-semibold">Анхаарах зүйлс</h3>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-foam/85">
                  {tour.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-28 lg:self-start">
            {bookable ? (
              <div className="hidden sm:block">
                <BookingPlanner tour={tour} />
              </div>
            ) : (
              <div className="rounded-[1.5rem] border border-[var(--line)] bg-bg-elevated p-5 shadow-[var(--shadow)]">
                <p className="font-display text-2xl font-semibold">
                  {tour.status === "ended" ? "Энэ аялал дууссан" : "Тун удахгүй"}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {tour.status === "ended"
                    ? "Дараагийн огноо болон ижил төстэй аяллын талаар манай багаас лавлаарай."
                    : "Мэдээлэл гармагц хамгийн түрүүнд мэдэх бол бидэнтэй холбогдоорой."}
                </p>
                <a
                  href="tel:+97690031771"
                  className="mt-5 flex h-12 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white transition hover:bg-accent-soft"
                >
                  Залгах · +976 9003 1771
                </a>
                <a
                  href="https://ig.me/m/elitetravelmn"
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 flex h-11 items-center justify-center rounded-full border border-[var(--line)] text-sm font-medium text-foam"
                >
                  Instagram-аар асуух
                </a>
              </div>
            )}
          </aside>
        </div>

        {related.length ? (
          <section className="mt-14">
            <div className="epic-rule mb-4" />
            <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Төстэй аяллууд</h2>
            <div className="hide-scrollbar -mx-4 mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
              {related.map((t) => (
                <TourCard key={t.id} tour={t} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {/* Mobile: booking bar always within thumb reach */}
      <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-[var(--line)] bg-bg-elevated/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl sm:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[0.65rem] text-muted">Үнэ / хүн</p>
            <p className="truncate font-num text-lg font-semibold leading-tight text-accent">{formatPrice(tour.price)}</p>
          </div>
          <SaveButton tourId={tour.id} variant="plain" className="size-11 shrink-0 border border-[var(--line)]" />
          <a
            href="tel:+97690031771"
            className="grid size-11 shrink-0 place-items-center rounded-full border border-[var(--line)]"
            aria-label="Залгах"
          >
            <Icon name="phone" size={19} />
          </a>
          {bookable ? (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className="btn-shine inline-flex h-12 shrink-0 items-center rounded-full bg-accent px-5 text-sm font-semibold text-white active:scale-95"
            >
              Захиалах
            </button>
          ) : (
            <a href="tel:+97690031771" className="inline-flex h-12 shrink-0 items-center rounded-full bg-accent px-5 text-sm font-semibold text-white">
              Лавлах
            </a>
          )}
        </div>
      </div>

      {bookable ? <BookingSheet tour={tour} open={sheetOpen} onClose={() => setSheetOpen(false)} /> : null}
    </div>
  );
}

function DayMeta({ day }: { day: ItineraryDay }) {
  const items = [
    day.flight && { icon: "plane", text: day.flight },
    day.meals && { icon: "utensils", text: `Хоол: ${day.meals}` },
    day.hotel && { icon: "hotel", text: day.hotel },
    day.host && { icon: "star", text: day.host },
  ].filter(Boolean) as { icon: IconName; text: string }[];

  if (!items.length) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5">
      {items.map((m) => (
        <li
          key={m.text}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-bg-elevated px-2.5 py-1 text-[0.72rem] text-foam/80"
        >
          <Icon name={m.icon} size={14} className="text-accent" />
          {m.text}
        </li>
      ))}
    </ul>
  );
}
