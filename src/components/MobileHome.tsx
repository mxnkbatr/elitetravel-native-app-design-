"use client";

import { FeaturedBanner } from "@/components/FeaturedBanner";
import { SaveButton } from "@/components/SaveButton";
import { formatPrice, getTour, isBookable, type Tour } from "@/data/tours";
import { useTours } from "@/lib/content";
import { daysUntil } from "@/lib/dates";
import { useTraveller } from "@/lib/traveller-store";
import { useClientValue } from "@/lib/ui";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

const categories = [
  { key: "all", label: "Бүгд", icon: "✦", match: () => true },
  { key: "beach", label: "Далай", icon: "🏝", match: (t: Tour) => t.destinationKey === "hainan" || t.destinationKey === "bali" },
  { key: "show", label: "Концерт · Шоу", icon: "🎤", match: (t: Tour) => t.id === "weeknd-world-tour" || t.id === "dately-show-hainan" },
  { key: "city", label: "Хот", icon: "🌆", match: (t: Tour) => t.destinationKey === "hongkong" },
] as const;

function greeting(h: number) {
  if (h < 5) return "Сайхан амраарай";
  if (h < 12) return "Өглөөний мэнд";
  if (h < 18) return "Өдрийн мэнд";
  return "Оройн мэнд";
}

const rise = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

/** Phone home: an app-style start screen instead of the long desktop landing. */
export function MobileHome() {
  const tours = useTours();
  const open = useMemo(() => tours.filter(isBookable), [tours]);
  const { bookings } = useTraveller();
  const hello = useClientValue(() => greeting(new Date().getHours()), "Сайн байна уу");
  const [cat, setCat] = useState<(typeof categories)[number]["key"]>("all");
  const [q, setQ] = useState("");

  const upcoming = useMemo(
    () =>
      open
        .map((t) => ({ t, days: daysUntil(t.dates) }))
        .filter((x): x is { t: Tour; days: number } => x.days != null && x.days >= 0)
        .sort((a, b) => a.days - b.days),
    [open],
  );

  const query = q.trim().toLowerCase();
  const results = query
    ? tours.filter((t) => `${t.title} ${t.destination} ${t.description}`.toLowerCase().includes(query))
    : [];
  const filtered = open.filter(categories.find((c) => c.key === cat)!.match);

  const next = bookings[0];
  const nextTour = next ? getTour(tours, next.tourId) : undefined;
  const nextDays = next ? daysUntil(next.date) : null;

  return (
    <div className="px-4 pb-8 pt-[calc(5.4rem+env(safe-area-inset-top))]">
      <motion.div {...rise} transition={{ duration: 0.5 }}>
        <p className="text-sm text-muted">{hello} 👋</p>
        <h1 className="mt-1 font-display text-[2.6rem] font-semibold leading-[0.95] tracking-[-0.04em]">
          Хаашаа <span className="italic text-accent">явах</span> вэ?
        </h1>
      </motion.div>

      {/* Search */}
      <motion.div {...rise} transition={{ delay: 0.06, duration: 0.5 }} className="relative mt-5">
        <svg className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Хайнань, Бали, концерт…"
          enterKeyHint="search"
          className="h-13 w-full rounded-2xl border border-[var(--line)] bg-bg-elevated pl-11 pr-10 text-[0.95rem] shadow-[0_8px_24px_rgba(6,42,42,0.06)] outline-none transition focus:border-accent"
        />
        {q ? (
          <button type="button" onClick={() => setQ("")} aria-label="Цэвэрлэх" className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full bg-bg text-muted">
            ×
          </button>
        ) : null}
      </motion.div>

      <AnimatePresence mode="wait">
        {query ? (
          <motion.ul key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-3 overflow-hidden rounded-2xl border border-[var(--line)] bg-bg-elevated">
            {results.length ? (
              results.map((t) => (
                <li key={t.id} className="border-b border-[var(--line)] last:border-0">
                  <Link href={`/tours/${t.id}`} className="flex items-center gap-3 p-3 active:bg-bg">
                    <div className="relative size-12 shrink-0 overflow-hidden rounded-xl">
                      <Image src={t.image} alt="" fill className="object-cover" sizes="48px" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{t.title}</p>
                      <p className="truncate text-xs text-muted">{t.destination} · {t.duration}</p>
                    </div>
                    <span className="font-num text-sm text-accent">{formatPrice(t.price)}</span>
                  </Link>
                </li>
              ))
            ) : (
              <li className="p-4 text-sm text-muted">“{q}” олдсонгүй.</li>
            )}
          </motion.ul>
        ) : (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <FeaturedBanner />
            {/* Next trip */}
            {next && nextTour ? (
              <Link href="/bookings" className="relative mt-5 flex items-center gap-3 overflow-hidden rounded-2xl bg-[#062a2a] p-3 text-white active:scale-[0.98]">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
                  <Image src={nextTour.image} alt="" fill className="object-cover" sizes="56px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#7ef0e0]">Таны дараагийн аялал</p>
                  <p className="truncate font-semibold">{nextTour.title}</p>
                  <p className="text-xs text-white/60">{next.date ?? nextTour.dates}</p>
                </div>
                {nextDays != null && nextDays >= 0 ? (
                  <div className="shrink-0 rounded-xl bg-white/10 px-3 py-2 text-center">
                    <p className="font-num text-xl leading-none text-[#e8b86d]">{nextDays}</p>
                    <p className="mt-0.5 text-[0.55rem] uppercase tracking-[0.12em] text-white/60">хоног</p>
                  </div>
                ) : null}
              </Link>
            ) : null}

            {/* Categories */}
            <div className="hide-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4">
              {categories.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCat(c.key)}
                  className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition active:scale-95 ${
                    cat === c.key ? "text-white" : "border border-[var(--line)] bg-bg-elevated text-foam"
                  }`}
                >
                  {cat === c.key ? <motion.span layoutId="m-cat" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
                  <span className="relative">{c.icon}</span>
                  <span className="relative">{c.label}</span>
                </button>
              ))}
            </div>

            {/* Upcoming departures */}
            {cat === "all" && upcoming.length ? (
              <section className="mt-7">
                <div className="flex items-baseline justify-between">
                  <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">Удахгүй хөдлөх</h2>
                  <Link href="/tours" className="text-sm font-semibold text-accent">Бүгд</Link>
                </div>
                <div className="hide-scrollbar -mx-4 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
                  {upcoming.map(({ t, days }, i) => (
                    <motion.div key={t.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }} className="w-[72vw] shrink-0 snap-start">
                      <Link href={`/tours/${t.id}`} className="relative block aspect-[4/5] overflow-hidden rounded-[1.5rem] active:scale-[0.98]">
                        <Image src={t.image} alt={t.title} fill className="object-cover" sizes="72vw" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[0.7rem] font-semibold text-ink">
                          <span className="size-1.5 animate-pulse rounded-full bg-[#e8b86d]" />
                          {days === 0 ? "Өнөөдөр" : `${days} хоногийн дараа`}
                        </span>
                        <SaveButton tourId={t.id} className="absolute right-3 top-3" />
                        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#f3e0c2]">{t.destination} · {t.dates}</p>
                          <p className="mt-1 font-display text-2xl font-semibold leading-tight">{t.title}</p>
                          <p className="mt-2 font-num text-lg text-[#f3d199]">{formatPrice(t.price)}</p>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </section>
            ) : null}

            {/* Promo */}
            {cat === "all" ? (
              <Link href="/tours/bali" className="relative mt-7 flex items-center justify-between gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-[#e8b86d] to-[#f3d199] p-4 text-ink active:scale-[0.98]">
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.2em]">Урамшуулал</p>
                  <p className="mt-0.5 font-display text-xl font-semibold leading-tight">Бали −8% · огноогоо өөрөө сонго</p>
                </div>
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-ink text-white">→</span>
              </Link>
            ) : null}

            {/* All open tours, compact */}
            <section className="mt-7">
              <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">
                {cat === "all" ? "Бүх аялал" : categories.find((c) => c.key === cat)!.label}
              </h2>
              <motion.ul layout className="mt-3 space-y-2.5">
                <AnimatePresence mode="popLayout">
                  {filtered.map((t) => (
                    <motion.li key={t.id} layout initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
                      <Link href={`/tours/${t.id}`} className="flex gap-3 rounded-2xl border border-[var(--line)] bg-bg-elevated p-2.5 active:scale-[0.98] active:bg-bg">
                        <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl">
                          <Image src={t.image} alt="" fill className="object-cover" sizes="96px" />
                          {t.discount ? (
                            <span className="absolute left-1.5 top-1.5 rounded-md bg-accent px-1.5 py-0.5 text-[0.6rem] font-bold text-white">{t.discount}</span>
                          ) : null}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col py-0.5">
                          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-accent">{t.destination}</p>
                          <p className="mt-0.5 line-clamp-2 font-semibold leading-snug">{t.title}</p>
                          <p className="mt-auto text-xs text-muted">{t.duration}</p>
                          <div className="flex items-baseline gap-2">
                            <span className="font-num text-base text-accent">{formatPrice(t.price)}</span>
                            {t.oldPrice ? <span className="text-xs text-muted line-through">{formatPrice(t.oldPrice)}</span> : null}
                          </div>
                        </div>
                      </Link>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </motion.ul>
            </section>

            {/* Help */}
            <div className="mt-7 grid grid-cols-2 gap-2">
              <a href="tel:+97690031771" className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-ink text-sm font-semibold text-white active:scale-95">
                ☏ Зөвлөгөө авах
              </a>
              <a href="https://ig.me/m/elitetravelmn" target="_blank" rel="noreferrer" className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-bg-elevated text-sm font-semibold active:scale-95">
                Instagram DM
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
