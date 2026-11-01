"use client";

import { AnimatePresence, motion } from "framer-motion";
import { INTRO_KEY } from "@/lib/intro";
import { useClientValue } from "@/lib/ui";
import { useEffect, useState } from "react";

const ARC = "M 40 150 C 140 40, 300 20, 420 70";
const ease = [0.22, 1, 0.36, 1] as const;
/** Same corner the phone menu opens from and closes into. */
const ORIGIN = "calc(100% - 3rem) 2.6rem";

/** When the brand starts leaving, and when the curtain itself lifts (ms). */
const LEAVE_MS = 2000;
export const INTRO_HOLD_MS = 2550;

/**
 * Brand mark → leaves row by row like the phone menu closing → curtain lifts.
 * Each element sits in its own mask so it slides out of view instead of fading.
 */
function Row({ leaving, order, children, className = "" }: { leaving: boolean; order: number; children: React.ReactNode; className?: string }) {
  return (
    <span className={`block overflow-hidden ${className}`}>
      <motion.span
        className="block"
        animate={leaving ? { y: "-110%", opacity: 0 } : { y: "0%", opacity: 1 }}
        transition={leaving ? { delay: order * 0.07, duration: 0.45, ease: [0.76, 0, 0.24, 1] } : { duration: 0 }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/** First-visit curtain: the brand E, a plane drawing its flight path, then the reveal. */
export function IntroCurtain() {
  // Set by the boot script before paint on a first visit (see lib/intro)
  const firstVisit = useClientValue(() => document.documentElement.dataset.intro === "1", false);
  const [lifted, setLifted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const show = firstVisit && !lifted;

  useEffect(() => {
    if (!firstVisit) return;
    const leave = window.setTimeout(() => setLeaving(true), LEAVE_MS);
    const lift = window.setTimeout(() => {
      setLifted(true);
      // Drop the static pre-paint cover now; the animated curtain still sits on top while it lifts
      delete document.documentElement.dataset.intro;
      try {
        sessionStorage.setItem(INTRO_KEY, "1");
      } catch {
        /* private mode — intro may replay, harmless */
      }
    }, INTRO_HOLD_MS);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(lift);
    };
  }, [firstVisit]);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="intro"
          className="intro-curtain fixed inset-0 z-[100] grid place-items-center bg-[#062a2a] text-[#f3e0c2]"
          // Closes like the phone menu: the sheet shrinks into the top-right corner (the ☰ spot)
          exit={{ clipPath: `circle(0% at ${ORIGIN})` }}
          transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1] }}
          style={{ clipPath: `circle(150% at ${ORIGIN})` }}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(46,196,182,0.18),transparent_60%)]" />
          <div className="relative flex flex-col items-center">
            <motion.svg
              width="460"
              height="190"
              viewBox="0 0 460 190"
              className="absolute -top-16 left-1/2 w-[min(460px,90vw)] -translate-x-1/2 overflow-visible"
              aria-hidden
              animate={leaving ? { opacity: 0, y: -24 } : { opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.76, 0, 0.24, 1] }}
            >
              <motion.path
                d={ARC}
                fill="none"
                stroke="#e8b86d"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="1 0"
                initial={{ pathLength: 0, opacity: 0.9 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.35, duration: 1.2, ease: [0.65, 0, 0.35, 1] }}
              />
              <motion.g
                initial={{ offsetDistance: "0%", opacity: 0 }}
                animate={{ offsetDistance: "100%", opacity: [0, 1, 1, 0] }}
                transition={{ delay: 0.35, duration: 1.2, ease: [0.65, 0, 0.35, 1] }}
                style={{ offsetPath: `path("${ARC}")`, offsetRotate: "auto 90deg" }}
              >
                <path
                  transform="translate(-12 -12)"
                  fill="#f3e0c2"
                  d="M21 15.5v-1.8l-8-5V3.6a1.6 1.6 0 0 0-3.2 0v5.1l-8 5v1.8l8-2.5v4.6l-2.2 1.7V21l3.8-1.1 3.8 1.1v-1.7l-2.2-1.7V13l8 2.5Z"
                />
              </motion.g>
            </motion.svg>

            <Row leaving={leaving} order={0}>
              <motion.span
                initial={{ y: 40, opacity: 0, scale: 0.9 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, ease }}
                className="block font-display text-[7rem] font-semibold leading-none"
              >
                E
              </motion.span>
            </Row>
            <Row leaving={leaving} order={1} className="mt-3">
              <motion.span
                initial={{ letterSpacing: "0.9em", opacity: 0 }}
                animate={{ letterSpacing: "0.42em", opacity: 1 }}
                transition={{ delay: 0.45, duration: 1, ease }}
                className="block pl-[0.42em] font-display text-2xl font-semibold uppercase"
              >
                Elite
              </motion.span>
            </Row>
            <Row leaving={leaving} order={2} className="mt-2">
              <motion.span
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 0.7, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="block text-[0.68rem] uppercase tracking-[0.5em]"
              >
                — Travel —
              </motion.span>
            </Row>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
