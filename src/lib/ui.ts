import { useSyncExternalStore } from "react";

export function filterChipClass(active: boolean) {
  return [
    "shrink-0 rounded-full px-4 py-2.5 text-sm tracking-[0.01em] transition active:scale-95",
    active
      ? "bg-accent font-semibold text-white"
      : "bg-bg-elevated font-medium text-foam/70 ring-1 ring-[var(--line)] hover:text-foam",
  ].join(" ");
}

const noop = () => () => {};

/**
 * A value that only exists in the browser (the clock, a media query, the page's data
 * attributes). The server render and hydration see `fallback`; the browser then reads the
 * real value without an extra effect pass. `read` must return a primitive.
 */
export function useClientValue<T extends string | number | boolean | null>(read: () => T, fallback: T): T {
  return useSyncExternalStore(noop, read, () => fallback);
}
