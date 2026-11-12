"use client";

import { Icon, type IconName } from "@/components/Icon";
import { FeaturedBanner } from "@/components/FeaturedBanner";
import { SaveButton } from "@/components/SaveButton";
import { formatPrice, getTour, isBookable, type TourSummary } from "@/data/tours";
import { useTours } from "@/lib/content";
import { daysUntil, departureOf } from "@/lib/dates";
import { useTraveller } from "@/lib/traveller-store";
import { hasNavigated, useClientValue, useReflow, useToday } from "@/lib/ui";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

const categories = [
  { key: "all", label: "Бүгд", icon: "sparkle" as IconName, match: () => true },
  { key: "beach", label: "Далай", icon: "beach" as IconName, match: (t: TourSummary) => t.destinationKey === "hainan" || t.destinationKey === "bali" },
  { key: "show", label: "Концерт · Шоу", icon: "mic" as IconName, match: (t: TourSummary) => t.id === "weeknd-world-tour" || t.id === "dately-show-hainan" },
  { key: "city", label: "Хот", icon: "city" as IconName, match: (t: TourSummary) => t.destinationKey === "hongkong" },
] as const;

function greeting(h: number) {
  if (h < 5) return "Сайхан амраарай";
  if (h < 12) return "Өглөөний мэнд";
  if (h < 18) return "Өдрийн мэнд";
  return "Оройн мэнд";
}

/** Phone home: an app-style start screen instead of the long desktop landing. */
export function MobileHome() {
  // The opening cascade is for the first screen of a visit; arriving from another page,
  // the route transition slides the screen in with everything already in place.
  // It is plain CSS so it plays from the first paint: with framer-motion the server sent the
  // screen at opacity 0 and the banner photo stayed invisible until the JavaScript had loaded.
  const [enter] = useState(() => !hasNavigated());
  const rise = (delay = 0, className = "") =>
    enter ? { className: `${className} enter-rise`, style: { animationDelay: `${delay}s` } } : { className };
  const tours = useTours();
  const open = useMemo(() => tours.filter(isBookable), [tours]);
  const { bookings } = useTraveller();
  const hello = useClientValue(() => greeting(new Date().getHours()), "Сайн байна уу");
  const [cat, setCat] = useState<(typeof categories)[number]["key"]>("all");
  const [q, setQ] = useState("");
  const reflow = useReflow(cat);
  const today = useToday();

  // Dated departures first (soonest leads), then open tours that go whenever the traveller picks
  // (Bali "Хүссэн үедээ", specials "огноог лавлана"), so the row never shrinks to a single card
  const upcoming = useMemo(() => {
    const withDays = open.map((t) => ({ t, days: daysUntil(t.dates) }));
    const dated = withDays.filter((x) => x.days != null && x.days >= 0).sort((a, b) => a.days! - b.days!);
    const flexible = withDays.filter((x) => x.days == null);
    return [...dated, ...flexible].slice(0, 4);
  }, [open]);

  const query = q.trim().toLowerCase();
  const results = query
    ? tours.filter((t) => `${t.title} ${t.destination} ${t.description}`.toLowerCase().includes(query))
    : [];
  const filtered = open.filter(categories.find((c) => c.key === cat)!.match);

  const next = bookings[0];
  const nextTour = next ? getTour(tours, next.tourId) : undefined;
  const nextDays = next ? daysUntil(next.date) : null;

  return (
    <div className="elite-home px-4 pb-10 pt-[calc(5.4rem+env(safe-area-inset-top))] sm:px-7 lg:px-10">
      <div className="elite-home-inner mx-auto max-w-6xl">
        <div className="elite-brand-row" aria-label="Elite Travel">
          <Image src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo%20%281%29-4GZqWXGhtzuMFJxs9QMY851y9DPb3E.png" alt="Elite Travel" width={180} height={180} unoptimized className="elite-brand-logo" />
          <div><span className="elite-brand-name">ELITE</span><span className="elite-brand-caption">TRAVEL · MONGOLIA</span></div>
          <span className="elite-brand-status"><span /> АЯЛАЛ ЭХЭЛНЭ</span>
        </div>
        <div {...rise(0, "elite-intro")}>
          <p className="elite-kicker">ТАНЫ ДАРААГИЙН ТҮҮХ ХААНААС ЭХЛЭХ ВЭ?</p>
          <p className="text-sm text-white/65">{hello}</p>
          <h1 className="mt-1 font-display text-[2.8rem] font-semibold leading-[0.98] tracking-[-0.04em] sm:text-6xl">
            Хаашаа <span className="italic text-[#c7b18b]">аялах</span> вэ?
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/65 sm:text-base">Мартагдашгүй мөчүүдийг мэдрэх аяллаа эндээс эхлүүлээрэй.</p>
        </div>

      {/* Search */}
      <div {...rise(0.06, "elite-search relative mt-6")}>
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
      </div>

      <AnimatePresence mode="wait" initial={false}>
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
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} {...rise(0.12)}>
            <FeaturedBanner />
            {/* Next trip */}
            {next && nextTour ? (
              <Link href="/bookings" className="relative mt-5 flex items-center gap-3 overflow-hidden rounded-2xl bg-[#062a2a] p-3 text-white active:scale-[0.98]">
                <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
                  <Image src={nextTour.image} alt="" fill className="object-cover" sizes="56px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="type-eyebrow text-[#7ef0e0]">Таны дараагийн аялал</p>
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
            <div className="elite-categories hide-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4">
              {categories.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setCat(c.key)}
                  className={`elite-category relative flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-semibold transition active:scale-95 ${cat === c.key ? "is-active text-white" : "border border-[var(--line)] bg-bg-elevated text-foam"}`}
                >
                  {cat === c.key ? <motion.span layoutId="m-cat" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
                  <span className="relative"><Icon name={c.icon} size={16} /></span>
                  <span className="relative">{c.label}</span>
                </button>
              ))}
            </div>

            {/* Upcoming departures */}
            {/* Day counts are the visitor's own today, so the row joins once the page runs in the browser */}
            {cat === "all" && today && upcoming.length ? (
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
                          {days == null ? (
                            t.dates?.includes("Хүссэн") ? "Хүссэн үедээ" : "Огноо лавлах"
                          ) : i === 0 && days > 0 ? (
                            <Countdown date={t.dates} days={days} />
                          ) : days === 0 ? (
                            "Өнөөдөр"
                          ) : (
                            `${days} хоногийн дараа`
                          )}
                        </span>
                        <SaveButton tourId={t.id} className="absolute right-3 top-3" />
                        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                          <p className="type-eyebrow truncate text-[#f3e0c2]">{days == null ? t.destination : `${t.destination} · ${t.dates}`}</p>
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
                  <p className="type-eyebrow">Урамшуулал</p>
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
              <motion.ul layout={reflow} className="mt-3 space-y-2.5">
                <AnimatePresence mode="popLayout" initial={enter}>
                  {filtered.map((t) => (
                    <motion.li key={t.id} layout={reflow} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
                      <Link href={`/tours/${t.id}`} className="elite-tour-card flex gap-3 rounded-2xl border border-[var(--line)] bg-bg-elevated p-2.5 active:scale-[0.98] active:bg-bg">
                        <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl">
                          <Image src={t.image} alt="" fill className="object-cover" sizes="96px" />
                          {t.discount ? (
                            <span className="absolute left-1.5 top-1.5 rounded-md bg-accent px-1.5 py-0.5 text-[0.6rem] font-bold text-white">{t.discount}</span>
                          ) : null}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col py-0.5">
                          <p className="type-label text-accent">{t.destination}</p>
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
                <Icon name="phone" size={17} /> Зөвлөгөө авах
              </a>
              <a href="https://ig.me/m/elitetravelmn" target="_blank" rel="noreferrer" className="flex h-14 items-center justify-center gap-2 rounded-2xl border border-[var(--line)] bg-bg-elevated text-sm font-semibold active:scale-95">
                Instagram DM
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}

const tickEverySecond = (onTick: () => void) => {
  const id = window.setInterval(onTick, 1000);
  return () => window.clearInterval(id);
};

/**
 * Live "6 хоног 14:22:05" to the soonest departure. Server and first paint show the plain day
 * count (no clock to disagree with); the seconds start once the page is running in the browser.
 */
function Countdown({ date, days }: { date?: string; days: number }) {
  // Whole seconds from a 1s ticker; null while rendering on the server and hydrating
  const now = useSyncExternalStore(tickEverySecond, () => Math.floor(Date.now() / 1000), () => null);

  const dep = departureOf(date);
  if (now == null || !dep) return <>{days} хоногийн дараа</>;
  const left = Math.max(0, Math.floor(dep.getTime() / 1000) - now);
  const two = (n: number) => String(n).padStart(2, "0");
  return (
    <span className="font-num tabular-nums" aria-label={`${Math.floor(left / 86400)} хоногийн дараа хөдөлнө`}>
      {Math.floor(left / 86400)} хоног {two(Math.floor(left / 3600) % 24)}:{two(Math.floor(left / 60) % 60)}:{two(left % 60)}
    </span>
  );
}
