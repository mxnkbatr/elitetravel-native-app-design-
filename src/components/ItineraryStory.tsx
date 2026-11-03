"use client";

import { Icon } from "@/components/Icon";
import type { ItineraryDay, Tour } from "@/data/tours";
import { cldImage } from "@/lib/cloudinary";
import { AnimatePresence, motion, useScroll, useSpring, useTransform } from "framer-motion";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";

const img = (name: string) => cldImage(`elitetravel/tours/${name}`);

/** Day photo by what the day is about; falls back to the tour cover. */
const dayRules: [RegExp, string][] = [
  [/Шилэн гүүр|Байшилин/, "day2-baishilin-glass-bridge"],
  [/Задгай далай/, "day4-open-sea-trip"],
  [/Атлантис/, "day5-atlantis-slide"],
  [/Сармагчин/, "day8-monkey-island"],
  [/Yacht/, "yacht-party-day4"],
  [/Comedy/, "comedy-show-day5"],
  [/Dately Show/, "dately-show-day3"],
  [/Викториа|хотын аялал/, "victoria-peak"],
  [/Монстер/, "monster-building"],
  [/Weeknd тоглолт|тоглолт$/, "weeknd-stage"],
  [/Lempuyang|Диваажин/, "lempuyang-temple"],
  [/Нуса Пенида|Kelingking/, "nusa-penida-kelingking"],
  [/Uluwatu/, "uluwatu-surf-temple"],
  [/Bali Swing|Kanto Lampo/, "bali-swing"],
  [/Tirta|ATV|Tegenungan/, "cretya-ubud"],
  [/Хонг Конг/, "hongkong-skyline"],
  [/Чөлөөт/, "day7-resort-pool"],
];

function dayImage(tour: Tour, day: ItineraryDay) {
  const text = `${day.title} ${day.detail}`;
  const hit = dayRules.find(([re]) => re.test(text));
  if (hit && !(tour.destinationKey === "bali" && hit[1] === "day7-resort-pool")) return img(hit[1]);
  if (tour.destinationKey === "bali") return img("cretya-ubud");
  return tour.gallery[0] ?? tour.image;
}

/**
 * Desktop itinerary: a sticky photo stage on the left follows the day you are reading
 * on the right, while a timeline fills and a plane rides it as you scroll.
 */
export function ItineraryStory({ tour, renderMeta }: { tour: Tour; renderMeta: (day: ItineraryDay) => ReactNode }) {
  const days = tour.itinerary;
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLOListElement>(null);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 60%", "end 60%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  const planeTop = useTransform(progress, (v) => `${Math.min(100, Math.max(0, v * 100))}%`);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.i));
        }
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    itemRefs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [days.length]);

  const day = days[active];
  const photo = day ? dayImage(tour, day) : tour.image;

  return (
    <div className="grid grid-cols-[0.95fr_1.05fr] gap-8">
      <div className="sticky top-28 h-[min(72vh,620px)] self-start overflow-hidden rounded-[1.75rem] bg-[#062a2a]">
        <AnimatePresence initial={false}>
          <motion.div
            key={photo + active}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.12 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <Image src={photo} alt={day?.title ?? tour.title} fill className="object-cover" sizes="30vw" />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />

        <div className="absolute left-5 top-5 rounded-full bg-white/15 px-3 py-1.5 type-eyebrow text-white backdrop-blur-md">
          {String(active + 1).padStart(2, "0")} / {String(days.length).padStart(2, "0")}
        </div>

        <div className="absolute inset-x-0 bottom-0 p-6 text-white">
          <AnimatePresence mode="wait">
            <motion.div key={active} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.4 }}>
              <p className="type-eyebrow text-[#f3d199]">{day?.day}</p>
              <p className="mt-1.5 font-display text-[1.9rem] font-semibold italic leading-[1.05] tracking-[-0.02em]">{day?.title}</p>
            </motion.div>
          </AnimatePresence>
          <div className="mt-4 flex gap-1">
            {days.map((d, i) => (
              <span key={d.day + i} className={`h-1 flex-1 rounded-full transition-colors duration-500 ${i <= active ? "bg-[#e8b86d]" : "bg-white/25"}`} />
            ))}
          </div>
        </div>
      </div>

      <ol ref={listRef} className="relative pl-10">
        <span className="absolute left-[11px] top-1 h-[calc(100%-0.5rem)] w-[2px] rounded-full bg-[var(--line)]" />
        <motion.span
          className="absolute left-[11px] top-1 w-[2px] origin-top rounded-full bg-accent"
          style={{ height: "calc(100% - 0.5rem)", scaleY: progress }}
        />
        <motion.span
          className="absolute left-[-1px] z-10 grid size-[26px] -translate-y-1/2 place-items-center rounded-full bg-ink text-[0.75rem] text-white shadow-lg"
          style={{ top: planeTop }}
          aria-hidden
        >
          <Icon name="plane" size={14} className="rotate-180" fill="currentColor" stroke="none" />
        </motion.span>

        {days.map((d, i) => (
          <li
            key={d.day + d.title}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            data-i={i}
            className={`relative min-h-[36vh] pb-10 transition-opacity duration-500 last:min-h-0 ${i === active ? "opacity-100" : "opacity-45"}`}
          >
            <span
              className={`absolute -left-[38px] top-0.5 grid size-6 place-items-center rounded-full text-[0.65rem] font-bold ring-4 ring-bg transition-colors duration-500 ${
                i <= active ? "bg-accent text-white" : "bg-bg-elevated text-muted"
              }`}
            >
              {i + 1}
            </span>
            <p className="type-label text-accent">{d.day}</p>
            <p className="mt-1 font-display text-2xl font-semibold leading-tight text-foam">{d.title}</p>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{d.detail}</p>
            {renderMeta(d)}
          </li>
        ))}
      </ol>
    </div>
  );
}
