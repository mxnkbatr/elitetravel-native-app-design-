"use client";

import { AnimatedNumber } from "@/components/AnimatedNumber";
import { formatPrice, type TourSummary } from "@/data/tours";
import { haptic } from "@/lib/native";
import {
  calculateTourPrice,
  initialCalculatorState,
  resolveCalculator,
  setAdults,
  setChildren,
  setOddChoice,
  type CalculatorQuote,
  type CalculatorState,
  type OddChoice,
  type PairChoice,
  type RoomKids,
} from "@/lib/tour-calculator";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";

const PAIR_OPTIONS: { id: PairChoice; label: string; hint: string }[] = [
  { id: "double", label: "Хосын том ор", hint: "2 том хүн · нэг ор" },
  { id: "twin", label: "Тусдаа 2 ор", hint: "2 том хүн · найзууд" },
  { id: "twoSingles", label: "Хоёр ганц өрөө", hint: "Нэмэлт төлбөр × 2" },
];

const ODD_OPTIONS: { id: OddChoice; label: string; hint: string }[] = [
  { id: "single", label: "Ганцаараа", hint: "Нэмэлт төлбөртэй" },
  { id: "shared", label: "Хуваалцах", hint: "Ижил хүйстэй · нэмэлтгүй" },
];

function Stepper({
  label,
  hint,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-bg px-3.5 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foam">{label}</p>
        {hint ? <p className="mt-0.5 text-[0.7rem] leading-snug text-muted">{hint}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label={`${label} хасах`}
          disabled={value <= min}
          onClick={() => {
            haptic("tap");
            onChange(value - 1);
          }}
          className="tap grid size-11 place-items-center rounded-full border border-[var(--line)] bg-bg-elevated text-lg leading-none transition enabled:hover:border-accent enabled:hover:text-accent disabled:opacity-30"
        >
          −
        </button>
        <motion.span key={value} initial={{ y: -6, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-6 text-center font-num text-lg font-semibold tabular-nums">
          {value}
        </motion.span>
        <button
          type="button"
          aria-label={`${label} нэмэх`}
          disabled={value >= max}
          onClick={() => {
            haptic("tap");
            onChange(value + 1);
          }}
          className="tap grid size-11 place-items-center rounded-full border border-accent/30 bg-accent/10 text-lg leading-none text-accent transition enabled:hover:bg-accent enabled:hover:text-white disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}

function SaleCountdown({ endsAt }: { endsAt: number }) {
  const [left, setLeft] = useState(() => Math.max(0, endsAt - Date.now()));
  useEffect(() => {
    const id = window.setInterval(() => setLeft(Math.max(0, endsAt - Date.now())), 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);
  if (left <= 0) return <p className="text-[0.7rem] text-amber-700 dark:text-amber-200">Хямдрал дууссан.</p>;
  const s = Math.floor(left / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <p className="font-num text-[0.75rem] text-accent">
      Хямдрал: {d > 0 ? `${d}ө ` : ""}
      {pad(h)}:{pad(m)}:{pad(sec)}
    </p>
  );
}

function KidsControls({
  kids,
  allowExtra,
  freeSlots,
  onChange,
}: {
  kids: RoomKids;
  allowExtra: boolean;
  freeSlots: number;
  onChange: (k: RoomKids) => void;
}) {
  const used = (kids.extraBed ? 1 : 0) + kids.withParents;
  return (
    <div className="mt-2 space-y-2 border-t border-[var(--line)] pt-2">
      {allowExtra ? (
        <label className="flex items-center gap-2 text-xs text-foam">
          <input
            type="checkbox"
            checked={kids.extraBed}
            disabled={!kids.extraBed && freeSlots <= 0}
            onChange={(e) => {
              haptic("tap");
              onChange({ ...kids, extraBed: e.target.checked });
            }}
            className="size-4 accent-[var(--accent)]"
          />
          Нэмэлт ор (1) · том хүний үнэ
        </label>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">Эцэг эхтэй хамт (оргүй) · 0–2</p>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={kids.withParents <= 0}
            onClick={() => {
              haptic("tap");
              onChange({ ...kids, withParents: kids.withParents - 1 });
            }}
            className="grid size-8 place-items-center rounded-full border border-[var(--line)] text-sm disabled:opacity-30"
          >
            −
          </button>
          <span className="w-5 text-center font-num text-sm">{kids.withParents}</span>
          <button
            type="button"
            disabled={kids.withParents >= 2 || (!kids.extraBed && used >= freeSlots + used && freeSlots <= 0) || freeSlots <= 0}
            onClick={() => {
              haptic("tap");
              onChange({ ...kids, withParents: kids.withParents + 1 });
            }}
            className="grid size-8 place-items-center rounded-full border border-accent/30 bg-accent/10 text-sm text-accent disabled:opacity-30"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Lovable-parity tour price calculator: pair rooms from adults, odd room, per-room kids.
 * Totals only appear when every adult + child is placed.
 */
export function TourPriceCalculator({
  tour,
  state,
  onChange,
  quote,
}: {
  tour: TourSummary;
  state: CalculatorState;
  onChange: (s: CalculatorState) => void;
  quote: CalculatorQuote;
}) {
  const settings = resolveCalculator(tour);
  const freeKids = Math.max(0, state.children - (quote.childWithBed + quote.childNoBed));

  const patchPair = (i: number, patch: Partial<{ choice: PairChoice; kids: RoomKids }>) => {
    const pairRooms = state.pairRooms.map((r, idx) => (idx === i ? { ...r, ...patch, kids: patch.kids ?? r.kids } : r));
    onChange({ ...state, pairRooms });
  };

  const patchOddKids = (kids: RoomKids) => {
    if (!state.oddRoom) return;
    onChange({ ...state, oddRoom: { ...state.oddRoom, kids } });
  };

  return (
    <section className="mt-5 space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="type-label text-muted">Үнийн тооцоолол</p>
          <p className="mt-0.5 text-sm text-muted">Өрөө, хүүхдийн байрлалаа бүрэн сонгосны дараа нийт дүн гарна.</p>
        </div>
        <div className="text-right">
          <p className="text-[0.65rem] text-muted">Үнэ / том хүн</p>
          <p className="font-num text-2xl font-semibold text-accent">{formatPrice(quote.adultPrice)}</p>
          {quote.saleEndsAt ? <SaleCountdown endsAt={quote.saleEndsAt} /> : null}
        </div>
      </div>

      <div className="space-y-2">
        <Stepper label="Том хүн" hint="Хамгийн багадаа 1" value={state.adults} min={1} max={20} onChange={(n) => onChange(setAdults(state, n))} />
        <Stepper label="Хүүхэд (2–12)" value={state.children} min={0} max={20} onChange={(n) => onChange(setChildren(state, n))} />
      </div>

      {state.pairRooms.map((room, i) => (
        <div key={`pair-${i}`} className="rounded-2xl border border-[var(--line)] bg-bg p-3.5">
          <p className="text-xs font-semibold text-muted">{i + 1}-р хос өрөө</p>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
            {PAIR_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  haptic("tap");
                  patchPair(i, { choice: opt.id });
                }}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${
                  room.choice === opt.id ? "border-accent bg-accent/10 text-foam" : "border-[var(--line)] hover:border-accent"
                }`}
              >
                <span className="block text-[0.78rem] font-semibold">{opt.label}</span>
                <span className="mt-0.5 block text-[0.65rem] text-muted">{opt.hint}</span>
              </button>
            ))}
          </div>
          {state.children > 0 ? (
            <KidsControls
              kids={room.kids}
              allowExtra={settings.allowChildExtraBed}
              freeSlots={freeKids + (room.kids.extraBed ? 1 : 0) + room.kids.withParents}
              onChange={(kids) => patchPair(i, { kids })}
            />
          ) : null}
        </div>
      ))}

      {state.oddRoom ? (
        <div className="rounded-2xl border border-[var(--line)] bg-bg p-3.5">
          <p className="text-xs font-semibold text-muted">Сондгой өрөө · 1 том хүн</p>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
            {ODD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  haptic("tap");
                  onChange(setOddChoice(state, opt.id));
                }}
                className={`rounded-xl border px-3 py-2.5 text-left transition ${
                  state.oddRoom?.choice === opt.id ? "border-accent bg-accent/10 text-foam" : "border-[var(--line)] hover:border-accent"
                }`}
              >
                <span className="block text-[0.78rem] font-semibold">{opt.label}</span>
                <span className="mt-0.5 block text-[0.65rem] text-muted">
                  {opt.hint}
                  {opt.id === "single" ? ` · +${formatPrice(settings.singleSupplement)}` : ""}
                </span>
              </button>
            ))}
          </div>
          {state.oddRoom.choice && state.children > 0 ? (
            <KidsControls
              kids={state.oddRoom.kids}
              allowExtra={settings.allowChildExtraBed}
              freeSlots={freeKids + (state.oddRoom.kids.extraBed ? 1 : 0) + state.oddRoom.kids.withParents}
              onChange={patchOddKids}
            />
          ) : null}
        </div>
      ) : null}

      <div className="rounded-2xl border border-[var(--line)] bg-bg-elevated p-3.5 text-sm shadow-[var(--shadow)]">
        <AnimatePresence mode="wait">
          {!quote.ready ? (
            <motion.div key="pending" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <p className="font-semibold text-foam">Тооцоолол бэлэн болоогүй</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {quote.remainingAdults > 0 ? `${quote.remainingAdults} том хүний өрөө сонгоогүй. ` : ""}
                {quote.remainingChildren > 0 ? `${quote.remainingChildren} хүүхдийг өрөөнд байрлуулна уу.` : ""}
                {quote.remainingAdults === 0 && quote.remainingChildren === 0 ? "Хүүхдийн байрлалаа шалгана уу." : ""}
              </p>
            </motion.div>
          ) : (
            <motion.div key="ready" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-1.5">
              <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-accent">Тооцоолол бэлэн</p>
              {quote.lines.map((l) => (
                <div key={l.label} className="flex justify-between gap-3 text-muted">
                  <span>{l.label}</span>
                  <span className="font-num tabular-nums text-foam">{formatPrice(l.amount)}</span>
                </div>
              ))}
              {quote.savings > 0 ? (
                <div className="flex justify-between gap-3 text-emerald-700 dark:text-emerald-300">
                  <span>Хэмнэлт</span>
                  <span className="font-num tabular-nums">−{formatPrice(quote.savings)}</span>
                </div>
              ) : null}
              <div className="flex items-baseline justify-between gap-3 border-t border-[var(--line)] pt-2">
                <span className="font-semibold">Нийт дүн</span>
                <AnimatedNumber value={quote.total} format={formatPrice} className="font-num text-2xl font-semibold text-accent" />
              </div>
              {settings.depositPercent && quote.deposit ? (
                <>
                  <div className="flex justify-between gap-3 text-muted">
                    <span>Урьдчилгаа ({settings.depositPercent}%)</span>
                    <span className="font-num tabular-nums text-foam">{formatPrice(quote.deposit)}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-muted">
                    <span>Үлдэгдэл</span>
                    <span className="font-num tabular-nums text-foam">{formatPrice(quote.total - quote.deposit)}</span>
                  </div>
                </>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

export function useTourCalculator(tour: TourSummary, state: CalculatorState) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const ends = resolveCalculator(tour).saleEndsAt;
    if (!ends) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [tour]);
  return useMemo(() => calculateTourPrice(tour, state, now), [tour, state, now]);
}

export { initialCalculatorState };
