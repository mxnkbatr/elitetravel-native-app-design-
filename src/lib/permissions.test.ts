import { can, homeFor, routePermission } from "@/lib/permissions";
import { describe, expect, it } from "vitest";

describe("permissions", () => {
  it("lets the owner do everything", () => {
    expect(can("owner", "staff.manage")).toBe(true);
    expect(can("owner", "money.manage")).toBe(true);
  });

  it("keeps sales away from money and finance away from bookings changes", () => {
    expect(can("sales", "bookings.manage")).toBe(true);
    expect(can("sales", "money.manage")).toBe(false);
    expect(can("finance", "money.manage")).toBe(true);
    expect(can("finance", "bookings.manage")).toBe(false);
    expect(can("finance", "passports.view")).toBe(false);
  });

  it("keeps content editors to content", () => {
    expect(can("content", "content.manage")).toBe(true);
    expect(can("content", "bookings.view")).toBe(false);
    expect(homeFor("content")).toBe("/admin/tours");
  });

  it("denies unknown staff", () => {
    expect(can(null, "bookings.view")).toBe(false);
  });

  it("maps screens to permissions", () => {
    expect(routePermission("/admin")).toBe("bookings.view");
    expect(routePermission("/admin/payments")).toBe("money.manage");
    expect(routePermission("/admin/tours/bali")).toBe("content.manage");
    expect(routePermission("/admin/staff")).toBe("staff.manage");
    expect(routePermission("/admin/agent")).toBe("agent.use");
  });

  it("opens the AI assistant to every role", () => {
    for (const role of ["owner", "sales", "finance", "content"] as const) expect(can(role, "agent.use")).toBe(true);
  });
});
