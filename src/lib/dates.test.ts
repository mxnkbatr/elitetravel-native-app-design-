import { describe, expect, it } from "vitest";
import { formatDateRange, isUnderway, joinDateRanges, parseDateRange, parseDateRanges, rangeDayCount } from "./dates";

describe("isUnderway", () => {
  const at = (iso: string) => new Date(`${iso}T12:00:00`);

  it("is true from departure through the return day", () => {
    expect(isUnderway("11/03 – 11/10", at("2026-11-03"))).toBe(true);
    expect(isUnderway("11/03 – 11/10", at("2026-11-10"))).toBe(true);
  });

  it("is false before departure and after return", () => {
    expect(isUnderway("11/03 – 11/10", at("2026-11-02"))).toBe(false);
    expect(isUnderway("11/03 – 11/10", at("2026-11-11"))).toBe(false);
  });

  it("handles a trip over New Year", () => {
    expect(isUnderway("12/28 – 01/03", at("2027-01-02"))).toBe(true);
    expect(isUnderway("12/28 – 01/03", at("2026-12-29"))).toBe(true);
  });

  it("needs both ends of the range", () => {
    expect(isUnderway("11/03", at("2026-11-03"))).toBe(false);
    expect(isUnderway(undefined)).toBe(false);
  });
});

describe("parseDateRanges", () => {
  it("parses one and many departures", () => {
    expect(parseDateRange("11/03 – 11/10")).toEqual({
      start: { month: 11, day: 3 },
      end: { month: 11, day: 10 },
    });
    expect(parseDateRanges("10/06–10/13 · 10/13–10/20 · 10/20–10/27")).toHaveLength(3);
    expect(joinDateRanges(parseDateRanges("11/03–11/10")!)).toBe("11/03 – 11/10");
  });

  it("skips free-text labels", () => {
    expect(parseDateRanges("Хүссэн үедээ")).toEqual([]);
    expect(formatDateRange({ start: { month: 1, day: 1 }, end: { month: 1, day: 8 } })).toBe("01/01 – 01/08");
    expect(rangeDayCount({ start: { month: 11, day: 3 }, end: { month: 11, day: 10 } })).toBe(8);
  });
});
