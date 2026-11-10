"use client";

import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Icon } from "@/components/Icon";
import { formatPrice, type TourSummary } from "@/data/tours";
import { useSaleActive } from "@/hooks/use-sale";
import { haptic } from "@/lib/native";
import {
  calculateTourPrice,
  canAddMoreChildren,
  childrenMaxOf,
  hasOddOf,
  initialCalculatorState,
  pairCountOf,
  resolveCalculator,
  setAdults,
  setChildren,
  setOddChoice,
  setOddKids,
  setPairChoice,
  setPairKids,
  togglePairExpanded,
  visiblePairs,
  type CalculatorQuote,
  type CalculatorState,
  type OddChoice,
  type PairChoice,
} from "@/lib/tour-calculator";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

function fmt(v: number) {
  return formatPrice(v);
}

function Counter({
  label,
  note,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  note?: string;
  value: number;
  min: number;
  max?: number;
  onChange: (n: number) => void;
}) {
  const atMax = max !== undefined && value >= max;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/25 bg-accent/10 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-accent">{label}</p>
        {note ? <p className="mt-0.5 text-xs text-muted">{note}</p> : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label="-"
          disabled={value <= min}
          onClick={() => {
            haptic("tap");
            onChange(Math.max(min, value - 1));
          }}
          className="tap grid size-8 place-items-center rounded-full border border-accent/30 bg-accent/20 text-accent transition enabled:hover:bg-accent/30 disabled:opacity-40"
        >
          <Icon name="minus" size={14} />
        </button>
        <span className="w-6 text-center font-num text-base font-bold tabular-nums text-accent">{value}</span>
        <button
          type="button"
          aria-label="+"
          disabled={atMax}
          onClick={() => {
            haptic("tap");
            onChange(max === undefined ? value + 1 : Math.min(max, value + 1));
          }}
          className="tap grid size-8 place-items-center rounded-full border border-accent/30 bg-accent/20 text-accent transition enabled:hover:bg-accent/30 disabled:opacity-40"
        >
          <Icon name="plus" size={14} />
        </button>
      </div>
    </div>
  );
}

function RadioRow({ active, label, fee, onClick }: { active: boolean; label: ReactNode; fee: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        haptic("tap");
        onClick();
      }}
      className={`flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-xl border px-3 py-3 text-left transition sm:px-4 ${
        active ? "border-accent bg-accent/15" : "border-[var(--line)] bg-bg hover:border-accent/40"
      }`}
    >
      <span className="flex min-w-[55%] flex-1 items-center gap-2 text-[13px] leading-snug sm:text-sm">
        <span className={`size-3 shrink-0 rounded-full border-2 ${active ? "border-accent bg-accent" : "border-[var(--line)]"}`} />
        {label}
      </span>
      <span className={`ml-auto shrink-0 text-[11px] font-medium sm:text-xs ${active ? "text-accent" : "text-muted"}`}>{fee}</span>
    </button>
  );
}

function OccupancyBadge({ adults, children }: { adults: number; children: number }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-bg-elevated px-2 py-1 text-xs">
      <span className="inline-flex items-center gap-1 text-foam">
        <Icon name="user" size={12} />
        <span className="font-num font-medium tabular-nums">{adults}</span>
      </span>
      {children > 0 ? (
        <span className="inline-flex items-center gap-1 text-accent">
          <Icon name="baby" size={12} />
          <span className="font-num font-medium tabular-nums">{children}</span>
        </span>
      ) : null}
    </span>
  );
}

function RoomChildOptions({
  bedActive,
  shareCount,
  onToggleBed,
  onShareChange,
  canAddMore,
  disabled,
  disabledReason,
  allowBed,
}: {
  bedActive: boolean;
  shareCount: number;
  onToggleBed: () => void;
  onShareChange: (v: number) => void;
  canAddMore: boolean;
  disabled: boolean;
  disabledReason?: string;
  allowBed: boolean;
}) {
  const bedDisabled = !bedActive && !canAddMore;
  return (
    <div className={`space-y-2 transition-opacity ${disabled ? "opacity-50" : ""}`}>
      {disabled && disabledReason ? <p className="text-[11px] text-muted">{disabledReason}</p> : null}
      {allowBed ? (
        <button
          type="button"
          onClick={() => {
            haptic("tap");
            onToggleBed();
          }}
          disabled={bedDisabled || disabled}
          className={`flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-xl border px-3 py-3 text-left transition sm:px-4 ${
            bedDisabled || disabled
              ? "cursor-not-allowed border-[var(--line)] bg-bg/50"
              : bedActive
                ? "border-accent bg-accent/15"
                : "border-[var(--line)] bg-bg hover:border-accent/40"
          }`}
        >
          <span className="flex min-w-[55%] flex-1 items-center gap-2 text-[13px] leading-snug sm:text-sm">
            <span className={`flex size-3 shrink-0 items-center justify-center rounded-sm border-2 ${bedActive ? "border-accent bg-accent" : "border-[var(--line)]"}`} />
            <span>Хүүхэд нэмэх — нэмэлт ортой</span>
          </span>
          <span className={`ml-auto shrink-0 text-[11px] font-medium sm:text-xs ${bedActive ? "text-accent" : "text-muted"}`}>Том хүнтэй ижил үнэ</span>
        </button>
      ) : null}

      <div
        className={`flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1.5 rounded-xl border px-3 py-3 sm:px-4 ${
          shareCount > 0 ? "border-accent bg-accent/15" : "border-[var(--line)] bg-bg"
        } ${disabled ? "pointer-events-none" : ""}`}
      >
        <span className="flex min-w-[55%] flex-1 items-center gap-2 text-[13px] leading-snug sm:text-sm">
          <span className={`flex size-3 shrink-0 items-center justify-center rounded-sm border-2 ${shareCount > 0 ? "border-accent bg-accent" : "border-[var(--line)]"}`} />
          <span>Хүүхэд нэмэх — хамт унтах</span>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            aria-label="-"
            disabled={shareCount <= 0 || disabled}
            onClick={() => {
              haptic("tap");
              onShareChange(Math.max(0, shareCount - 1));
            }}
            className="grid size-7 place-items-center rounded-full border border-[var(--line)] disabled:opacity-40"
          >
            <Icon name="minus" size={12} />
          </button>
          <span className="w-5 text-center font-num text-sm font-bold tabular-nums">{shareCount}</span>
          <button
            type="button"
            aria-label="+"
            disabled={shareCount >= 2 || !canAddMore || disabled}
            onClick={() => {
              haptic("tap");
              onShareChange(Math.min(2, shareCount + 1));
            }}
            className="grid size-7 place-items-center rounded-full border border-[var(--line)] disabled:opacity-40"
          >
            <Icon name="plus" size={12} />
          </button>
        </span>
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
  if (left <= 0) return <p className="text-center text-[0.7rem] text-amber-700 dark:text-amber-200">Хямдрал дууссан.</p>;
  const s = Math.floor(left / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <p className="text-center font-num text-[0.75rem] text-accent">
      Хямдрал: {d > 0 ? `${d}ө ` : ""}
      {pad(h)}:{pad(m)}:{pad(sec)}
    </p>
  );
}

function pairLabel(r: PairChoice) {
  if (r === "double") return "Хосын том ортой өрөө";
  if (r === "twin") return "Тусдаа 2 ортой өрөө";
  return "Тус тусдаа ганц ганц өрөө";
}

function oddLabel(r: OddChoice) {
  if (r === "single") return "Өрөөнд ганцаараа байрлах";
  if (r === "withChild") return "Хүүхэдтэй хамт нэг өрөөнд байрлах";
  return "Ижил хүйсийн өөр аялагчтай өрөө хуваалцах";
}

/**
 * Lovable-parity tour price calculator (complete room/bed spec).
 * Live total + deposit always visible; summary table only when complete (and pairCount > 0).
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
  const pairs = visiblePairs(state);
  const pairCount = pairCountOf(state.adults);
  const hasOdd = hasOddOf(state.adults);
  const canAdd = canAddMoreChildren(state);
  const childMax = childrenMaxOf(state.adults);
  const totalRef = useRef<HTMLDivElement>(null);
  const [totalVisible, setTotalVisible] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = totalRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setTotalVisible(entry?.isIntersecting ?? true), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => setMounted(true), []);

  const doubleLabel = (
    <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
      <span>Хосын том ортой өрөө</span>
      <span className="inline-flex -space-x-0.5 opacity-70">
        <Icon name="user" size={14} />
        <Icon name="user" size={14} />
      </span>
    </span>
  );
  const twinLabel = (
    <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
      <span>Тусдаа 2 ортой өрөө</span>
      <span className="inline-flex -space-x-0.5 opacity-70">
        <Icon name="user" size={14} />
        <Icon name="user" size={14} />
      </span>
    </span>
  );
  const twoSinglesLabel = (
    <span className="flex min-w-0 flex-wrap items-center gap-x-1.5">
      <span>Тус тусдаа ганц ганц өрөө</span>
      <span className="inline-flex items-center gap-1 opacity-70">
        <Icon name="user" size={14} />
        <Icon name="user" size={14} />
      </span>
    </span>
  );

  const childNote =
    settings.childBasePrice != null
      ? `${fmt(quote.childPrice)} ор эзлэхгүй тохиолдолд.`
      : `Нэмэлт ортой бол том хүнтэй ижил үнэ · хамт унтвал ${fmt(quote.childPrice)} / хүүхэд (${fmt(settings.childDiscount)}-р хямд)`;

  const oddCard = hasOdd ? (
    <div className={`space-y-3 rounded-xl border border-accent/25 bg-accent/5 p-4 ${pairCount === 0 ? "mt-6" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 text-sm font-semibold text-accent">
            <Icon name="user" size={16} /> {quote.remainingLabel || "Сондгой аялагчийн сонголт"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">Доорх сонголтуудаас үлдсэн аялагчдын байрлах хэлбэрийг сонгоно уу.</p>
        </div>
        {pairCount === 0 && quote.totalRemaining > 0 && quote.remainingLabel ? (
          <span className="shrink-0 rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-300">{quote.remainingLabel}</span>
        ) : null}
      </div>

      <RadioRow
        active={state.oddRoom?.choice === "shared"}
        label="Ижил хүйсийн өөр аялагчтай өрөө хуваалцах"
        fee="Нэмэлт төлбөргүй"
        onClick={() => onChange(setOddChoice(state, "shared"))}
      />
      {quote.remainingChildren > 0 ? (
        <RadioRow
          active={state.oddRoom?.choice === "withChild"}
          label="Хүүхэдтэй хамт нэг өрөөнд байрлах"
          fee="Нэмэлт төлбөргүй"
          onClick={() => onChange(setOddChoice(state, "withChild"))}
        />
      ) : null}
      <RadioRow
        active={state.oddRoom?.choice === "single"}
        label="Өрөөнд ганцаараа байрлах"
        fee={`Нэмэлт төлбөр ${fmt(settings.singleSupplement)}`}
        onClick={() => onChange(setOddChoice(state, "single"))}
      />

      <RoomChildOptions
        bedActive={state.oddRoom?.kids.extraBed ?? false}
        shareCount={state.oddRoom?.kids.withParents ?? 0}
        onToggleBed={() => {
          if (!state.oddRoom) return;
          onChange(setOddKids(state, { ...state.oddRoom.kids, extraBed: !state.oddRoom.kids.extraBed }));
        }}
        onShareChange={(v) => {
          if (!state.oddRoom) return;
          onChange(setOddKids(state, { ...state.oddRoom.kids, withParents: v }));
        }}
        canAddMore={canAdd}
        allowBed={settings.allowChildExtraBed}
        disabled={state.oddRoom?.choice == null || state.children === 0}
        disabledReason={
          state.oddRoom?.choice == null ? "Өрөө сонгоогүй тул идэвхгүй" : state.children === 0 ? "Хүүхэд сонгоогүй бол идэвхгүй" : undefined
        }
      />

      <div className="flex items-center justify-between border-t border-[var(--line)] pt-3 text-xs">
        <span className={state.oddRoom?.choice == null ? "text-red-600 dark:text-red-300" : "text-accent"}>
          {state.oddRoom?.choice == null ? "Өрөөний сонголт хийгдээгүй" : "Өрөөний сонголт хийгдсэн"}
        </span>
        <OccupancyBadge
          adults={1}
          children={(state.oddRoom?.kids.extraBed ? 1 : 0) + (state.oddRoom?.kids.withParents ?? 0)}
        />
      </div>
    </div>
  ) : null;

  // withChild visibility quirk: hide when remainingChildren === 0 unless currently selected
  // (handled above with OR choice === withChild)

  return (
    <section className="mt-5 rounded-2xl border border-[var(--line)] bg-bg-elevated p-5 shadow-[var(--shadow)] sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-full bg-accent text-white">
          <Icon name="calculator" size={18} />
        </span>
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-foam">Аяллын тооцоолол</h3>
          <p className="text-xs text-muted">Аялагчдын нийт тоо болон өрөөний сонголтоо хийж, нийт үнийг шууд хараарай.</p>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        <p className="flex items-center gap-1.5 text-sm font-medium text-muted">
          <Icon name="users" size={16} /> Аялагчдын тоо
        </p>
        <Counter
          label="Насан хүрсэн аялагч"
          note={`12-с дээш нас · ${fmt(quote.adultPrice)} / хүн`}
          value={state.adults}
          min={1}
          onChange={(n) => onChange(setAdults(state, n))}
        />
        <Counter
          label="Хүүхэд / 2-12 нас/"
          note={childNote}
          value={state.children}
          min={0}
          max={childMax}
          onChange={(n) => onChange(setChildren(state, n))}
        />
        {state.children > 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--line)] bg-bg px-4 py-2.5 text-xs leading-relaxed text-muted">
            Хүүхдүүдийг доорх өрөө бүр дээр нэмэлтээр сонгоно. Нэг өрөөнд хамгийн ихдээ 1 нэмэлт ортой, 2 хамт унтах хүүхэд байна.
          </p>
        ) : null}
      </div>

      {pairCount > 0 ? (
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-medium text-muted">
              <Icon name="bed" size={16} /> Хос бүрийн өрөөний сонголт
            </p>
            {quote.totalRemaining > 0 && quote.remainingLabel ? (
              <span className="animate-pulse rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-medium text-red-600 dark:text-red-300">
                {quote.remainingLabel}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-1 items-start gap-3 md:grid-cols-2">
            {pairs.map((room, i) => {
              const expanded = state.expandedPairs[i] ?? true;
              const occupancy = 2 + (room.kids.extraBed ? 1 : 0) + room.kids.withParents;
              const pairChildren = (room.kids.extraBed ? 1 : 0) + room.kids.withParents;
              return (
                <div key={i} className="relative overflow-hidden rounded-xl border border-[var(--line)] bg-bg">
                  <button
                    type="button"
                    onClick={() => {
                      haptic("tap");
                      onChange(togglePairExpanded(state, i));
                    }}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-bg-elevated"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="text-xs text-muted">Хос {i + 1}</span>
                      <span className={`flex items-center gap-1.5 truncate ${expanded ? "text-sm font-medium" : "text-base font-semibold"} text-foam`}>
                        <Icon name="bed" size={16} className="shrink-0 text-accent" />
                        {room.choice == null ? (
                          "Өрөө сонгоогүй байна"
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            {pairLabel(room.choice)}
                            <span className="inline-flex -space-x-0.5 opacity-70">
                              <Icon name="user" size={14} />
                              <Icon name="user" size={14} />
                            </span>
                          </span>
                        )}
                      </span>
                      {room.kids.extraBed ? (
                        <span className="flex items-center gap-1.5 text-xs text-muted">
                          <Icon name="plus" size={12} /> Хүүхэд (нэмэлт ортой)
                        </span>
                      ) : null}
                      {room.kids.withParents > 0 ? (
                        <span className="flex items-center gap-1.5 text-xs text-muted">
                          <Icon name="plus" size={12} /> Хүүхэд (нэмэлт оргүй) ×{room.kids.withParents}
                        </span>
                      ) : null}
                      {room.choice != null ? (
                        <span className="mt-0.5 text-xs text-muted">
                          {occupancy} аялагч энэ өрөөнд
                          <span className="text-accent"> · Бүгд хуваарилагдлаа</span>
                        </span>
                      ) : null}
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted">
                      {expanded ? "Хаах" : "Нээх"}
                      <Icon name={expanded ? "chevron-up" : "chevron-down"} size={16} />
                    </span>
                  </button>

                  {expanded ? (
                    <div className="space-y-2 border-t border-[var(--line)] px-3 pb-3 pt-2">
                      <RadioRow active={room.choice === "double"} label={doubleLabel} fee="Үнэд багтсан" onClick={() => onChange(setPairChoice(state, i, "double"))} />
                      <RadioRow active={room.choice === "twin"} label={twinLabel} fee="Үнэд багтсан" onClick={() => onChange(setPairChoice(state, i, "twin"))} />
                      <RadioRow
                        active={room.choice === "twoSingles"}
                        label={twoSinglesLabel}
                        fee={`Хүн тус бүр ${fmt(settings.singleSupplement)} нэмэлт`}
                        onClick={() => onChange(setPairChoice(state, i, "twoSingles"))}
                      />
                      <RoomChildOptions
                        bedActive={room.kids.extraBed}
                        shareCount={room.kids.withParents}
                        onToggleBed={() => onChange(setPairKids(state, i, { ...room.kids, extraBed: !room.kids.extraBed }))}
                        onShareChange={(v) => onChange(setPairKids(state, i, { ...room.kids, withParents: v }))}
                        canAddMore={canAdd}
                        allowBed={settings.allowChildExtraBed}
                        disabled={room.choice == null || state.children === 0}
                        disabledReason={
                          room.choice == null ? "Өрөө сонгоогүй тул идэвхгүй" : state.children === 0 ? "Хүүхэд сонгоогүй бол идэвхгүй" : undefined
                        }
                      />
                      <div className="flex items-center justify-end border-t border-[var(--line)] pt-2">
                        <OccupancyBadge adults={2} children={pairChildren} />
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
            {hasOdd && pairCount > 0 ? oddCard : null}
          </div>
        </div>
      ) : null}

      {hasOdd && pairCount === 0 ? oddCard : null}

      <div ref={totalRef} className="mt-6 border-t border-[var(--line)] pt-4">
        {quote.saleEndsAt ? (
          <div className="mb-3">
            <SaleCountdown endsAt={quote.saleEndsAt} />
          </div>
        ) : null}
        {settings.depositPercent > 0 ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-accent/25 bg-accent/10 px-4 py-3">
            <span className="text-sm font-medium text-accent">Урьдчилгаа төлбөр ({settings.depositPercent}%)</span>
            <span className="font-num text-lg font-bold tabular-nums text-accent">{fmt(quote.deposit)}</span>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted">Нийт төлөх дүн</span>
          <AnimatedNumber value={quote.total} format={fmt} className="font-num text-2xl font-bold tabular-nums text-accent" />
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          Тооцоолол нь урьдчилсан байдлаар гарч байгаа тул эцсийн дүнг манай баг баталгаажуулна.
        </p>
      </div>

      <AnimatePresence>
        {quote.summaryReady ? (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5 overflow-hidden rounded-xl border border-accent/25 bg-accent/5"
          >
            <p className="border-b border-accent/20 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent">Таны сонголтын хүснэгт</p>
            <div className="divide-y divide-[var(--line)] px-4 text-sm">
              <div className="flex items-start justify-between gap-3 py-2.5">
                <span className="shrink-0 text-muted">Аялагчид</span>
                <span className="text-right text-foam">
                  Насан хүрсэн аялагч {state.adults}
                  {quote.childWithBed > 0 ? ` · Хүүхэд (нэмэлт ортой) ${quote.childWithBed}` : ""}
                  {quote.childNoBed > 0 ? ` · Хүүхэд (нэмэлт оргүй) ${quote.childNoBed}` : ""}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3 py-2.5">
                <span className="shrink-0 text-muted">Өрөөний сонголт</span>
                <span className="space-y-1 text-right">
                  {pairs.map((room, i) => {
                    if (room.choice == null) return null;
                    const parts = [`${2} том хүн`];
                    if (room.kids.extraBed) parts.push("1 хүүхэд /нэмэлт ортой/");
                    if (room.kids.withParents > 0) parts.push(`${room.kids.withParents} хүүхэд /нэмэлт оргүй/`);
                    return (
                      <span key={i} className="block">
                        <span className="font-medium">{pairLabel(room.choice)}:</span>{" "}
                        <span className="text-foam/90">{parts.join(", ")}</span>
                      </span>
                    );
                  })}
                  {hasOdd && state.oddRoom?.choice ? (
                    <span className="block">
                      <span className="font-medium">
                        {[
                          "1 том хүн",
                          ...(state.oddRoom.kids.extraBed ? ["1 хүүхэд /нэмэлт ортой/"] : []),
                          ...(state.oddRoom.kids.withParents > 0 ? [`${state.oddRoom.kids.withParents} хүүхэд /нэмэлт оргүй/`] : []),
                        ].join(", ")}
                      </span>{" "}
                      <span className="text-xs text-muted">/{oddLabel(state.oddRoom.choice)}/</span>
                    </span>
                  ) : null}
                </span>
              </div>
              {quote.childNoBed > 0 && quote.perChildDiscount > 0 ? (
                <div className="flex items-start justify-between gap-3 py-2.5">
                  <span className="shrink-0 text-muted">Хэмнэлт</span>
                  <span className="text-right text-accent">
                    Хүүхэд (нэмэлт оргүй) ×{quote.childNoBed} · −{fmt(quote.savings)}
                  </span>
                </div>
              ) : null}
              {quote.oddFee > 0 || quote.pairSinglesFee > 0 ? (
                <div className="flex items-start justify-between gap-3 py-2.5">
                  <span className="shrink-0 text-muted">Нэмэлтүүд</span>
                  <span className="space-y-0.5 text-right text-foam">
                    {quote.oddFee > 0 ? <span className="block">Өрөөнд ганцаараа байрлах · {fmt(settings.singleSupplement)}</span> : null}
                    {quote.pairSinglesFee > 0 ? (
                      <span className="block">
                        Тус тусдаа ганц ганц өрөө ×{quote.twoSinglesCount} · {fmt(quote.pairSinglesFee)}
                      </span>
                    ) : null}
                  </span>
                </div>
              ) : null}
              {settings.depositPercent > 0 ? (
                <div className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-muted">Урьдчилгаа төлбөр ({settings.depositPercent}%)</span>
                  <span className="font-num font-semibold tabular-nums text-accent">{fmt(quote.deposit)}</span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3 py-2.5 font-semibold">
                <span className="text-muted">Нийт төлөх дүн</span>
                <span className="font-num tabular-nums text-accent">{fmt(quote.total)}</span>
              </div>
            </div>
            <p className="border-t border-accent/20 bg-accent/10 px-4 py-2.5 text-xs font-medium leading-relaxed text-accent">
              Та энэхүү хүснэгтийг screenshot хийж, манай менежертэй мэдээллээ солилцоорой.
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {mounted
        ? createPortal(
            <div
              aria-hidden={totalVisible}
              className={`fixed inset-x-0 bottom-0 z-40 transition-transform duration-300 ${totalVisible ? "translate-y-full" : "translate-y-0"}`}
            >
              <div className="border-t border-[var(--line)] bg-bg-elevated/95 px-4 py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md">
                <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
                  <div>
                    <p className="text-[0.65rem] text-muted">Нийт төлөх дүн</p>
                    {settings.depositPercent > 0 ? (
                      <p className="text-[0.65rem] text-muted">Урьдчилгаа · {fmt(quote.deposit)}</p>
                    ) : null}
                  </div>
                  <span className="font-num text-xl font-bold tabular-nums text-accent">{fmt(quote.total)}</span>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </section>
  );
}

export function useTourCalculator(tour: TourSummary, state: CalculatorState) {
  const settings = resolveCalculator(tour);
  const endsAtIso = tour.calculator?.sale?.endsAt ?? tour.pricing?.saleEndsAt ?? null;
  const saleActive = useSaleActive(endsAtIso);
  const now = useMemo(() => {
    if (settings.saleEndsAt == null) return Date.now();
    return saleActive ? settings.saleEndsAt - 1 : settings.saleEndsAt + 1;
  }, [settings.saleEndsAt, saleActive]);
  return useMemo(() => calculateTourPrice(tour, state, now), [tour, state, now]);
}

export { initialCalculatorState };
