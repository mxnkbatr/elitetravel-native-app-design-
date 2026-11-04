"use client";

import { TourAccordion } from "@/components/TourAccordion";
import { TourCard } from "@/components/TourCard";
import { isBookable } from "@/data/tours";
import { useTours } from "@/lib/content";
import { gsap, registerGsap, useGSAP } from "@/lib/gsap";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const AUTO_MS = 4000;

export function ToursCarousel() {
  registerGsap();
  const root = useRef<HTMLElement>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ motion: "(prefers-reduced-motion: no-preference)", list: "(max-width: 1023px)" }, (ctx) => {
        const { motion, list } = ctx.conditions as { motion: boolean; list: boolean };
        if (!motion) return;
        gsap.fromTo(
          ".tours-head > *",
          { y: 40, opacity: 0 },
          { y: 0, opacity: 1, stagger: 0.08, duration: 1, ease: "expo.out", scrollTrigger: { trigger: root.current, start: "top 80%" } },
        );
        // The card strip only exists below lg; animating it while hidden forced a style recalc per card on every visit
        if (!list) return;
        gsap.fromTo(
          scroller.current?.children ?? [],
          { y: 80, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.08,
            duration: 1.1,
            ease: "expo.out",
            scrollTrigger: { trigger: scroller.current, start: "top 85%" },
          },
        );
      });
    },
    { scope: root },
  );
  const [paused, setPaused] = useState(false);
  const tours = useTours();
  // Open tours, then the next coming-soon one so the strip has a fourth card to look forward to
  const open = tours.filter(isBookable);
  const soon = tours.find((t) => t.tag === "soon" && t.status !== "ended");
  const list = soon ? [...open, soon] : open;

  const scrollBy = useCallback((dir: -1 | 1) => {
    const el = scroller.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("article");
    const step = (card?.offsetWidth ?? 280) + 16;
    const max = el.scrollWidth - el.clientWidth;
    let next = el.scrollLeft + dir * step;

    if (dir === 1 && el.scrollLeft >= max - 8) next = 0;
    else if (dir === -1 && el.scrollLeft <= 8) next = max;

    el.scrollTo({ left: next, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (paused || list.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 767px)").matches) return;

    const id = window.setInterval(() => scrollBy(1), AUTO_MS);
    return () => window.clearInterval(id);
  }, [paused, list.length, scrollBy]);

  return (
    <section ref={root} className="px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="tours-head mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <div className="epic-rule mb-4" />
            <p className="type-eyebrow text-accent">
              Best offers
            </p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              Мөрөөдлийн <span className="text-accent">аяллаа</span> сонго
            </h2>
            <p className="mt-3 text-sm text-muted sm:text-base">
              Огноо, үнэ тодорхой — шууд захиалах боломжтой.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              aria-label="Зүүн"
              onClick={() => scrollBy(-1)}
              className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-bg-elevated text-foam transition hover:border-accent hover:text-accent lg:hidden"
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Баруун"
              onClick={() => scrollBy(1)}
              className="grid size-10 place-items-center rounded-full border border-[var(--line)] bg-bg-elevated text-foam transition hover:border-accent hover:text-accent lg:hidden"
            >
              →
            </button>
            <Link
              href="/tours"
              className="ml-1 inline-flex h-10 items-center rounded-full bg-ink px-4 text-sm font-semibold text-white transition hover:bg-accent"
            >
              Бүх аялал →
            </Link>
          </div>
        </div>

        <div
          ref={scroller}
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
          className="hide-scrollbar -mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-1 px-1 pb-3 lg:hidden"
        >
          {list.map((tour) => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>
        <div className="hidden lg:block">
          <TourAccordion tours={list} />
        </div>
      </div>
    </section>
  );
}
