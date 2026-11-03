"use client";

import { Icon } from "@/components/Icon";
import { haptic } from "@/lib/native";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

const TRIGGER = 72;
const MAX = 120;

/**
 * Pull down from the top of the page to refresh, like a native list. Touch only; the content
 * follows the finger with resistance, a spinner turns as it fills, and releasing past the line
 * runs `onRefresh` while the spinner keeps turning.
 */
export function PullToRefresh({ onRefresh, children }: { onRefresh: () => Promise<unknown>; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const y = useMotionValue(0);
  const [busy, setBusy] = useState(false);
  // The touch handlers live outside React renders, so they read busy from a ref
  const busyRef = useRef(false);
  const progress = useTransform(y, [0, TRIGGER], [0, 1]);
  const rotate = useTransform(y, [0, MAX], [0, 270]);
  const opacity = useTransform(y, [0, 24, TRIGGER], [0, 0.6, 1]);
  const run = useRef(onRefresh);
  useEffect(() => {
    run.current = onRefresh;
  });

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    let start: number | null = null;
    let armed = false;

    const onStart = (e: TouchEvent) => {
      start = window.scrollY <= 0 && !busyRef.current ? e.touches[0].clientY : null;
      armed = false;
    };
    const onMove = (e: TouchEvent) => {
      if (start == null) return;
      const dy = e.touches[0].clientY - start;
      if (dy <= 0 || window.scrollY > 0) {
        y.set(0);
        return;
      }
      // Rubber band: the further you pull, the less it moves
      const pulled = Math.min(MAX, dy * 0.5);
      y.set(pulled);
      if (!armed && pulled >= TRIGGER) {
        armed = true;
        haptic("tap");
      } else if (armed && pulled < TRIGGER) armed = false;
    };
    const onEnd = () => {
      if (start == null) return;
      start = null;
      if (!armed) {
        animate(y, 0, { type: "spring", stiffness: 400, damping: 34 });
        return;
      }
      busyRef.current = true;
      setBusy(true);
      animate(y, 56, { type: "spring", stiffness: 400, damping: 34 });
      void Promise.resolve(run.current())
        .catch(() => {})
        .finally(() => {
          busyRef.current = false;
          setBusy(false);
          haptic("success");
          animate(y, 0, { type: "spring", stiffness: 300, damping: 30 });
        });
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [y]);

  return (
    <div ref={root} className="relative">
      <motion.div style={{ opacity }} className="pointer-events-none absolute inset-x-0 top-1 z-10 flex justify-center" aria-hidden={!busy} role="status">
        <motion.span style={{ rotate: busy ? undefined : rotate }} className={`grid size-9 place-items-center rounded-full bg-card text-accent shadow-[var(--shadow)] ${busy ? "animate-spin" : ""}`}>
          <motion.span style={{ scale: progress }}>
            <Icon name="refresh" size={18} strokeWidth={2.2} />
          </motion.span>
        </motion.span>
        {busy ? <span className="sr-only">Шинэчилж байна</span> : null}
      </motion.div>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  );
}
