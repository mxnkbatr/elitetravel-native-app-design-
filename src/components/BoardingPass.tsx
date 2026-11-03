"use client";

import { Icon } from "@/components/Icon";
import { formatPrice, type TourSummary } from "@/data/tours";
import type { BookingRequest } from "@/lib/traveller-store";
import { motion, useReducedMotion } from "framer-motion";
import { useMemo, useState } from "react";

/** Arrival airports per the itineraries: Haikou (Meilan), Hong Kong, Denpasar. */
const AIRPORT: Partial<Record<string, string>> = { hainan: "HAK", hongkong: "HKG", bali: "DPS" };
const CONFETTI = ["#e8b86d", "#14b8a6", "#f3d199", "#ff7a59", "#7ef0e0", "#ffffff"];

/** A burst of paper pieces from behind the pass — once, and not for reduced motion. */
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const angle = (i / 28) * Math.PI * 2 + (i % 3) * 0.2;
        const dist = 110 + ((i * 37) % 90);
        return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 60, rotate: (i * 47) % 360, color: CONFETTI[i % CONFETTI.length], round: i % 4 === 0 };
      }),
    [],
  );
  return (
    <div className="pointer-events-none absolute left-1/2 top-16 z-20" aria-hidden>
      {pieces.map((p, i) => (
        <motion.span
          key={i}
          className={`absolute block ${p.round ? "size-2 rounded-full" : "h-2.5 w-1.5 rounded-[1px]"}`}
          style={{ background: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 0.6 }}
          animate={{ x: p.x, y: [0, p.y, p.y + 140], opacity: [1, 1, 0], rotate: p.rotate + 360, scale: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1], times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  );
}

/**
 * What the traveller sees after sending a booking: a boarding-pass style card with their trip,
 * request number and total — made to be screenshotted or shared.
 */
export function BoardingPass({ tour, booking, state }: { tour: TourSummary; booking: BookingRequest; state: "sent" | "waitlist" | "offline" }) {
  const reduce = useReducedMotion();
  const [shared, setShared] = useState(false);
  const people = booking.adults + booking.kidsOwnBed + booking.kidsSharedBed;
  const to = AIRPORT[tour.destinationKey] ?? "✦";
  const headline = state === "offline" ? "Хүсэлт бэлэн боллоо" : state === "waitlist" ? "Хүлээлгийн жагсаалтад орлоо" : "Аялал тань эхэллээ!";

  async function share() {
    const text = `${tour.title} аялалд хүсэлт илгээлээ ✈️ ${booking.date ?? ""}`.trim();
    const url = `${location.origin}/tours/${tour.id}`;
    try {
      if (navigator.share) await navigator.share({ title: tour.title, text, url });
      else {
        await navigator.clipboard.writeText(`${text}\n${url}`);
        setShared(true);
      }
    } catch {
      /* closed the share sheet */
    }
  }

  return (
    <div className="relative">
      {!reduce && state !== "offline" ? <Confetti /> : null}

      <motion.div
        initial={reduce ? false : { y: 40, opacity: 0, rotateX: 25 }}
        animate={{ y: 0, opacity: 1, rotateX: 0 }}
        transition={{ type: "spring", stiffness: 160, damping: 18 }}
        style={{ transformPerspective: 900 }}
        className="relative overflow-hidden rounded-[1.6rem] bg-[#062a2a] text-white shadow-[0_24px_60px_rgba(6,42,42,0.35)]"
      >
        <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#14b8a6]/25 blur-3xl" aria-hidden />

        <div className="relative px-5 pt-5">
          <div className="flex items-center justify-between">
            <span className="type-label text-[#7ef0e0]">Elite Travel · Boarding pass</span>
            <motion.span
              initial={reduce ? false : { scale: 0, rotate: -40 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.35, type: "spring", stiffness: 260, damping: 14 }}
              className="grid size-8 place-items-center rounded-full bg-[#e8b86d] text-ink"
            >
              <Icon name="check" size={16} strokeWidth={2.6} />
            </motion.span>
          </div>
          <p className="type-subtitle mt-3">{headline}</p>
          <p className="mt-0.5 truncate text-sm text-white/70">{tour.title}</p>

          <div className="mt-5 flex items-center gap-3">
            <div>
              <p className="font-num text-3xl leading-none">ULN</p>
              <p className="mt-1 text-[0.65rem] text-white/60">Улаанбаатар</p>
            </div>
            <div className="relative flex-1">
              <div className="h-px border-t border-dashed border-white/30" />
              <motion.span
                className="absolute top-1/2 -translate-y-1/2 text-[#e8b86d]"
                initial={reduce ? false : { left: "0%" }}
                animate={{ left: "calc(100% - 18px)" }}
                transition={{ delay: 0.4, duration: 1.4, ease: [0.65, 0, 0.35, 1] }}
              >
                <Icon name="plane" size={18} className="rotate-90" fill="currentColor" stroke="none" />
              </motion.span>
            </div>
            <div className="text-right">
              <p className="font-num text-3xl leading-none">{to}</p>
              <p className="mt-1 text-[0.65rem] text-white/60">{tour.destination}</p>
            </div>
          </div>

          <dl className="mt-5 grid grid-cols-3 gap-2 text-xs">
            <div>
              <dt className="text-white/50">Огноо</dt>
              <dd className="mt-0.5 font-semibold">{booking.date || "Тохиролцоно"}</dd>
            </div>
            <div>
              <dt className="text-white/50">Аялагч</dt>
              <dd className="mt-0.5 font-semibold">{people} хүн</dd>
            </div>
            <div className="text-right">
              <dt className="text-white/50">Дүн</dt>
              <dd className="mt-0.5 font-num font-semibold text-[#f3d199]">{formatPrice(booking.total)}</dd>
            </div>
          </dl>
        </div>

        {/* Perforation */}
        <div className="relative my-4 flex items-center">
          <span className="-ml-3 size-6 shrink-0 rounded-full bg-[var(--bg-soft)]" />
          <span className="h-px flex-1 border-t-2 border-dotted border-white/20" />
          <span className="-mr-3 size-6 shrink-0 rounded-full bg-[var(--bg-soft)]" />
        </div>

        <div className="relative flex items-end justify-between gap-4 px-5 pb-5">
          <div>
            <p className="text-[0.65rem] text-white/50">Хүсэлтийн дугаар</p>
            <p className="font-num text-lg tracking-[0.08em]">{booking.id}</p>
          </div>
          {/* Decorative barcode from the request number */}
          <div className="flex h-10 items-end gap-[2px]" aria-hidden>
            {Array.from(booking.id.replace(/\W/g, "")).map((c, i) => (
              <span key={i} className="block bg-white/80" style={{ width: (c.charCodeAt(0) % 3) + 1, height: `${55 + ((c.charCodeAt(0) * 7) % 45)}%` }} />
            ))}
          </div>
        </div>
      </motion.div>

      {state !== "offline" ? (
        <button type="button" onClick={share} className="mx-auto mt-3 flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-accent">
          <Icon name="share" size={16} /> {shared ? "Холбоос хуулагдлаа" : "Найздаа хуваалцах"}
        </button>
      ) : null}
    </div>
  );
}
