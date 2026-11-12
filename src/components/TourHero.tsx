"use client";

import { Icon, type IconName } from "@/components/Icon";
import { SaveButton } from "@/components/SaveButton";
import { formatPrice, fromPrice, isBookable, tourDates, type Tour } from "@/data/tours";
import { scrollToY } from "@/lib/scroll";
import { POSTER_SIZES, posterGlow } from "@/lib/tour-poster";
import { isUnderway } from "@/lib/dates";
import { hasNavigated, useClientValue } from "@/lib/ui";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState, type MouseEvent } from "react";


function ShareButton({ tour, className = "" }: { tour: Tour; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: tour.title, text: `${tour.title} · ${formatPrice(fromPrice(tour))}`, url });
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
          <div key={`${src}-${i}`} className="relative h-full w-full shrink-0 snap-center">
            <Image src={src} alt={i === 0 ? alt : ""} fill preload={i === 0} fetchPriority={i === 0 ? "high" : undefined} className="object-cover" sizes={POSTER_SIZES} />
          </div>
        ))}
      </div>
      {images.length > 1 ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5 sm:hidden" aria-hidden>
          {images.map((src, i) => (
            <span key={`${src}-${i}`} className={`h-1.5 rounded-full bg-white shadow transition-all duration-300 ${i === index ? "w-5" : "w-1.5 opacity-60"}`} />
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
  // Closed for booking once the group has left, but "ended" only after it is back (the visitor's own date)
  const underway = useClientValue(() => tour.status === "ended" && isUnderway(tour.dates), false);
  // Opened from a link on the site, the page slides in like an iOS push, already composed;
  // the staged reveal is for arriving here directly. It is CSS so it plays from the first paint:
  // a link from an ad lands here cold, and framer-motion kept the page blank until hydration.
  const [enter] = useState(() => !hasNavigated());
  const reveal = (delay: number, className = "", kind = "enter-rise") =>
    enter ? { className: `${className} ${kind}`, style: { animationDelay: `${delay}s` } } : { className };

  function tilt(e: MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    ry.set(((e.clientX - r.left) / r.width - 0.5) * 12);
    rx.set(-((e.clientY - r.top) / r.height - 0.5) * 12);
  }

  function book() {
    const el = document.getElementById("book");
    // Desktop: scroll to the sidebar calendar. Phone: open the booking sheet.
    if (el && el.offsetParent) scrollToY(el.getBoundingClientRect().top + window.scrollY - 110);
    else onBook();
  }

  const dateParts = tourDates(tour);
  const datesLabel =
    dateParts.length > 1 ? `${dateParts.length} огноо · ${dateParts[0]}-аас` : dateParts[0];
  const chips = [
    datesLabel && { icon: "calendar", text: datesLabel },
    { icon: "clock", text: tour.duration },
    tour.stay && { icon: "hotel", text: tour.stay },
    { icon: "plane", text: "Улаанбаатараас" },
  ].filter(Boolean) as { icon: IconName; text: string }[];

  return (
    <section className="relative isolate">
      {/* Ambient glow from the poster */}
      <div className="pointer-events-none absolute -inset-x-10 -top-24 bottom-0 -z-10 overflow-hidden opacity-40 [mask-image:linear-gradient(180deg,#000_30%,transparent)]">
        <Image src={posterGlow(tour.image)} alt="" fill unoptimized className="scale-125 object-cover" />
      </div>

      <div className="grid items-center gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
        {/* Poster */}
        <div
          {...reveal(0, "order-1 [perspective:1200px] lg:order-2", "enter-poster")}
          onMouseMove={tilt}
          onMouseLeave={() => {
            rx.set(0);
            ry.set(0);
          }}
        >
          <motion.div
            style={{ rotateX: rx, rotateY: ry }}
            className="relative mx-auto aspect-[4/3] w-full overflow-hidden rounded-[1.75rem] bg-[#cfe0db] shadow-[0_40px_90px_rgba(6,42,42,0.35)] max-sm:-mx-4 max-sm:aspect-[4/4.6] max-sm:w-[calc(100%+2rem)] max-sm:max-w-none max-sm:rounded-none max-sm:rounded-b-[2.25rem] max-sm:shadow-[0_24px_50px_rgba(6,42,42,0.22)] sm:max-w-xl lg:aspect-[4/3.1]"
          >
            <Image src={posterGlow(tour.image)} alt="" fill unoptimized className="scale-110 object-cover" />
            <PhotoSwiper
              images={[...new Set([tour.image, ...tour.gallery])].filter(Boolean).slice(0, 8)}
              alt={tour.title}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/15" />
            <div className="absolute right-3 top-3 flex gap-2 max-sm:right-4 max-sm:top-[calc(0.75rem+env(safe-area-inset-top))]">
              <ShareButton tour={tour} className="grid size-10 place-items-center rounded-full bg-white/90 text-ink shadow-sm backdrop-blur-md" />
              <SaveButton tourId={tour.id} className="size-10" />
            </div>
            {tour.discount ? (
              <span className="absolute left-3 top-3 rounded-full bg-accent px-3 py-1.5 text-xs font-bold text-white shadow max-sm:bottom-9 max-sm:left-4 max-sm:top-auto">{tour.discount}</span>
            ) : null}
          </motion.div>
        </div>

        {/* Details */}
        <div className="order-2 lg:order-1">
          <div {...reveal(0, "flex flex-wrap items-center gap-2")}>
            <Link href={`/tours?dest=${tour.destinationKey}`} className="rounded-full bg-accent/10 px-3 py-1 type-label text-accent">
              {tour.destination}
            </Link>
            {tour.tag === "hot" ? <span className="inline-flex items-center gap-1 rounded-full bg-[#e8b86d]/25 px-3 py-1 text-[0.7rem] font-bold text-[#8a5a12] dark:text-[#f3d199]"><Icon name="fire" size={13} strokeWidth={2} /> Эрэлттэй</span> : null}
            {tour.status === "ended" ? (
              <span className="rounded-full bg-ink px-3 py-1 text-[0.7rem] font-bold text-white">{underway ? "Аялал явагдаж байна" : "Дууссан аялал"}</span>
            ) : null}
            {tour.tag === "soon" ? <span className="rounded-full bg-ink px-3 py-1 text-[0.7rem] font-bold text-white">Тун удахгүй</span> : null}
          </div>

          <h1 className="mt-4 overflow-hidden font-display text-[clamp(2.3rem,5vw,4.2rem)] font-semibold leading-[0.98] tracking-[-0.04em]">
            <span {...reveal(0.1, "block", "enter-slide-up")}>{tour.title}</span>
          </h1>
          <p {...reveal(0.35, "mt-3 max-w-lg text-[0.95rem] leading-relaxed text-muted", "enter-fade")}>{tour.story}</p>

          {/* Phone: native-style fact cards in two columns; larger screens keep the pill row */}
          <ul className="mt-5 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap sm:gap-2">
            {chips.map((c, i) => (
              <li
                key={c.text}
                {...reveal(
                  0.4 + i * 0.06,
                  "flex min-w-0 items-center gap-2.5 rounded-2xl border border-[var(--line)] bg-bg-elevated p-2.5 text-[0.8rem] font-semibold leading-tight shadow-[0_6px_18px_rgba(6,42,42,0.05)] sm:inline-flex sm:gap-1.5 sm:rounded-full sm:bg-bg-elevated/80 sm:px-3 sm:py-1.5 sm:font-normal sm:shadow-none sm:backdrop-blur",
                )}
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent sm:size-auto sm:bg-transparent">
                  <Icon name={c.icon} size={16} />
                </span>
                <span className="line-clamp-2 min-w-0">{c.text}</span>
              </li>
            ))}
          </ul>

          <div {...reveal(0.55, "mt-6 flex flex-wrap items-end gap-x-6 gap-y-4")}>
            <div>
              <p className="text-xs text-muted">{tour.datePrices && Object.keys(tour.datePrices).length ? "Үнэ / хүн · огнооноос хамаарна" : "Үнэ / хүн"}</p>
              <div className="flex items-baseline gap-2">
                <span className="font-num text-[2.2rem] leading-none text-accent">
                  {formatPrice(fromPrice(tour))}
                  {tour.datePrices && Object.values(tour.datePrices).some((d) => d.price !== tour.price) ? (
                    <span className="ml-1 text-base font-medium text-muted">-аас</span>
                  ) : null}
                </span>
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
          </div>
        </div>
      </div>
    </section>
  );
}
