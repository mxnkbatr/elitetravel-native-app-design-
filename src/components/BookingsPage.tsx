"use client";

import { bookingMessage } from "@/components/BookingPlanner";
import { EmptyState } from "@/components/EmptyState";
import { TourCard } from "@/components/TourCard";
import { formatPrice, getTour, isBookable } from "@/data/tours";
import { useTours } from "@/lib/content";
import { departureOf } from "@/lib/dates";
import { useTripSummaries } from "@/lib/trip-sync";
import { removeBooking, useTraveller, type BookingRequest } from "@/lib/traveller-store";
import { STATUS_LABEL, progressOf, type TripSummary } from "@/lib/trips";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";


function Countdown({ date }: { date?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // Client-only clock: first tick after mount keeps server and client markup identical
    const first = window.setTimeout(() => setNow(Date.now()), 0);
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, []);
  const dep = departureOf(date);
  if (!dep || now == null) return null;
  const days = Math.ceil((dep.getTime() - now) / 86400000);
  if (days < 0) return <span className="text-xs text-muted">Хөдөлсөн</span>;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8b86d]/20 px-2.5 py-1 text-xs font-semibold text-[#8a5a12] dark:text-[#f3d199]">
      <span className="size-1.5 animate-pulse rounded-full bg-[#e8b86d]" />
      {days === 0 ? "Өнөөдөр хөдөлнө" : `Хөдлөхөд ${days} хоног`}
    </span>
  );
}

const steps = ["Хүсэлт үүссэн", "Баг холбогдсон", "Баталгаажсан", "Төлбөр төлсөн"];

function BookingCard({ b, summary }: { b: BookingRequest; summary?: TripSummary }) {
  const tour = getTour(useTours(), b.tourId);
  const [copied, setCopied] = useState(false);
  if (!tour) return null;
  const filled = progressOf(summary?.status, summary?.paidAmount, summary?.total);

  const party = [`${b.adults} том хүн`, b.kidsOwnBed + b.kidsSharedBed ? `${b.kidsOwnBed + b.kidsSharedBed} хүүхэд` : ""]
    .filter(Boolean)
    .join(" · ");

  async function copy() {
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
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="epic-card grid overflow-hidden md:grid-cols-[280px_1fr]"
    >
      <Link href={`/tours/${tour.id}`} className="relative block aspect-[16/9] md:aspect-auto">
        <Image src={tour.image} alt={tour.title} fill className="object-cover" sizes="(max-width:768px) 100vw, 280px" />
        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[0.65rem] font-semibold text-white backdrop-blur-sm">
          {b.id}
          {summary ? ` · ${STATUS_LABEL[summary.status]}` : ""}
        </span>
      </Link>

      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="type-eyebrow text-accent">{tour.destination}</p>
            <h3 className="mt-1 font-display text-2xl font-semibold leading-tight">{tour.title}</h3>
            <p className="mt-1 text-sm text-muted">
              {[b.date, party, tour.duration].filter(Boolean).join(" · ")}
            </p>
          </div>
          <Countdown date={b.date} />
        </div>

        <ol className="mt-5 grid grid-cols-4 gap-1.5">
          {steps.map((s, i) => (
            <li key={s}>
              <div className={`h-1 rounded-full ${i < filled ? "bg-accent" : "bg-[var(--line)]"}`} />
              <p className={`mt-1.5 text-[0.62rem] leading-tight ${i < filled ? "font-semibold text-accent" : "text-muted"}`}>{s}</p>
            </li>
          ))}
        </ol>

        <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-[var(--line)] pt-4">
          <div>
            <p className="text-xs text-muted">Урьдчилсан дүн</p>
            <p className="font-num text-2xl font-semibold text-accent">{formatPrice(b.total)}</p>
            {b.deposit ? <p className="text-xs text-muted">Урьдчилгаа {formatPrice(b.deposit)}</p> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {b.token ? (
              <Link href={`/bookings/${b.id}`} className="relative inline-flex h-10 items-center rounded-full bg-accent px-4 text-sm font-semibold text-white">
                Нээх · чат, төлбөр
                {summary?.unread ? (
                  <span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-[#e8b86d] px-1 text-[0.65rem] font-bold leading-5 text-ink">{summary.unread}</span>
                ) : null}
              </Link>
            ) : (
              <a
                href="https://ig.me/m/elitetravelmn"
                target="_blank"
                rel="noreferrer"
                onClick={copy}
                className="inline-flex h-10 items-center rounded-full bg-accent px-4 text-sm font-semibold text-white"
              >
                {copied ? "Хуулсан — Instagram" : "Instagram-аар илгээх"}
              </a>
            )}
            <a href="tel:+97690031771" className="inline-flex h-10 items-center rounded-full border border-[var(--line)] px-4 text-sm font-medium">
              Залгах
            </a>
            <button
              type="button"
              onClick={() => removeBooking(b.id)}
              className="inline-flex h-10 items-center rounded-full px-3 text-sm text-muted transition hover:text-[#c2410c] dark:text-[#ff8f66]"
            >
              Устгах
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function BookingsPage() {
  const { saved, bookings } = useTraveller();
  const summaries = useTripSummaries();
  const [tab, setTab] = useState<"bookings" | "saved">("bookings");
  const tours = useTours();
  const savedTours = saved.map((id) => getTour(tours, id)).filter((t) => t != null);
  const suggestions = tours.filter((t) => isBookable(t) && !saved.includes(t.id)).slice(0, 3);

  const tabs = [
    { key: "bookings" as const, label: "Захиалгын хүсэлт", count: bookings.length },
    { key: "saved" as const, label: "Хадгалсан аялал", count: savedTours.length },
  ];

  return (
    <div className="space-y-8">
      <div className="inline-flex rounded-full border border-[var(--line)] bg-bg-elevated p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`relative rounded-full px-4 py-2 text-sm font-medium transition sm:px-5 ${tab === t.key ? "text-white" : "text-muted hover:text-foam"}`}
          >
            {tab === t.key ? (
              <motion.span layoutId="bookings-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
            ) : null}
            <span className="relative">
              {t.label} <span className="opacity-60">{t.count}</span>
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === "bookings" ? (
          <motion.div key="b" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            {bookings.length ? (
              <>
                <AnimatePresence>
                  {bookings.map((b) => (
                    <BookingCard key={b.id} b={b} summary={summaries[b.id]} />
                  ))}
                </AnimatePresence>
                <p className="text-xs leading-relaxed text-muted">
                  Хүсэлтүүд энэ төхөөрөмж дээр хадгалагдана. Төлөв, төлбөр, багтай чатлахыг “Нээх” дарж харна уу.
                </p>
              </>
            ) : (
              <EmptyState
                icon="ticket"
                title="Анхны аяллаа сонгох уу?"
                body="Аяллаа сонгоод хүн, өрөөгөө тохируулахад нийт дүн шууд гарна. Хэдхэн алхмаар хүсэлтээ илгээнэ."
                href="/tours"
                cta="Аялал сонгох"
              />
            )}
          </motion.div>
        ) : (
          <motion.div key="s" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {savedTours.length ? (
              <div className="hide-scrollbar flex flex-wrap gap-4">
                {savedTours.map((t) => (
                  <TourCard key={t.id} tour={t} />
                ))}
              </div>
            ) : (
              <EmptyState
                icon="heart"
                title="Мөрөөдлийн жагсаалтаа эхлүүлээрэй"
                body="Аяллын карт дээрх зүрхийг дарж хадгалаад, дараа нь эндээс харьцуулаарай."
                href="/tours"
                cta="Аяллууд үзэх"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {suggestions.length ? (
        <section className="pt-6">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">Танд санал болгох</h2>
          <div className="hide-scrollbar -mx-4 mt-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
            {suggestions.map((t) => (
              <TourCard key={t.id} tour={t} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

