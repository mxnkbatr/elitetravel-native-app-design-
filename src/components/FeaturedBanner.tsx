"use client";

import { formatPrice, fromPrice, isBookable } from "@/data/tours";
import { withTransforms } from "@/lib/cloudinary";
import { useTours } from "@/lib/content";
import { haptic } from "@/lib/native";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const INTERVAL_MS = 5000;

/**
 * Featured-tour banner for the app home, in the website's look (deep emerald frame, photo inset,
 * text and price under it, progress bars). The slides are a native scroll-snap strip, so a swipe has
 * the phone's own momentum and stops on a card; it auto-advances while nobody is touching it.
 */
export function FeaturedBanner() {
  const slides = useTours().filter(isBookable);
  const strip = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const slide = slides[Math.min(index, slides.length - 1)];

  // Which card is centred, read from the scroll position (works for finger swipes and auto-advance)
  useEffect(() => {
    const el = strip.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = Math.round(el.scrollLeft / el.clientWidth);
        setIndex((i) => {
          if (i !== next) haptic("tap");
          return next;
        });
      });
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Auto-advance; paused while a finger is on the banner
  useEffect(() => {
    const el = strip.current;
    if (paused || slides.length < 2 || !el) return;
    const id = window.setTimeout(() => {
      const next = (index + 1) % slides.length;
      el.scrollTo({ left: next * el.clientWidth, behavior: next === 0 ? "instant" : "smooth" });
    }, INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [index, paused, slides.length]);

  function go(i: number) {
    const el = strip.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  if (!slide) return null;

  return (
    <div className="relative mt-4 overflow-hidden rounded-[1.75rem] bg-[#062a2a] p-2.5 text-white shadow-[0_20px_50px_rgba(6,42,42,0.25)]">
      {/* Blurred backdrop from the current slide gives the card its glassy tint.
          Pre-blurred 48px thumbnail from Cloudinary — a live CSS blur repaints on every scroll frame */}
      <Image
        key={`bg-${slide.id}`}
        src={withTransforms(slide.image, "w_48,q_40,e_blur:600")}
        alt=""
        fill
        unoptimized
        className="enter-fade scale-125 object-cover opacity-40"
      />

      <div
        ref={strip}
        onTouchStart={() => setPaused(true)}
        onTouchEnd={() => setPaused(false)}
        // A vertical page scroll that starts on the banner ends in cancel, not up/end
        onTouchCancel={() => setPaused(false)}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerCancel={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
        className="hide-scrollbar relative flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-[1.25rem]"
      >
        {slides.map((s, i) => (
          <Link key={s.id} href={`/tours/${s.id}`} draggable={false} className="block w-full shrink-0 snap-center snap-always active:opacity-90">
            <div className="relative aspect-[16/11] overflow-hidden rounded-[1.25rem]">
              <Image
                src={s.image}
                alt={s.title}
                fill
                className="object-cover"
                sizes="calc(100vw - 52px)"
                preload={i === 0}
                fetchPriority={i === 0 ? "high" : undefined}
                loading={i === 0 ? undefined : "lazy"}
                draggable={false}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
              <div className="absolute left-3 top-3 flex gap-1.5">
                <span className="rounded-full bg-white px-3 py-1 type-label text-ink">{s.destination}</span>
                {s.discount ? <span className="rounded-full bg-accent px-3 py-1 text-[0.68rem] font-bold text-white">{s.discount}</span> : null}
              </div>
              <p className="absolute bottom-3 left-3 text-xs font-medium text-white/90">{s.duration}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Text for the centred card: keyed so it rises in as each slide arrives */}
      <Link href={`/tours/${slide.id}`} className="relative block px-2 pb-1 pt-4">
        <p className="type-eyebrow text-[#7ef0e0]">Онцлох аялал</p>
        <div key={slide.id} className="enter-rise">
          <p className="mt-1.5 truncate font-display text-[1.6rem] font-semibold leading-tight">{slide.title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-num text-2xl text-[#f3d199]">{formatPrice(fromPrice(slide))}</span>
            {slide.oldPrice ? <span className="text-sm text-white/65 line-through">{formatPrice(slide.oldPrice)}</span> : null}
          </div>
        </div>
      </Link>

      <div className="relative flex gap-1.5 px-2 pb-2 pt-3">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            aria-label={s.title}
            onClick={() => go(i)}
            className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/25 before:absolute before:-inset-y-3 before:inset-x-0"
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
