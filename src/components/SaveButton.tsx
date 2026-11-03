"use client";

import { haptic } from "@/lib/native";
import { toggleSaved, useTraveller } from "@/lib/traveller-store";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useState, type MouseEvent } from "react";

const HEART = "M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z";
const BURST = ["#e5484d", "#e8b86d", "#ff8fa3", "#14b8a6", "#e5484d", "#f3d199", "#ff8fa3", "#e8b86d"];

/**
 * Heart toggle for saving a tour: pops, throws a ring of sparks and taps the phone when saved.
 * "photo" (default) is a white disc for sitting on images; "plain" follows the page theme.
 */
export function SaveButton({ tourId, className = "", variant = "photo" }: { tourId: string; className?: string; variant?: "photo" | "plain" }) {
  const { saved } = useTraveller();
  const on = saved.includes(tourId);
  const reduce = useReducedMotion();
  // Each new save replays the burst; un-saving does not
  const [bursts, setBursts] = useState(0);

  function onClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!on) {
      setBursts((n) => n + 1);
      haptic("press");
    } else haptic("tap");
    toggleSaved(tourId);
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.8 }}
      aria-pressed={on}
      aria-label={on ? "Хадгалснаас хасах" : "Аяллыг хадгалах"}
      data-no-press
      className={`grid size-9 place-items-center rounded-full transition ${variant === "photo" ? "bg-white/90 text-ink shadow-sm backdrop-blur-md hover:bg-white" : "text-foam"} ${className}`}
    >
      <motion.svg
        key={on ? "on" : "off"}
        width="18"
        height="18"
        viewBox="0 0 24 24"
        aria-hidden
        initial={on && !reduce ? { scale: 0.4 } : false}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 500, damping: 12 }}
        className="relative z-10"
      >
        <path d={HEART} fill={on ? "#e5484d" : "none"} stroke={on ? "#e5484d" : "currentColor"} strokeWidth="1.7" strokeLinejoin="round" />
      </motion.svg>

      <AnimatePresence>
        {on && bursts && !reduce ? (
          <motion.span key={bursts} className="pointer-events-none absolute inset-0" initial={{ opacity: 1 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.span
              className="absolute inset-0 rounded-full ring-2 ring-[#e5484d]"
              initial={{ scale: 0.6, opacity: 0.9 }}
              animate={{ scale: 1.9, opacity: 0 }}
              transition={{ duration: 0.55 }}
            />
            {BURST.map((color, i) => {
              const a = (i / BURST.length) * Math.PI * 2;
              return (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-1/2 size-1.5 rounded-full"
                  style={{ background: color, marginLeft: -3, marginTop: -3 }}
                  initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                  animate={{ x: Math.cos(a) * 24, y: Math.sin(a) * 24, scale: 0, opacity: 0 }}
                  transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                />
              );
            })}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.button>
  );
}
