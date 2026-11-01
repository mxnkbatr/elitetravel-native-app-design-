"use client";

import { bookingMessage } from "@/components/BookingPlanner";
import { MobileTitle } from "@/components/MobileTitle";
import { SaveButton } from "@/components/SaveButton";
import { formatPrice, getTour, isBookable } from "@/data/tours";
import { useTours } from "@/lib/content";
import { daysUntil } from "@/lib/dates";
import { useTripSummaries } from "@/lib/trip-sync";
import { removeBooking, useTraveller, type BookingRequest } from "@/lib/traveller-store";
import { useClientValue } from "@/lib/ui";
import { STATUS_LABEL, progressOf, type TripSummary } from "@/lib/trips";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const steps = ["Хүсэлт", "Холбогдсон", "Баталгаажсан", "Төлсөн"];

/** Arrival airports per the itineraries: Haikou (Meilan), Hong Kong, Denpasar. */
const airport: Partial<Record<string, string>> = { hainan: "HAK", hongkong: "HKG", bali: "DPS" };

/** Boarding-pass style card for one booking request. */
function Ticket({ b, index, summary }: { b: BookingRequest; index: number; summary?: TripSummary }) {
  const tour = getTour(useTours(), b.tourId);
  const filled = progressOf(summary?.status, summary?.paidAmount, summary?.total);
  // Depends on today's date, so only the browser computes it
  const days = useClientValue(() => daysUntil(b.date) ?? null, null);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!confirmDelete) return;
    const id = window.setTimeout(() => setConfirmDelete(false), 2500);
    return () => window.clearTimeout(id);
  }, [confirmDelete]);

  if (!tour) return null;
  const people = b.adults + b.kidsOwnBed + b.kidsSharedBed;

  async function send() {
    try {
      await navigator.clipboard.writeText(bookingMessage(tour!, b));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 24, rotate: -1 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      exit={{ opacity: 0, x: -80, transition: { duration: 0.25 } }}
      transition={{ delay: index * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-[1.6rem] bg-bg-elevated shadow-[0_14px_40px_rgba(6,42,42,0.12)]"
    >
      {/* Photo header */}
      <Link href={`/tours/${tour.id}`} className="relative block h-36">
        <Image src={tour.image} alt="" fill className="object-cover" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#062a2a] via-[#062a2a]/30 to-transparent" />
        <span className="absolute left-3.5 top-3.5 rounded-full bg-black/40 px-2.5 py-1 text-[0.62rem] font-semibold text-white backdrop-blur-md">
          {b.id}
          {summary ? ` · ${STATUS_LABEL[summary.status]}` : ""}
        </span>
        {days != null && days >= 0 ? (
          <div className="absolute right-3.5 top-3.5 rounded-2xl bg-white/95 px-3 py-1.5 text-center">
            <p className="font-num text-2xl leading-none text-ink">{days}</p>
            <p className="text-[0.55rem] font-semibold uppercase tracking-[0.1em] text-muted">{days === 0 ? "өнөөдөр" : "хоног"}</p>
          </div>
        ) : null}
        <p className="absolute inset-x-3.5 bottom-3 truncate font-display text-2xl font-semibold text-white">{tour.title}</p>
      </Link>

      {/* Route */}
      <div className="flex items-center gap-3 px-4 pt-4">
        <div>
          <p className="font-num text-lg leading-none">ULN</p>
          <p className="mt-0.5 text-[0.65rem] text-muted">Улаанбаатар</p>
        </div>
        <div className="relative flex-1">
          <div className="h-px border-t border-dashed border-[var(--line)]" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90 bg-bg-elevated px-1 text-accent">✈</span>
        </div>
        <div className="text-right">
          <p className="font-num text-lg leading-none">{airport[tour.destinationKey] ?? "—"}</p>
          <p className="mt-0.5 text-[0.65rem] text-muted">{tour.destination}</p>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-2 px-4 pt-3 text-[0.7rem]">
        <div>
          <dt className="text-muted">Огноо</dt>
          <dd className="mt-0.5 font-semibold">{b.date ?? "Лавлах"}</dd>
        </div>
        <div>
          <dt className="text-muted">Хүн</dt>
          <dd className="mt-0.5 font-semibold">{people} хүн</dd>
        </div>
        <div className="text-right">
          <dt className="text-muted">Хугацаа</dt>
          <dd className="mt-0.5 font-semibold">{tour.duration.split("·")[0]}</dd>
        </div>
      </dl>

      {/* Perforation */}
      <div className="relative my-4 flex items-center">
        <span className="-ml-3 size-6 shrink-0 rounded-full bg-bg" />
        <span className="h-px flex-1 border-t-2 border-dotted border-[var(--line)]" />
        <span className="-mr-3 size-6 shrink-0 rounded-full bg-bg" />
      </div>

      <div className="px-4 pb-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[0.65rem] text-muted">Урьдчилсан дүн</p>
            <p className="font-num text-2xl leading-tight text-accent">{formatPrice(b.total)}</p>
            {b.deposit ? <p className="text-[0.7rem] text-muted">Урьдчилгаа {formatPrice(b.deposit)}</p> : null}
          </div>
          <div className="flex gap-1">
            {steps.map((s, i) => (
              <span key={s} title={s} className={`h-1.5 w-5 rounded-full ${i < filled ? "bg-accent" : "bg-[var(--line)]"}`} />
            ))}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto_auto] gap-2">
          {b.token ? (
            <Link
              href={`/bookings/${b.id}`}
              className="relative flex h-12 items-center justify-center rounded-2xl bg-accent text-sm font-semibold text-white active:scale-[0.97]"
            >
              Нээх · чат, төлбөр
              {summary?.unread ? (
                <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[#e8b86d] px-1 text-[0.65rem] font-bold leading-5 text-ink">{summary.unread}</span>
              ) : null}
            </Link>
          ) : (
            <a
              href="https://ig.me/m/elitetravelmn"
              target="_blank"
              rel="noreferrer"
              onClick={send}
              className="flex h-12 items-center justify-center rounded-2xl bg-accent text-sm font-semibold text-white active:scale-[0.97]"
            >
              {copied ? "Хуулсан ✓ — Instagram" : "Багт илгээх"}
            </a>
          )}
          <a href="tel:+97690031771" aria-label="Залгах" className="grid size-12 place-items-center rounded-2xl bg-bg text-lg active:scale-95">
            ☏
          </a>
          <button
            type="button"
            aria-label="Устгах"
            onClick={() => (confirmDelete ? removeBooking(b.id) : setConfirmDelete(true))}
            className={`grid h-12 place-items-center rounded-2xl px-3 text-sm font-semibold transition active:scale-95 ${
              confirmDelete ? "bg-[#c2410c] text-white" : "bg-bg text-muted"
            }`}
          >
            {confirmDelete ? "Устгах?" : "🗑"}
          </button>
        </div>
      </div>
    </motion.article>
  );
}

/** Phone "My trips": segmented control, ticket cards and a saved-tours grid. */
export function MobileBookings() {
  const { saved, bookings } = useTraveller();
  const summaries = useTripSummaries();
  const [tab, setTab] = useState<"bookings" | "saved">("bookings");
  const tours = useTours();
  const savedTours = saved.map((id) => getTour(tours, id)).filter((t) => t != null);
  const ideas = tours.filter((t) => isBookable(t) && !saved.includes(t.id)).slice(0, 4);

  return (
    <div className="px-4 pb-8">
      <MobileTitle title="Миний аялал" sub={bookings.length ? `${bookings.length} хүсэлт · ${savedTours.length} хадгалсан` : "Хүсэлт болон хадгалсан аяллууд"} />

      <div className="sticky top-[calc(0.5rem+env(safe-area-inset-top))] z-30 -mx-4 mt-5 bg-gradient-to-b from-bg via-bg/95 to-bg/0 px-4 pb-3 pt-1">
        <div className="grid grid-cols-2 rounded-2xl bg-ink/[0.06] p-1">
          {(
            [
              ["bookings", "Хүсэлтүүд", bookings.length],
              ["saved", "Хадгалсан", savedTours.length],
            ] as const
          ).map(([key, label, n]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`relative rounded-xl py-2.5 text-sm font-semibold transition-colors ${tab === key ? "text-foam" : "text-muted"}`}
            >
              {tab === key ? (
                <motion.span layoutId="mb-seg" className="absolute inset-0 rounded-xl bg-bg-elevated shadow-sm" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
              ) : null}
              <span className="relative">
                {label} <span className="font-num text-xs opacity-60">{n}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {tab === "bookings" ? (
          <motion.div key="b" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
            {bookings.length ? (
              <>
                <AnimatePresence>
                  {bookings.map((b, i) => (
                    <Ticket key={b.id} b={b} index={i} summary={summaries[b.id]} />
                  ))}
                </AnimatePresence>
                <p className="px-1 text-[0.7rem] leading-relaxed text-muted">
                  Хүсэлтүүд энэ утсанд хадгалагдана. Төлөв, төлбөр, багтай чатлахыг “Нээх” дарж харна уу.
                </p>
              </>
            ) : (
              <EmptyState icon="🎫" title="Хүсэлт алга" body="Аяллаа сонгоод “Захиалах” дарж хүсэлт үүсгээрэй." href="/tours" cta="Аялал сонгох" />
            )}
          </motion.div>
        ) : (
          <motion.div key="s" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            {savedTours.length ? (
              <div className="grid grid-cols-2 gap-3">
                {savedTours.map((t, i) => (
                  <motion.div key={t.id} initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.04 }}>
                    <Link href={`/tours/${t.id}`} className="relative block aspect-[3/4] overflow-hidden rounded-2xl active:scale-[0.97]">
                      <Image src={t.image} alt="" fill className="object-cover" sizes="50vw" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                      <SaveButton tourId={t.id} className="absolute right-2 top-2 size-8" />
                      <div className="absolute inset-x-0 bottom-0 p-3 text-white">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug">{t.title}</p>
                        <p className="mt-1 font-num text-sm text-[#f3d199]">{formatPrice(t.price)}</p>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <EmptyState icon="♡" title="Хадгалсан аялал алга" body="Аяллын зурган дээрх ♡ дарж хадгалаарай." href="/tours" cta="Аялал үзэх" />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {ideas.length ? (
        <section className="mt-8">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.03em]">Танд таалагдаж магадгүй</h2>
          <div className="hide-scrollbar -mx-4 mt-3 flex snap-x gap-3 overflow-x-auto px-4 pb-1">
            {ideas.map((t) => (
              <Link key={t.id} href={`/tours/${t.id}`} className="w-[60vw] shrink-0 snap-start active:scale-[0.98]">
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
                  <Image src={t.image} alt="" fill className="object-cover" sizes="60vw" />
                </div>
                <p className="mt-2 truncate text-sm font-semibold">{t.title}</p>
                <p className="font-num text-sm text-accent">{formatPrice(t.price)}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function EmptyState({ icon, title, body, href, cta }: { icon: string; title: string; body: string; href: string; cta: string }) {
  return (
    <div className="grid place-items-center rounded-[1.6rem] border border-dashed border-[var(--line)] bg-bg-elevated px-6 py-12 text-center">
      <motion.div
        animate={{ y: [0, -6, 0], rotate: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="grid size-16 place-items-center rounded-full bg-accent-mist text-2xl"
        aria-hidden
      >
        {icon}
      </motion.div>
      <p className="mt-4 font-display text-2xl font-semibold">{title}</p>
      <p className="mt-1.5 text-sm text-muted">{body}</p>
      <Link href={href} className="mt-5 inline-flex h-11 items-center rounded-full bg-accent px-6 text-sm font-semibold text-white active:scale-95">
        {cta} →
      </Link>
    </div>
  );
}
