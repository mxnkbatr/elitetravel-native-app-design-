"use client";

import { useTraveller } from "@/lib/traveller-store";
import type { TripSummary } from "@/lib/trips";
import { useEffect, useSyncExternalStore } from "react";

/** Server status + unread count per booking id, shared by every component that shows a trip. */
let summaries: Record<string, TripSummary> = {};
const EMPTY: Record<string, TripSummary> = {};
const listeners = new Set<() => void>();
let inflight: Promise<void> | null = null;

function emit(next: Record<string, TripSummary>) {
  summaries = next;
  listeners.forEach((l) => l());
}

function refresh(tokens: string[]) {
  // A pull-to-refresh during the minute tick waits for the request already on its way
  inflight ??= load(tokens).finally(() => {
    inflight = null;
  });
  return inflight;
}

async function load(tokens: string[]) {
  try {
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokens }),
      cache: "no-store",
    });
    if (res.ok) emit(Object.fromEntries(((await res.json()) as TripSummary[]).map((s) => [s.id, s])));
  } catch {
    // Offline: keep the last known state
  }
}

/** Fetches every booking's status and unread count now (pull to refresh). */
export function refreshTrips(tokens: string[]) {
  return tokens.length ? refresh(tokens) : Promise.resolve();
}

export function markTripSeen(id: string) {
  const s = summaries[id];
  if (s?.unread) emit({ ...summaries, [id]: { ...s, unread: 0 } });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Keeps summaries fresh (every minute while the app is in front) for the bookings on this device. */
export function useTripSummaries() {
  const { bookings } = useTraveller();
  const key = bookings
    .map((b) => b.token)
    .filter(Boolean)
    .join(",");

  useEffect(() => {
    if (!key) return;
    const tokens = key.split(",");
    const tick = () => {
      if (document.visibilityState === "visible") void refresh(tokens);
    };
    void refresh(tokens);
    const id = window.setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [key]);

  return useSyncExternalStore(subscribe, () => summaries, () => EMPTY);
}
