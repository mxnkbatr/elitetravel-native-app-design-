"use client";

import { destinations, formatPrice, getTour, isBookable, type TourSummary } from "@/data/tours";
import { useTours } from "@/lib/content";
import { daysUntil } from "@/lib/dates";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

function buildMenu(tours: TourSummary[]) {
  const groups = destinations.map((d) => ({
    ...d,
    tours: tours.filter((t) => t.destinationKey === d.key || (d.key === "egypt" && t.id === "shakira-egypt")).filter((t) => t.status !== "ended"),
  }));

  const nextUp = tours
    .filter(isBookable)
    .map((t) => ({ t, days: daysUntil(t.dates) }))
    .filter((x) => x.days != null && x.days >= 0)
    .sort((a, b) => a.days! - b.days!)[0];

  const promo = getTour(tours, "bali");
  return { groups, nextUp, promo };
}

/** "Аяллууд" dropdown: pick a destination on the left, its tours fill the middle. */
export function MegaMenu({ onNavigate }: { onNavigate: () => void }) {
  const tours = useTours();
  const { groups, nextUp, promo } = useMemo(() => buildMenu(tours), [tours]);
  const [dest, setDest] = useState(groups[0].key);
  const group = groups.find((g) => g.key === dest) ?? groups[0];

  return (
    <div className="grid grid-cols-[210px_1fr_250px] gap-5 p-5">
      {/* Destinations */}
      <div>
        <p className="px-3 type-eyebrow text-muted">Чиглэл</p>
        <ul className="mt-2 space-y-0.5">
          {groups.map((g) => {
            const on = g.key === dest;
            return (
              <li key={g.key}>
                <button
                  type="button"
                  onMouseEnter={() => setDest(g.key)}
                  onFocus={() => setDest(g.key)}
                  className="relative flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left"
                >
                  {on ? <motion.span layoutId="mega-dest" className="absolute inset-0 rounded-xl bg-bg" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
                  <span className={`relative font-display text-xl font-semibold transition-colors ${on ? "italic text-foam" : "text-foam/50"}`}>{g.name}</span>
                  <span className={`relative text-xs transition-colors ${on ? "text-accent" : "text-muted/60"}`}>
                    {g.tours.filter(isBookable).length || "—"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <Link href="/map" onClick={onNavigate} className="mt-4 flex items-center gap-2 px-3 text-sm font-semibold text-accent transition hover:gap-3">
          Газрын зураг дээр <span aria-hidden>→</span>
        </Link>
      </div>

      {/* Tours of the destination */}
      <div className="min-w-0 border-x border-[var(--line)] px-5">
        <div className="flex items-baseline justify-between">
          <p className="type-eyebrow text-muted">{group.en} · аяллууд</p>
          <Link
            href={`/tours?dest=${group.key === "egypt" ? "soon" : group.key}`}
            onClick={onNavigate}
            className="text-xs font-semibold text-accent"
          >
            Бүгд →
          </Link>
        </div>
        <AnimatePresence mode="wait">
          <motion.ul
            key={group.key}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.22 }}
            className="mt-3 grid grid-cols-3 gap-3"
          >
            {group.tours.slice(0, 3).map((t, i) => (
              <motion.li key={t.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Link href={`/tours/${t.id}`} onClick={onNavigate} className="group block">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-accent-mist">
                    <Image src={t.image} alt="" fill className="object-cover transition duration-700 group-hover:scale-105" sizes="200px" />
                    {t.discount ? (
                      <span className="absolute left-2 top-2 rounded-md bg-accent px-1.5 py-0.5 text-[0.6rem] font-bold text-white">{t.discount}</span>
                    ) : null}
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug transition-colors group-hover:text-accent">{t.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">{t.dates ?? t.duration}</p>
                  <p className="mt-1 font-num text-sm text-accent">{formatPrice(t.price)}</p>
                </Link>
              </motion.li>
            ))}
            {!group.tours.length ? <li className="col-span-3 rounded-xl bg-bg p-6 text-sm text-muted">Шинэ аялал бэлтгэгдэж байна.</li> : null}
          </motion.ul>
        </AnimatePresence>
      </div>

      {/* Highlights */}
      <div className="space-y-3">
        {promo ? (
          <Link href={`/tours/${promo.id}`} onClick={onNavigate} className="group relative block overflow-hidden rounded-2xl">
            <div className="relative aspect-[5/4]">
              <Image src={promo.image} alt="" fill className="object-cover transition duration-700 group-hover:scale-105" sizes="250px" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
            </div>
            <div className="absolute inset-x-0 bottom-0 p-3.5 text-white">
              <span className="rounded-full bg-[#e8b86d] px-2 py-0.5 text-[0.6rem] font-bold text-ink">Урамшуулал {promo.discount}</span>
              <p className="mt-1.5 font-display text-lg font-semibold leading-tight">Бали — огноогоо өөрөө сонго</p>
            </div>
          </Link>
        ) : null}
        {nextUp ? (
          <Link href={`/tours/${nextUp.t.id}`} onClick={onNavigate} className="flex items-center gap-3 rounded-2xl bg-[#062a2a] p-3 text-white transition hover:bg-[#0a3a39]">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/10 text-center">
              {nextUp.days ? (
                <span className="font-num text-base leading-none text-[#e8b86d]">
                  {nextUp.days}
                  <span className="block text-[0.5rem] font-medium text-white/60">хоног</span>
                </span>
              ) : (
                <span className="text-[0.6rem] font-bold leading-tight text-[#e8b86d]">Өнөө-<br />дөр</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="type-eyebrow text-[#7ef0e0]">Удахгүй хөдлөх</p>
              <p className="truncate text-sm font-semibold">{nextUp.t.title}</p>
            </div>
          </Link>
        ) : null}
      </div>
    </div>
  );
}
