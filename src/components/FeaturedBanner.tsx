"use client";

import { formatPrice, isBookable } from "@/data/tours";
import { withTransforms } from "@/lib/cloudinary";
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
    <div className="relative mt-4 overflow-hidden rounded-[1.75rem] bg-[#062a2a] p-2.5 text-white shadow-[0_20px_50px_rgba(6,42,42,0.25)]">
      {/* Blurred backdrop from the current slide gives the card its glassy tint */}
      <AnimatePresence initial={false}>
        <motion.div key={`bg-${slide.id}`} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}>
          {/* Pre-blurred 48px thumbnail from Cloudinary — a live CSS blur repaints on every scroll frame */}
          <Image src={withTransforms(slide.image, "w_48,q_40,e_blur:600")} alt="" fill unoptimized className="scale-125 object-cover opacity-40" />
        </motion.div>
      </AnimatePresence>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragStart={() => setPaused(true)}
        onDragEnd={onDragEnd}
        className="relative touch-pan-y"
      >
        <Link href={`/tours/${slide.id}`} draggable={false} className="block">
          <div className="relative aspect-[16/11] overflow-hidden rounded-[1.25rem]">
            <AnimatePresence initial={false} custom={dir}>
              <motion.div
                key={slide.id}
                custom={dir}
                className="absolute inset-0"
                initial={{ x: `${dir * 100}%` }}
                animate={{ x: "0%" }}
                exit={{ x: `${dir * -30}%`, opacity: 0.4 }}
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              >
                <Image src={slide.image} alt={slide.title} fill className="object-cover" sizes="100vw" priority={index === 0} draggable={false} />
              </motion.div>
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
            <div className="absolute left-3 top-3 flex gap-1.5">
              <span className="rounded-full bg-white px-3 py-1 type-label text-ink">{slide.destination}</span>
              {slide.discount ? (
                <span className="rounded-full bg-accent px-3 py-1 text-[0.68rem] font-bold text-white">{slide.discount}</span>
              ) : null}
            </div>
            <p className="absolute bottom-3 left-3 text-xs font-medium text-white/90">{slide.duration}</p>
          </div>

          <div className="px-2 pb-1 pt-4">
            <p className="type-eyebrow text-[#7ef0e0]">Онцлох аялал</p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.3 }}
              >
                <p className="mt-1.5 truncate font-display text-[1.6rem] font-semibold leading-tight">{slide.title}</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-num text-2xl text-[#f3d199]">{formatPrice(slide.price)}</span>
                  {slide.oldPrice ? <span className="text-sm text-white/50 line-through">{formatPrice(slide.oldPrice)}</span> : null}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </Link>
      </motion.div>

      <div className="relative flex gap-1.5 px-2 pb-2 pt-3">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={s.title}
            onClick={() => {
              setDir(i > index ? 1 : -1);
              setIndex(i);
            }}
            className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/25"
          >
            {i < index ? <span className="absolute inset-0 bg-white/80" /> : null}
            {i === index ? (
              <span
                key={`${index}-${paused}`}
                className="hero-progress absolute inset-0 origin-left bg-[#e8b86d]"
                style={{ animationDuration: `${INTERVAL_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
              />
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
