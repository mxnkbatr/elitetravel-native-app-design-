"use client";

import { BookingPlanner } from "@/components/BookingPlanner";
import { Sheet } from "@/components/Sheet";
import type { Tour } from "@/data/tours";
import { scrollToY } from "@/lib/scroll";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

export const tourSections = [
  { id: "overview", label: "Тойм" },
  { id: "itinerary", label: "Хөтөлбөр" },
  { id: "included", label: "Багтсан" },
] as const;

/** Phone-only tab bar that sticks under the status bar and tracks the section in view. */
export function TourTabs({ onPrice }: { onPrice: () => void }) {
  const [active, setActive] = useState<string>(tourSections[0].id);

  useEffect(() => {
    const els = tourSections.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-35% 0px -55% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  function go(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    scrollToY(el.getBoundingClientRect().top + window.scrollY - 72);
  }

  return (
    <div className="sticky top-[calc(0.5rem+env(safe-area-inset-top))] z-40 -mx-1 mt-4 sm:hidden">
      <div className="flex gap-1 rounded-full border border-[var(--line)] bg-bg-elevated/90 p-1 shadow-[0_8px_24px_rgba(6,42,42,0.08)] backdrop-blur-xl">
        {tourSections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => go(s.id)}
            className={`relative flex-1 rounded-full py-2 text-[0.8rem] font-semibold transition-colors ${active === s.id ? "text-white" : "text-muted"}`}
          >
            {active === s.id ? (
              <motion.span layoutId="tour-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
            ) : null}
            <span className="relative">{s.label}</span>
          </button>
        ))}
        <button type="button" onClick={onPrice} className="flex-1 rounded-full bg-accent/10 py-2 text-[0.8rem] font-semibold text-accent">
          Үнэ
        </button>
      </div>
    </div>
  );
}

/** Booking sheet — opens only after «Захиалах»; phone bottom sheet / desktop dialog. */
export function BookingSheet({ tour, open, onClose }: { tour: Tour; open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} tall title={<span className="block truncate">{tour.title}</span>} label="Захиалга">
      <div className="pt-2">
        <BookingPlanner tour={tour} variant="sheet" />
      </div>
    </Sheet>
  );
}
