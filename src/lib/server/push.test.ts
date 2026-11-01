import { describe, expect, it } from "vitest";
import { fcmMessage, tokenGone } from "./push";

describe("fcmMessage", () => {
  it("carries the tap target, thread and sound for every platform", () => {
    const m = fcmMessage("tok", { title: "Elite Travel", body: "Сайн байна уу", url: "/bookings/ET-1", tag: "ET-1" }, "https://elitetravel.mn");
    expect(m.notification).toEqual({ title: "Elite Travel", body: "Сайн байна уу" });
    expect(m.data).toEqual({ url: "/bookings/ET-1", tag: "ET-1" });
    expect(m.apns.payload.aps).toEqual({ sound: "default", "thread-id": "ET-1" });
    expect(m.webpush?.fcm_options.link).toBe("https://elitetravel.mn/bookings/ET-1");
  });

  it("leaves out the web link when the site is not https (FCM would reject the message)", () => {
    const m = fcmMessage("tok", { title: "t", body: "b", url: "/admin" }, "http://localhost:3000");
    expect(m.webpush).toBeUndefined();
    expect(m.data).toEqual({ url: "/admin" });
  });

  it("shortens long bodies", () => {
    const m = fcmMessage("tok", { title: "t", body: "а".repeat(500), url: "/" });
    expect(m.notification.body.length).toBe(178);
    expect(m.notification.body.endsWith("…")).toBe(true);
  });
});

describe("tokenGone", () => {
  it("drops tokens FCM no longer knows", () => {
    expect(tokenGone(404, { error: { status: "NOT_FOUND", details: [{ errorCode: "UNREGISTERED" }] } })).toBe(true);
    expect(tokenGone(400, { error: { status: "INVALID_ARGUMENT", message: "The registration token is not a valid FCM registration token" } })).toBe(true);
  });

  it("keeps tokens on temporary or config errors", () => {
    expect(tokenGone(503, { error: { status: "UNAVAILABLE" } })).toBe(false);
    expect(tokenGone(401, { error: { status: "UNAUTHENTICATED" } })).toBe(false);
    expect(tokenGone(400, { error: { status: "INVALID_ARGUMENT", message: "Invalid JSON payload" } })).toBe(false);
  });
});
