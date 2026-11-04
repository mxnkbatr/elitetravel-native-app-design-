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
