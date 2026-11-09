/** Month/day only — tour dates never store a year. */
export type MonthDay = { month: number; day: number };

export type DateRange = { start: MonthDay; end: MonthDay };

const pad = (n: number) => String(n).padStart(2, "0");

export function formatMonthDay(md: MonthDay) {
  return `${pad(md.month)}/${pad(md.day)}`;
}

/** One departure label: "11/03 – 11/10" */
export function formatDateRange(range: DateRange) {
  return `${formatMonthDay(range.start)} – ${formatMonthDay(range.end)}`;
}

/** Join up to several departures the way the catalogue stores them. */
export function joinDateRanges(ranges: DateRange[]) {
  return ranges.map(formatDateRange).join(" · ");
}

/** Pull "11/03 – 11/10" (or "11/03–11/10") out of a label. Free-text labels return null. */
export function parseDateRange(label?: string): DateRange | null {
  const m = label?.match(/(\d{1,2})\s*\/\s*(\d{1,2})\s*[–-]\s*(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (!m) return null;
  const start = { month: Number(m[1]), day: Number(m[2]) };
  const end = { month: Number(m[3]), day: Number(m[4]) };
  if (!validMonthDay(start) || !validMonthDay(end)) return null;
  return { start, end };
}

/** «10/06–10/13 · 10/13–10/20» → structured ranges; non-range text is skipped. */
export function parseDateRanges(dates?: string): DateRange[] {
  if (!dates?.trim()) return [];
  return dates
    .split("·")
    .map((part) => parseDateRange(part.trim()))
    .filter((r): r is DateRange => r != null);
}

export function validMonthDay(md: MonthDay) {
  if (md.month < 1 || md.month > 12 || md.day < 1 || md.day > 31) return false;
  const d = new Date(2024, md.month - 1, md.day);
  return d.getMonth() === md.month - 1 && d.getDate() === md.day;
}

/** Attach a calendar year so the range can be drawn / compared (handles New Year wrap). */
export function resolveRangeDates(range: DateRange, year: number) {
  const start = new Date(year, range.start.month - 1, range.start.day);
  const end = new Date(year, range.end.month - 1, range.end.day);
  if (end < start) end.setFullYear(year + 1);
  return { start, end };
}

/** Inclusive day count for a month/day range. */
export function rangeDayCount(range: DateRange) {
  const { start, end } = resolveRangeDates(range, 2024);
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

/** "10/28 – 11/01" → the next 28 Oct from today (tour dates carry no year). */
export function departureOf(date?: string, now = new Date()) {
  const m = date?.match(/(\d{1,2})\/(\d{1,2})/);
  if (!m) return null;
  const d = new Date(now.getFullYear(), Number(m[1]) - 1, Number(m[2]));
  if (d.getTime() < now.getTime() - 86400000 * 120) d.setFullYear(d.getFullYear() + 1);
  return d;
}

export function daysUntil(date?: string, now = new Date()) {
  const dep = departureOf(date, now);
  return dep ? Math.ceil((dep.getTime() - now.getTime()) / 86400000) : null;
}

/** "11/03 – 11/10" → true from the departure day through the return day: the group is on the trip. */
export function isUnderway(date?: string, now = new Date()) {
  const [first, ...rest] = [...(date ?? "").matchAll(/(\d{1,2})\/(\d{1,2})/g)];
  const last = rest.at(-1);
  if (!first || !last) return false;
  const day = (m: RegExpMatchArray, year: number) => new Date(year, Number(m[1]) - 1, Number(m[2]));
  // A trip over New Year (12/28 – 01/03) seen in January started last year
  let start = day(first, now.getFullYear());
  if (start > now) start = day(first, now.getFullYear() - 1);
  const end = day(last, start.getFullYear());
  if (end < start) end.setFullYear(end.getFullYear() + 1);
  end.setHours(23, 59, 59);
  return start <= now && now <= end;
}
