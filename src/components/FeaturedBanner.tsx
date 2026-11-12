"use client";

import { formatPrice, isBookable } from "@/data/tours";
import { useTours } from "@/lib/content";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const INTERVAL_MS = 5000;

/** Auto-rotating featured-tour banner for the phone home; swipe or wait to advance. */
export function FeaturedBanner() {
  const slides = useTours().filter(isBookable);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [paused, setPaused] = useState(false);
  const slide = slides[index];

  function go(step: number) {
    setDir(step);
    setIndex((i) => (i + step + slides.length) % slides.length);
  }

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const id = window.setTimeout(() => {
      setDir(1);
      setIndex((i) => (i + 1) % slides.length);
    }, INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [index, paused, slides.length]);

  function onDragEnd(_: unknown, info: PanInfo) {
    setPaused(false);
    if (info.offset.x < -50) go(1);
    else if (info.offset.x > 50) go(-1);
  }

  if (!slide) return null;

  return (
    <div className="relative mt-5 aspect-[4/5] max-h-[30rem] w-full overflow-hidden rounded-[2rem] bg-[#062a2a] text-white shadow-[0_24px_60px_rgba(6,42,42,0.28)]">
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragStart={() => setPaused(true)}
        onDragEnd={onDragEnd}
        className="absolute inset-0 touch-pan-y"
      >
        <Link href={`/tours/${slide.id}`} draggable={false} className="block size-full active:scale-[0.99] transition-transform">
          <AnimatePresence initial={false} custom={dir}>
            <motion.div
              key={slide.id}
              custom={dir}
              className="absolute inset-0"
              initial={{ x: `${dir * 100}%` }}
              animate={{ x: "0%" }}
              exit={{ x: `${dir * -30}%`, opacity: 0.4 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <Image src={slide.image} alt={slide.title} fill className="object-cover" sizes="calc(100vw - 32px)" preload={index === 0} fetchPriority={index === 0 ? "high" : undefined} draggable={false} />
            </motion.div>
          </AnimatePresence>
          {/* Top shade for the progress bars, deep bottom shade for the text */}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,42,42,0.45)_0%,rgba(6,42,42,0)_22%,rgba(6,42,42,0)_45%,rgba(6,42,42,0.9)_100%)]" />

          <div className="absolute left-4 top-9 flex gap-1.5">
            {slide.discount ? <span className="rounded-full bg-accent px-3 py-1 text-[0.72rem] font-bold text-white">{slide.discount}</span> : null}
            {slide.duration ? (
              <span className="rounded-full border border-white/35 bg-white/15 px-3 py-1 text-[0.72rem] font-semibold text-white backdrop-blur-md">{slide.duration}</span>
            ) : null}
          </div>

          <div className="absolute inset-x-0 bottom-0 p-5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={slide.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}>
                <p className="flex items-center gap-1 text-[0.8rem] text-white/85">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" stroke="currentColor" strokeWidth="1.8" />
                    <circle cx="12" cy="10" r="2.3" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                  {slide.destination}
                </p>
                <p className="mt-1 line-clamp-2 font-display text-[1.9rem] font-semibold leading-[1.05] tracking-[-0.02em]">{slide.title}</p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[0.7rem] text-white/65">Нэг хүнд</p>
                    <div className="flex items-baseline gap-2">
                      <span className="font-num text-[1.55rem] leading-none text-[#f3d199]">{formatPrice(slide.price)}</span>
                      {slide.oldPrice ? <span className="text-sm text-white/60 line-through">{formatPrice(slide.oldPrice)}</span> : null}
                    </div>
                  </div>
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-ink shadow-lg" aria-hidden>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </Link>
      </motion.div>

      <div className="absolute inset-x-4 top-4 flex gap-1.5">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={s.title}
            onClick={() => {
              setDir(i > index ? 1 : -1);
              setIndex(i);
            }}
            className="relative h-[3px] flex-1 overflow-hidden rounded-full bg-white/35 before:absolute before:-inset-y-3 before:inset-x-0"
          >
            {i < index ? <span className="absolute inset-0 bg-white" /> : null}
            {i === index ? (
              <span
                key={`${index}-${paused}`}
                className="hero-progress absolute inset-0 origin-left bg-white"
                style={{ animationDuration: `${INTERVAL_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
              />
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
