import { describe, expect, it } from "vitest";
import { isUnderway } from "./dates";

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
