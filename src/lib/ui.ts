import { useEffect, useState, useSyncExternalStore } from "react";

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

/** Whether a media query matches, kept live. `null` during the server render and hydration. */
export function useMediaQuery(query: string): boolean | null {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => null,
  );
}

let navigated = false;

/** Called by PageTransition when the visitor moves to another page inside the site. */
export function markNavigated() {
  navigated = true;
}

/**
 * True once the visitor has moved between pages in this tab. Pages reached that way are already
 * brought in by the route transition, so they skip their own entrance reveal.
 */
export function hasNavigated() {
  return navigated;
}

/**
 * True for a moment after `key` changes (a filter or sort), false otherwise. Lists pass it to
 * framer-motion's `layout`, so cards glide into their new order when filtered, but leaving the
 * page does not make framer measure every card first (that held tour pages back ~1s on phones).
 */
export function useReflow(key: unknown, ms = 700) {
  const [last, setLast] = useState(key);
  const [on, setOn] = useState(false);
  if (key !== last) {
    setLast(key);
    setOn(true);
  }
  useEffect(() => {
    if (!on) return;
    const id = window.setTimeout(() => setOn(false), ms);
    return () => window.clearTimeout(id);
  }, [on, ms]);
  return on;
}
