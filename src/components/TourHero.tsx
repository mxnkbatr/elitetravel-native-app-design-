"use client";

import { Icon, type IconName } from "@/components/Icon";
import { SaveButton } from "@/components/SaveButton";
import { formatPrice, isBookable, type Tour } from "@/data/tours";
import { scrollToY } from "@/lib/scroll";
import { POSTER_SIZES, posterGlow } from "@/lib/tour-poster";
import { hasNavigated } from "@/lib/ui";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState, type MouseEvent } from "react";

const ease = [0.22, 1, 0.36, 1] as const;

function ShareButton({ tour, className = "" }: { tour: Tour; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: tour.title, text: `${tour.title} · ${formatPrice(tour.price)}`, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* user dismissed the share sheet */
    }
  }

  return (
    <button type="button" onClick={share} aria-label="Хуваалцах" className={`relative ${className}`}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v6.5A2.5 2.5 0 0 0 7.5 21h9a2.5 2.5 0 0 0 2.5-2.5V12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <AnimatePresence>
        {copied ? (
          <motion.span
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-2.5 py-1 text-[0.68rem] font-semibold text-white"
          >
            Холбоос хуулагдлаа
          </motion.span>
        ) : null}
      </AnimatePresence>
    </button>
  );
}

/**
 * The poster on phones swipes through the gallery with native scroll-snap (dots below);
 * larger screens keep the single poster that tilts toward the cursor.
 */
function PhotoSwiper({ images, alt }: { images: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  return (
    <>
      <div
        onScroll={(e) => {
          const el = e.currentTarget;
          setIndex(Math.round(el.scrollLeft / el.clientWidth));
        }}
        className="hide-scrollbar absolute inset-0 flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain sm:overflow-hidden"
      >
        {images.map((src, i) => (
          <div key={src} className="relative h-full w-full shrink-0 snap-center">
            <Image src={src} alt={i === 0 ? alt : ""} fill priority={i === 0} className="object-cover" sizes={POSTER_SIZES} />
          </div>
        ))}
      </div>
      {images.length > 1 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:hidden" aria-hidden>
          {images.map((src, i) => (
            <span key={src} className={`h-1.5 rounded-full bg-white shadow transition-all duration-300 ${i === index ? "w-5" : "w-1.5 opacity-60"}`} />
          ))}
        </div>
      ) : null}
    </>
  );
}

/**
 * Tour page opener: details and price on the left, the full (uncropped) poster on the
 * right tilting toward the cursor, over a soft glow sampled from the poster itself.
 */
export function TourHero({ tour, onBook }: { tour: Tour; onBook: () => void }) {
  const rx = useSpring(useMotionValue(0), { stiffness: 160, damping: 18 });
  const ry = useSpring(useMotionValue(0), { stiffness: 160, damping: 18 });
  const bookable = isBookable(tour);
  // Opened from a link on the site, the page slides in like an iOS push, already composed;
  // the staged reveal is for arriving here directly
  const [enter] = useState(() => !hasNavigated());
  const from = <T,>(v: T) => (enter ? v : false);

  function tilt(e: MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 12);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 12);
  }

  function book() {
    const el = document.getElementById("book");
    // Desktop scrolls to the sidebar planner; phones (planner hidden) open the sheet
    if (el && el.offsetParent) scrollToY(el.getBoundingClientRect().top + window.scrollY - 110);
    else onBook();
  }

  const chips = [
    tour.dates && { icon: "calendar", text: tour.dates },
    { icon: "clock", text: tour.duration },
    tour.stay && { icon: "hotel", text: tour.stay },
    { icon: "plane", text: `${tour.departure ?? "Улаанбаатар"}-аас` },
  ].filter(Boolean) as { icon: IconName; text: string }[];

  return (
    <section className="relative isolate">
      {/* Ambient glow from the poster */}
      <div className="pointer-events-none absolute -inset-x-10 -top-24 bottom-0 -z-10 overflow-hidden opacity-40 [mask-image:linear-gradient(180deg,#000_30%,transparent)]">
        <Image src={posterGlow(tour.image)} alt="" fill unoptimized className="scale-125 object-cover" />
      </div>

      <div className="grid items-center gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
        {/* Poster */}
        <motion.div
          initial={from({ opacity: 0, y: 30, scale: 0.96 })}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease }}
          onMouseMove={tilt}
          onMouseLeave={() => {
            rx.set(0);
            ry.set(0);
          }}
          className="order-1 [perspective:1200px] lg:order-2"
        >
          <motion.div
            style={{ rotateX: rx, rotateY: ry }}
            className="relative mx-auto aspect-[4/3] w-full overflow-hidden rounded-[1.75rem] bg-[#cfe0db] shadow-[0_40px_90px_rgba(6,42,42,0.35)] sm:max-w-xl lg:aspect-[4/3.1]"
          >
            <Image src={posterGlow(tour.image)} alt="" fill unoptimized className="scale-110 object-cover" />
            <PhotoSwiper images={[tour.image, ...tour.gallery].slice(0, 8)} alt={tour.title} />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/15" />
            <div className="absolute right-3 top-3 flex gap-2">
              <ShareButton tour={tour} className="grid size-10 place-items-center rounded-full bg-white/90 text-ink shadow-sm backdrop-blur-md" />
              <SaveButton tourId={tour.id} className="size-10" />
            </div>
            {tour.discount ? (
              <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-white shadow">{tour.discount}</span>
            ) : null}
          </motion.div>
        </motion.div>

        {/* Details */}
        <div className="order-2 lg:order-1">
          <motion.div initial={from({ opacity: 0, y: 16 })} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className="flex flex-wrap items-center gap-2">
            <Link href={`/tours?dest=${tour.destinationKey}`} className="rounded-full bg-accent/10 px-3 py-1 type-label text-accent">
              {tour.destination}
            </Link>
            {tour.tag === "hot" ? <span className="inline-flex items-center gap-1 rounded-full bg-[#e8b86d]/25 px-3 py-1 text-[0.7rem] font-bold text-[#8a5a12] dark:text-[#f3d199]"><Icon name="fire" size={13} strokeWidth={2} /> Эрэлттэй</span> : null}
            {tour.status === "ended" ? <span className="rounded-full bg-ink px-3 py-1 text-[0.7rem] font-bold text-white">Дууссан аялал</span> : null}
            {tour.tag === "soon" ? <span className="rounded-full bg-ink px-3 py-1 text-[0.7rem] font-bold text-white">Тун удахгүй</span> : null}
          </motion.div>

          <h1 className="mt-4 overflow-hidden font-display text-[clamp(2.3rem,5vw,4.2rem)] font-semibold leading-[0.98] tracking-[-0.04em]">
            <motion.span className="block" initial={from({ y: "100%" })} animate={{ y: 0 }} transition={{ duration: 0.9, delay: 0.1, ease }}>
              {tour.title}
            </motion.span>
          </h1>
          <motion.p initial={from({ opacity: 0 })} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="mt-3 max-w-lg text-[0.95rem] leading-relaxed text-muted">
            {tour.story}
          </motion.p>

          <ul className="mt-5 flex flex-wrap gap-2">
            {chips.map((c, i) => (
              <motion.li
                key={c.text}
                initial={from({ opacity: 0, y: 10 })}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.06 }}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-bg-elevated/80 px-3 py-1.5 text-[0.8rem] backdrop-blur"
              >
                <Icon name={c.icon} size={15} className="text-accent" />
                {c.text}
              </motion.li>
            ))}
          </ul>

          <motion.div
            initial={from({ opacity: 0, y: 14 })}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.6, ease }}
            className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-4"
          >
            <div>
              <p className="text-xs text-muted">Үнэ / хүн</p>
              <div className="flex items-baseline gap-2">
                <span className="font-num text-[2.2rem] leading-none text-accent">{formatPrice(tour.price)}</span>
                {tour.oldPrice ? <span className="text-sm text-muted line-through">{formatPrice(tour.oldPrice)}</span> : null}
              </div>
            </div>
            {bookable ? (
              <button
                type="button"
                onClick={book}
                className="btn-shine inline-flex h-13 items-center gap-2 rounded-full bg-ink px-7 text-sm font-semibold text-white transition hover:-translate-y-0.5 active:scale-95"
              >
                Захиалах <span aria-hidden>→</span>
              </button>
            ) : (
              <a href="tel:+97690031771" className="inline-flex h-13 items-center rounded-full bg-ink px-7 text-sm font-semibold text-white">
                Лавлах · +976 9003 1771
              </a>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
