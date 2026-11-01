"use client";

import { bookingTokens } from "@/lib/traveller-store";
import type { PluginListenerHandle } from "@capacitor/core";

/**
 * Push notifications in the native app (iOS first). The app loads the live site, so this
 * code talks to the @capacitor-firebase/messaging plugin through the Capacitor bridge.
 * In a browser, or in an app build without the plugin, everything reports "unavailable".
 */

type Permission = "prompt" | "prompt-with-rationale" | "granted" | "denied";
type Tapped = { notification: { data?: unknown } };
type Messaging = {
  checkPermissions(): Promise<{ receive: Permission }>;
  requestPermissions(): Promise<{ receive: Permission }>;
  getToken(): Promise<{ token: string }>;
  deleteToken(): Promise<void>;
  addListener(event: "tokenReceived", cb: (e: { token: string }) => void): Promise<PluginListenerHandle>;
  addListener(event: "notificationActionPerformed", cb: (e: Tapped) => void): Promise<PluginListenerHandle>;
};

export type PushState = "unavailable" | "prompt" | "granted" | "denied";

const STAFF_KEY = "elite-push-staff";
let plugin: Promise<{ m: Messaging; platform: string } | null> | null = null;

function messaging() {
  plugin ??= (async () => {
    // The native bridge defines window.Capacitor; plain browsers skip loading anything
    if (typeof window === "undefined" || !("Capacitor" in window)) return null;
    const { Capacitor, registerPlugin } = await import("@capacitor/core");
    if (!Capacitor.isNativePlatform() || !Capacitor.isPluginAvailable("FirebaseMessaging")) return null;
    return { m: registerPlugin<Messaging>("FirebaseMessaging"), platform: Capacitor.getPlatform() };
  })().catch(() => null);
  return plugin;
}

const toState = (p: Permission): PushState => (p === "granted" ? "granted" : p === "denied" ? "denied" : "prompt");

export async function pushState(): Promise<PushState> {
  const native = await messaging();
  if (!native) return "unavailable";
  return toState((await native.m.checkPermissions()).receive);
}

const staffWanted = () => localStorage.getItem(STAFF_KEY) === "1";

/** Sends this device's token and the bookings it follows to the server. */
async function register(token?: string) {
  const native = await messaging();
  if (!native) return;
  const value = token ?? (await native.m.getToken()).token;
  await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: value, platform: native.platform, tripTokens: bookingTokens(), staff: staffWanted() }),
  });
}

/** Asks for permission (from a tap) and registers. `staff` also sends admin alerts to this phone. */
export async function enablePush(opts: { staff?: boolean } = {}): Promise<PushState> {
  const native = await messaging();
  if (!native) return "unavailable";
  let { receive } = await native.m.checkPermissions();
  if (receive === "prompt" || receive === "prompt-with-rationale") ({ receive } = await native.m.requestPermissions());
  if (receive !== "granted") return toState(receive);
  if (opts.staff) localStorage.setItem(STAFF_KEY, "1");
  await register();
  return "granted";
}

/** Stops admin alerts on this phone; traveller notifications stay on. */
export async function disableStaffPush() {
  localStorage.removeItem(STAFF_KEY);
  if ((await pushState()) === "granted") await register();
}

export const staffPushOn = () => typeof window !== "undefined" && staffWanted();

/**
 * App start: re-registers when permission was already given (new bookings, rotated tokens)
 * and opens the page a tapped notification points to. Returns a cleanup function.
 */
export async function startPush(navigate: (path: string) => void) {
  const native = await messaging();
  if (!native) return () => {};
  const handles = await Promise.all([
    native.m.addListener("notificationActionPerformed", ({ notification }) => {
      const url = (notification.data as { url?: unknown } | undefined)?.url;
      if (typeof url === "string" && url.startsWith("/")) navigate(url);
    }),
    native.m.addListener("tokenReceived", ({ token }) => void register(token).catch(() => {})),
  ]);
  if ((await native.m.checkPermissions()).receive === "granted") await register().catch(() => {});
  return () => handles.forEach((h) => void h.remove());
}

/** Re-sends the booking list after the traveller books again on this device. */
export async function refreshPushBookings() {
  if ((await pushState()) === "granted") await register().catch(() => {});
}
