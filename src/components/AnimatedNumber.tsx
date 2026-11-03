"use client";

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * A number that counts to its new value instead of jumping (prices as the party changes).
 * The server and first paint show the real value; only later changes animate.
 */
export function AnimatedNumber({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const shown = useRef(value);
  // React renders the first value only; after that the count writes the text itself, so a
  // re-render never flashes the final number before the animation starts
  const [first] = useState(value);
  const reduce = useReducedMotion();
  // Latest formatter without restarting the count when the parent re-renders
  const fmt = useRef(format);
  useEffect(() => {
    fmt.current = format;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || shown.current === value) return;
    if (reduce) {
      shown.current = value;
      el.textContent = fmt.current(value);
      return;
    }
    const controls = animate(shown.current, value, {
      duration: 0.55,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (n) => {
        shown.current = n;
        el.textContent = fmt.current(Math.round(n));
      },
    });
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <span ref={ref} className={`tabular-nums ${className ?? ""}`}>
      {format(first)}
    </span>
  );
}
