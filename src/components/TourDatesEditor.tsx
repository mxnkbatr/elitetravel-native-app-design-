"use client";

import { DateRangeCalendar } from "@/components/DateRangeCalendar";
import { Icon } from "@/components/Icon";
import { formatDateRange, joinDateRanges, parseDateRanges, type DateRange } from "@/lib/dates";
import { useMemo, useState } from "react";

const MAX_RANGES = 3;

/**
 * Admin date editor: up to 3 consecutive departures picked on a calendar,
 * stored as the catalogue's « · »-joined string. Free-text kept for open dates.
 */
export function TourDatesEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const parsed = useMemo(() => parseDateRanges(value), [value]);
  const looksFree = Boolean(value.trim()) && parsed.length === 0;
  const [mode, setMode] = useState<"calendar" | "text">(looksFree ? "text" : "calendar");
  const [ranges, setRanges] = useState<DateRange[]>(() => (looksFree ? [] : parsed));
  const [active, setActive] = useState(0);
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState(value);

  function commitRanges(next: DateRange[]) {
    setRanges(next);
    onChange(next.length ? joinDateRanges(next) : "");
  }

  function removeAt(i: number) {
    const next = ranges.filter((_, j) => j !== i);
    commitRanges(next);
    setAdding(false);
    setActive(Math.max(0, Math.min(i, next.length - 1)));
  }

  const editingNew = adding || ranges.length === 0;
  const calendarValue = editingNew ? null : (ranges[active] ?? null);

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-muted">Огноонууд</p>
          <p className="mt-0.5 text-[0.7rem] text-muted/80">Календараас эхлэх·дуусах өдөр сонгоно. Нэг аялалд 2–3 удаагийн хөдлөх огноо нэмж болно.</p>
        </div>
        <div className="flex rounded-full border border-[var(--line)] p-0.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setMode("calendar");
              const r = parseDateRanges(text);
              if (r.length) {
                setRanges(r);
                onChange(joinDateRanges(r));
              }
            }}
            className={`rounded-full px-3 py-1.5 transition ${mode === "calendar" ? "bg-accent text-white" : "text-muted"}`}
          >
            Календарь
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("text");
              setText(value);
            }}
            className={`rounded-full px-3 py-1.5 transition ${mode === "text" ? "bg-accent text-white" : "text-muted"}`}
          >
            Бичвэр
          </button>
        </div>
      </div>

      {mode === "text" ? (
        <div>
          <input
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              onChange(e.target.value);
            }}
            placeholder="Хүссэн үедээ · эсвэл 11/03 – 11/10 · 11/10 – 11/17"
            className="w-full rounded-xl border border-[var(--line)] bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
          <p className="mt-1 text-[0.7rem] text-muted/80">«Хүссэн үедээ» гэх мэт нээлттэй огноонд бичвэр ашиглана.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--line)] bg-[#f8faf9] p-3 sm:p-4">
          {ranges.length > 0 ? (
            <div className="mb-3 flex flex-wrap gap-2">
              {ranges.map((r, i) => (
                <button
                  key={`${formatDateRange(r)}-${i}`}
                  type="button"
                  onClick={() => {
                    setAdding(false);
                    setActive(i);
                  }}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    !adding && active === i ? "border-accent bg-accent text-white" : "border-[var(--line)] bg-white text-ink"
                  }`}
                >
                  <Icon name="calendar" size={13} />
                  {i + 1}. {formatDateRange(r)}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label="Устгах"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAt(i);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        removeAt(i);
                      }
                    }}
                    className={`grid size-5 place-items-center rounded-full ${!adding && active === i ? "bg-white/20" : "bg-[var(--line)]"}`}
                  >
                    ×
                  </span>
                </button>
              ))}
              {adding ? (
                <span className="inline-flex items-center rounded-full border border-accent bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
                  Шинэ огноо…
                </span>
              ) : null}
            </div>
          ) : (
            <p className="mb-3 text-sm text-muted">Одоогоор огноо байхгүй. Доорх календараас эхний хөдлөхийг сонгоно уу.</p>
          )}

          <DateRangeCalendar
            value={calendarValue}
            others={ranges}
            onChange={(range) => {
              if (!range) {
                if (!editingNew && ranges[active]) removeAt(active);
                return;
              }
              if (editingNew) {
                const next = [...ranges, range];
                commitRanges(next);
                setAdding(false);
                setActive(next.length - 1);
                return;
              }
              const next = [...ranges];
              next[active] = range;
              commitRanges(next);
            }}
          />

          {ranges.length < MAX_RANGES ? (
            <button
              type="button"
              disabled={adding && ranges.length > 0}
              onClick={() => setAdding(true)}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--line)] py-2.5 text-sm font-semibold text-accent transition hover:border-accent disabled:opacity-40"
            >
              + Дараагийн огноо нэмэх ({ranges.length}/{MAX_RANGES})
            </button>
          ) : (
            <p className="mt-3 text-center text-xs text-muted">Хамгийн ихдээ {MAX_RANGES} удаагийн хөдлөх огноо</p>
          )}
        </div>
      )}
    </div>
  );
}
