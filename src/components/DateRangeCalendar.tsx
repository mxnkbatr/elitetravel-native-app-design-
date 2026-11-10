"use client";

import { Icon } from "@/components/Icon";
import {
  formatDateRange,
  formatMonthDay,
  rangeDayCount,
  resolveRangeDates,
  type DateRange,
  type MonthDay,
} from "@/lib/dates";
import { useEffect, useMemo, useState } from "react";

const WEEKDAYS = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];
const MONTHS = ["1-р сар", "2-р сар", "3-р сар", "4-р сар", "5-р сар", "6-р сар", "7-р сар", "8-р сар", "9-р сар", "10-р сар", "11-р сар", "12-р сар"];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toMonthDay(d: Date): MonthDay {
  return { month: d.getMonth() + 1, day: d.getDate() };
}

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/** Prefer the next occurrence of a month/day range from today (handles Dec→Jan). */
function upcomingSpan(range: DateRange, now = new Date()) {
  const thisYear = resolveRangeDates(range, now.getFullYear());
  if (thisYear.end.getTime() >= now.getTime() - 7 * 86400000) return thisYear;
  return resolveRangeDates(range, now.getFullYear() + 1);
}

type Props = {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
  /** Other departures to tint lightly so staff see overlap. */
  others?: DateRange[];
  /** Compact for booking sheet. */
  compact?: boolean;
  /** Read-only highlight of available ranges; click selects that range. */
  selectable?: { label: string; range: DateRange; disabled?: boolean }[];
  selectedLabel?: string;
  onSelectLabel?: (label: string) => void;
};

/**
 * Month grid: first tap sets start, second tap sets end (or picks a published range in select mode).
 */
export function DateRangeCalendar({
  value,
  onChange,
  others = [],
  compact = false,
  selectable,
  selectedLabel,
  onSelectLabel,
}: Props) {
  const selectMode = Boolean(selectable?.length);
  const seed = value ?? selectable?.find((s) => s.label === selectedLabel)?.range ?? selectable?.[0]?.range ?? null;
  const seedDate = seed ? upcomingSpan(seed).start : new Date();
  const [cursor, setCursor] = useState(() => new Date(seedDate.getFullYear(), seedDate.getMonth(), 1));
  const [picking, setPicking] = useState<Date | null>(null);

  // Jump the month grid when the traveller picks another departure chip
  useEffect(() => {
    const range = value ?? selectable?.find((s) => s.label === selectedLabel)?.range ?? null;
    if (!range) return;
    const start = upcomingSpan(range).start;
    setCursor((prev) => {
      if (prev.getFullYear() === start.getFullYear() && prev.getMonth() === start.getMonth()) return prev;
      return new Date(start.getFullYear(), start.getMonth(), 1);
    });
  }, [value, selectedLabel, selectable]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const startPad = (first.getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const out: (Date | null)[] = [];
    for (let i = 0; i < startPad; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(new Date(year, month, d));
    while (out.length % 7) out.push(null);
    return out;
  }, [year, month]);

  /** Prefer the year whose span overlaps the visible month (handles 12/28–01/03). */
  function spanForMonth(range: DateRange) {
    const candidates = [resolveRangeDates(range, year), resolveRangeDates(range, year - 1), resolveRangeDates(range, year + 1)];
    const monthStart = new Date(year, month, 1).getTime();
    const monthEnd = new Date(year, month + 1, 0).getTime();
    const overlaps = (s: { start: Date; end: Date }) => s.start.getTime() <= monthEnd && s.end.getTime() >= monthStart;
    return candidates.find(overlaps) ?? candidates[0];
  }

  const active = useMemo(() => {
    if (picking) return null;
    if (selectMode) {
      const hit = selectable?.find((s) => s.label === selectedLabel);
      return hit ? spanForMonth(hit.range) : null;
    }
    return value ? spanForMonth(value) : null;
    // spanForMonth closes over month/year
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picking, selectMode, selectable, selectedLabel, value, year, month]);

  const otherSpans = useMemo(
    () => others.map((r) => spanForMonth(r)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [others, year, month],
  );

  function inSpan(day: Date, span: { start: Date; end: Date } | null) {
    if (!span) return false;
    const t = day.getTime();
    return t >= span.start.getTime() && t <= span.end.getTime();
  }

  function spanAroundYear(range: DateRange) {
    return [resolveRangeDates(range, year), resolveRangeDates(range, year - 1), resolveRangeDates(range, year + 1)];
  }

  function clickDay(day: Date) {
    if (selectMode && selectable && onSelectLabel) {
      const hit = selectable.find((s) => {
        if (s.disabled) return false;
        return spanAroundYear(s.range).some((span) => inSpan(day, span));
      });
      if (hit) onSelectLabel(hit.label);
      return;
    }

    if (!picking) {
      setPicking(day);
      onChange(null);
      return;
    }
    let start = picking;
    let end = day;
    if (end < start) [start, end] = [end, start];
    onChange({ start: toMonthDay(start), end: toMonthDay(end) });
    setPicking(null);
  }

  const cell = compact ? "aspect-square w-full text-[0.72rem]" : "aspect-square w-full text-sm";

  return (
    <div className={`min-w-0 ${compact ? "space-y-2" : "space-y-3"}`}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label="Өмнөх сар"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
          className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--line)] text-muted transition hover:border-accent hover:text-accent"
        >
          <Icon name="chevron-left" size={16} />
        </button>
        <p className="min-w-0 truncate text-center font-display text-base font-semibold tabular-nums">
          {MONTHS[month]} · {year}
        </p>
        <button
          type="button"
          aria-label="Дараагийн сар"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
          className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--line)] text-muted transition hover:border-accent hover:text-accent"
        >
          <Icon name="chevron-right" size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0.5 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1 text-[0.65rem] font-semibold text-muted">
            {w}
          </span>
        ))}
        {cells.map((day, i) => {
          if (!day) return <span key={`e-${i}`} className="aspect-square w-full" />;
          const isStart = active ? sameDay(day, active.start) : picking ? sameDay(day, picking) : false;
          const isEnd = active ? sameDay(day, active.end) : false;
          const inActive = inSpan(day, active);
          const inOther = otherSpans.some((s) => inSpan(day, s));
          const isPickable =
            !selectMode ||
            selectable?.some((s) => {
              if (s.disabled) return false;
              return spanAroundYear(s.range).some((span) => inSpan(day, span));
            });

          return (
            <button
              key={dayKey(day)}
              type="button"
              disabled={selectMode && !isPickable}
              onClick={() => clickDay(day)}
              className={`${cell} relative grid place-items-center rounded-full font-medium tabular-nums transition disabled:cursor-default disabled:opacity-35 ${
                isStart || isEnd
                  ? "bg-accent text-white"
                  : inActive
                    ? "bg-accent/15 text-accent"
                    : inOther
                      ? "bg-[var(--line)]/80 text-foam"
                      : "hover:bg-accent/10"
              }`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>

      {!selectMode ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <p>
            {picking
              ? `Эхлэх: ${formatMonthDay(toMonthDay(picking))} · одоо дуусах өдрийг дарна уу`
              : value
                ? `${formatDateRange(value)} · ${rangeDayCount(value)} өдөр`
                : "Эхлээд эхлэх өдөр, дараа нь дуусах өдрийг сонгоно"}
          </p>
          {value || picking ? (
            <button
              type="button"
              onClick={() => {
                setPicking(null);
                onChange(null);
              }}
              className="font-semibold text-accent"
            >
              Цэвэрлэх
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
