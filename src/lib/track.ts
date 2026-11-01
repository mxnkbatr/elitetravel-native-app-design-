"use client";

import type { Device, EventType } from "@/lib/analytics";

/**
 * Anonymous visit tracking for the site's own reports. A random visitor id lives in
 * localStorage, a session id in sessionStorage (new after 30 idle minutes). No cookies,
 * no names or phone numbers; browsers that send Do Not Track are skipped.
 */

const VISITOR = "elite-vid";
const SESSION = "elite-sid";
const IDLE_MS = 30 * 60_000;

const randomId = (prefix: string) => `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;

function ids() {
  let visitor = localStorage.getItem(VISITOR);
  if (!visitor) {
    visitor = randomId("v");
    localStorage.setItem(VISITOR, visitor);
  }
  const now = Date.now();
  const [id, last] = (sessionStorage.getItem(SESSION) ?? "").split("|");
  const session = id && now - Number(last) < IDLE_MS ? id : randomId("s");
  sessionStorage.setItem(SESSION, `${session}|${now}`);
  return { visitor, session, fresh: session !== id };
}

function device(): Device {
  if (document.documentElement.classList.contains("elite-app") || "Capacitor" in window) return "app";
  const w = window.innerWidth;
  return w < 640 ? "phone" : w < 1024 ? "tablet" : "desktop";
}

export function track(type: EventType, extra: { tour?: string } = {}) {
  try {
    if (navigator.doNotTrack === "1") return;
    const { visitor, session, fresh } = ids();
    const params = new URLSearchParams(location.search);
    const payload = JSON.stringify({
      visitor,
      session,
      type,
      path: location.pathname,
      tour: extra.tour,
      device: device(),
      // Where the visit came from matters only on its first event
      referrer: fresh ? document.referrer : "",
      utm_source: fresh ? params.get("utm_source") : null,
      utm_campaign: fresh ? params.get("utm_campaign") : null,
    });
    if (!navigator.sendBeacon?.("/api/track", payload)) {
      void fetch("/api/track", { method: "POST", body: payload, keepalive: true }).catch(() => {});
    }
  } catch {
    // Storage blocked (private mode) — analytics is best effort
  }
}

const once = new Set<string>();

/** Like track(), but at most once per page load for the same key (e.g. opening a form). */
export function trackOnce(key: string, type: EventType, extra: { tour?: string } = {}) {
  if (once.has(key)) return;
  once.add(key);
  track(type, extra);
}
