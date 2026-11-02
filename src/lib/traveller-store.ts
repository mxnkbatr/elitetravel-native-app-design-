"use client";

import { useSyncExternalStore } from "react";

/**
 * On-device traveller data: saved tours and booking requests. Requests saved online
 * carry an access token, the only key to their status, chat and payments on the server.
 */

export type BookingRequest = {
  id: string;
  tourId: string;
  createdAt: string;
  name: string;
  phone: string;
  date?: string;
  adults: number;
  kidsOwnBed: number;
  kidsSharedBed: number;
  singleRooms: number;
  total: number;
  deposit: number;
  note?: string;
  /** True once the Elite Travel team has it in the bookings database */
  synced?: boolean;
  token?: string;
};

type State = { saved: string[]; bookings: BookingRequest[] };

const KEY = "elite-traveller-v1";
const EMPTY: State = { saved: [], bookings: [] };
const listeners = new Set<() => void>();
let cache: State | null = null;

function read(): State {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...EMPTY, ...(JSON.parse(raw) as State) } : EMPTY;
  } catch {
    cache = EMPTY;
  }
  return cache;
}

function write(next: State) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private mode / storage full — keep the in-memory copy for this session.
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useTraveller() {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** Access tokens of every booking saved online from this device. */
export function bookingTokens() {
  return read()
    .bookings.map((b) => b.token)
    .filter((t): t is string => !!t);
}

export const onTravellerChange = subscribe;

export function toggleSaved(tourId: string) {
  const s = read();
  const saved = s.saved.includes(tourId) ? s.saved.filter((id) => id !== tourId) : [tourId, ...s.saved];
  write({ ...s, saved });
}

/** Keeps a copy on the device; `id` is the server's reference when the request was saved online. */
export function addBooking(b: Omit<BookingRequest, "id" | "createdAt"> & { id?: string }) {
  const s = read();
  const booking: BookingRequest = {
    ...b,
    id: b.id ?? `ET-${Date.now().toString(36).toUpperCase()}`,
    createdAt: new Date().toISOString(),
  };
  write({ ...s, bookings: [booking, ...s.bookings] });
  return booking;
}

/** Brings an account's bookings and saved tours onto this device; nothing already here is dropped. */
export function mergeAccount(bookings: BookingRequest[], saved: string[]) {
  const s = read();
  const have = new Set(s.bookings.map((b) => b.id));
  const added = bookings.filter((b) => !have.has(b.id));
  const mergedSaved = [...new Set([...s.saved, ...saved])];
  if (!added.length && mergedSaved.length === s.saved.length) return;
  write({ saved: mergedSaved, bookings: [...s.bookings, ...added].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) });
}

export const savedTours = () => read().saved;

export function removeBooking(id: string) {
  const s = read();
  write({ ...s, bookings: s.bookings.filter((b) => b.id !== id) });
}
