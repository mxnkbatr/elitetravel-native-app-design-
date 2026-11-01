import { passengerIssue, payOptions, progressOf } from "@/lib/trips";
import { describe, expect, it } from "vitest";

describe("payOptions", () => {
  it("offers deposit and full payment before anything is paid", () => {
    expect(payOptions("new", 10_000_000, 3_000_000, 0)).toEqual([
      { kind: "deposit", label: "Урьдчилгаа", amount: 3_000_000 },
      { kind: "full", label: "Бүтэн төлөх", amount: 10_000_000 },
    ]);
  });

  it("offers only the balance once the deposit is paid", () => {
    expect(payOptions("confirmed", 10_000_000, 3_000_000, 3_000_000)).toEqual([{ kind: "balance", label: "Үлдэгдэл", amount: 7_000_000 }]);
  });

  it("asks for the rest of the deposit after a partial payment", () => {
    expect(payOptions("confirmed", 10_000_000, 3_000_000, 1_000_000)[0]).toEqual({ kind: "deposit", label: "Урьдчилгаа", amount: 2_000_000 });
  });

  it("offers nothing for waitlisted, cancelled or fully paid bookings", () => {
    expect(payOptions("waitlist", 10_000_000, 3_000_000, 0)).toEqual([]);
    expect(payOptions("cancelled", 10_000_000, 3_000_000, 0)).toEqual([]);
    expect(payOptions("confirmed", 10_000_000, 3_000_000, 10_000_000)).toEqual([]);
  });

  it("goes straight to full payment when the tour has no deposit", () => {
    expect(payOptions("new", 5_000_000, 0, 0)).toEqual([{ kind: "full", label: "Бүтэн төлөх", amount: 5_000_000 }]);
  });
});

describe("progressOf", () => {
  it("fills the steps request → contacted → confirmed → paid", () => {
    expect(progressOf(undefined)).toBe(1);
    expect(progressOf("new")).toBe(1);
    expect(progressOf("contacted")).toBe(2);
    expect(progressOf("confirmed", 0, 100)).toBe(3);
    expect(progressOf("confirmed", 30, 100)).toBe(4);
    expect(progressOf("paid", 100, 100)).toBe(4);
  });
});

describe("passengerIssue", () => {
  const now = new Date("2026-11-01T00:00:00");
  const ready = { name: "BAT ERDENE", passport: "E1234567", birth: "1990-01-01", expiry: "2030-01-01" };

  it("accepts a complete passport valid six months past departure", () => {
    expect(passengerIssue(ready, "11/10 – 11/17", now)).toBeNull();
  });

  it("flags missing details", () => {
    expect(passengerIssue({ name: "BAT" }, "11/10", now)).toBe("Мэдээлэл дутуу");
  });

  it("flags passports expiring within six months of departure", () => {
    expect(passengerIssue({ ...ready, expiry: "2027-03-01" }, "11/10 – 11/17", now)).toBe("Паспортын хугацаа 6 сараас бага үлдэнэ");
  });
});
