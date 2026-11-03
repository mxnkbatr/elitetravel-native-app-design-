"use client";

import { destinations, formatPrice, isBookable, type TourSummary } from "@/data/tours";
import { cldImage } from "@/lib/cloudinary";
import { useTours } from "@/lib/content";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/** Text-free scenery for the stage — the tour posters carry their own lettering. */
const scenery: Record<string, { cover: string; flight: string; flightLabel: string; poster?: boolean }> = {
  hainan: { cover: cldImage("elitetravel/tours/tropical-aerial-coast"), flight: "5 цаг", flightLabel: "Шууд нислэг" },
  hongkong: { cover: cldImage("elitetravel/tours/hongkong-skyline"), flight: "4ц 40м", flightLabel: "Шууд нислэг" },
  bali: { cover: cldImage("elitetravel/tours/nusa-penida-kelingking"), flight: "Дамжин", flightLabel: "Нислэг" },
  // Only a lettered poster exists for Egypt — the stage dims it so our heading stays readable
  egypt: { cover: cldImage("elitetravel/tours/shakira-egypt"), flight: "—", flightLabel: "Нислэг", poster: true },
};

const buildItems = (tours: TourSummary[]) =>
  destinations.map((d) => {
  const list = tours.filter((t) => isBookable(t) && t.destinationKey === d.key);
  const from = list.reduce<number | null>((m, t) => (t.price && (!m || t.price < m) ? t.price : m), null);
  const href = list.length === 1 ? `/tours/${list[0].id}` : `/tours?dest=${d.key === "egypt" ? "soon" : d.key}`;
  return { ...d, ...scenery[d.key], count: list.length, from, href };
});

const CYCLE_MS = 5500;
const ease = [0.22, 1, 0.36, 1] as const;

function Stat({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="px-4 py-3 text-center first:pl-0 last:pr-0">
      <p className={`font-num text-lg leading-none ${accent ? "text-[#f3d199]" : ""}`}>{value}</p>
      <p className="mt-1.5 type-label text-white/60">{label}</p>
    </div>
  );
}

/** Destination switcher: a rich list on the left drives a cinematic photo stage. */
export function JourneyScroll() {
  const tours = useTours();
  const items = useMemo(() => buildItems(tours), [tours]);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const cur = items[active];

  useEffect(() => {
    if (paused) return;
    const id = window.setTimeout(() => setActive((i) => (i + 1) % items.length), CYCLE_MS);
    return () => window.clearTimeout(id);
  }, [active, paused, items.length]);

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
      {/* Desktop */}
      <div
        className="hidden gap-10 lg:grid lg:grid-cols-[0.95fr_1.35fr]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="flex flex-col">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.8, ease }}
          >
            <div className="flex items-center gap-3">
              <span className="epic-rule" />
              <p className="type-eyebrow text-accent">Destinations</p>
            </div>
            <h2 className="mt-4 font-display text-[clamp(2.6rem,4.6vw,3.9rem)] font-semibold leading-[0.95] tracking-[-0.04em]">
              Хаашаа <span className="italic text-accent">аялах</span> вэ?
            </h2>
            <p className="mt-4 max-w-sm text-[0.95rem] leading-relaxed text-muted">
              Улаанбаатараас шууд нислэгтэй далайн амралт, концерт аялал, арлын адал явдал.
            </p>
          </motion.div>

          <ul className="mt-8 space-y-1.5">
            {items.map((d, i) => {
              const on = i === active;
              return (
                <li key={d.key}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onFocus={() => setActive(i)}
                    onClick={() => setActive(i)}
                    className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl p-2.5 pr-4 text-left transition-colors duration-500 ${
                      on ? "bg-bg-elevated shadow-[0_12px_32px_rgba(6,42,42,0.08)]" : "hover:bg-bg-elevated/60"
                    }`}
                  >
                    <motion.div
                      animate={{ width: on ? 64 : 40, height: on ? 64 : 40, opacity: on ? 1 : 0.6 }}
                      transition={{ duration: 0.5, ease }}
                      className="relative shrink-0 overflow-hidden rounded-xl"
                    >
                      <Image src={d.cover} alt="" fill className="object-cover" sizes="64px" />
                    </motion.div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-display text-[1.9rem] font-semibold leading-none tracking-[-0.03em] transition-colors duration-500 ${
                          on ? "italic text-foam" : "text-foam/35 group-hover:text-foam/60"
                        }`}
                      >
                        {d.name}
                      </p>
                      <AnimatePresence initial={false}>
                        {on ? (
                          <motion.p
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.35 }}
                            className="overflow-hidden text-xs text-muted"
                          >
                            <span className="mt-1.5 block">
                              {d.count ? `${d.count} аялал` : "Тун удахгүй"}
                              {d.from ? <> · <span className="font-num text-accent">{formatPrice(d.from)}</span>-аас</> : null}
                            </span>
                          </motion.p>
                        ) : null}
                      </AnimatePresence>
                    </div>

                    <span
                      className={`grid size-9 shrink-0 place-items-center rounded-full text-sm transition-all duration-500 ${
                        on ? "bg-ink text-white" : "text-transparent"
                      }`}
                    >
                      →
                    </span>

                    {on && !paused ? (
                      <motion.span
                        key={`bar-${active}`}
                        className="absolute inset-x-3 bottom-0 h-[2px] origin-left rounded-full bg-accent/70"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: CYCLE_MS / 1000, ease: "linear" }}
                      />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>

          <Link href="/map" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent transition hover:gap-3">
            Бүх чиглэлийг газрын зураг дээр үзэх <span aria-hidden>→</span>
          </Link>
        </div>

        <Link href={cur.href} className="group relative block min-h-[600px] overflow-hidden rounded-[2.25rem] bg-[#062a2a]">
          <AnimatePresence initial={false}>
            <motion.div
              key={cur.key}
              className="absolute inset-0"
              initial={{ clipPath: "inset(0 0 0 100% round 2.25rem)" }}
              animate={{ clipPath: "inset(0 0 0 0% round 2.25rem)" }}
              exit={{ opacity: 0, transition: { delay: 0.6, duration: 0.2 } }}
              transition={{ duration: 1, ease }}
            >
              <motion.div
                className="absolute inset-0"
                initial={{ scale: 1.15 }}
                animate={{ scale: 1.02 }}
                transition={{ duration: CYCLE_MS / 1000 + 1.5, ease: "linear" }}
              >
                <Image src={cur.cover} alt={cur.name} fill className={`object-cover ${cur.poster ? "scale-110 blur-[3px] brightness-[0.45]" : ""}`} sizes="60vw" priority={active === 0} />
              </motion.div>
            </motion.div>
          </AnimatePresence>

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-black/25" />

          <div className="absolute left-7 top-7 flex items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1.5 type-eyebrow text-white backdrop-blur-md">
              {String(active + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
            </span>
          </div>

          <div className="absolute inset-x-0 bottom-0 p-7">
            <div className="overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.h3
                  key={cur.key}
                  initial={{ y: "105%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "-105%" }}
                  transition={{ duration: 0.6, ease }}
                  className="font-display text-[clamp(3.5rem,6vw,5.5rem)] font-semibold italic leading-[0.95] tracking-[-0.04em] text-white"
                >
                  {cur.name}
                </motion.h3>
              </AnimatePresence>
            </div>
            <AnimatePresence mode="wait">
              <motion.p
                key={cur.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="mt-2 max-w-md text-sm text-white/80"
              >
                {cur.blurb}
              </motion.p>
            </AnimatePresence>

            <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-white/15 bg-white/10 p-2 pl-5 text-white backdrop-blur-xl">
              <div className="grid grid-cols-3 divide-x divide-white/15">
                <Stat value={cur.flight} label={cur.flightLabel} />
                <Stat value={cur.count ? String(cur.count) : "—"} label="Аялал" />
                <Stat value={cur.from ? formatPrice(cur.from) : "Удахгүй"} label="Эхлэх үнэ" accent />
              </div>
              <span className="inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-ink transition duration-500 group-hover:bg-[#e8b86d]">
                {cur.count ? "Аялал үзэх" : "Дэлгэрэнгүй"}
                <span aria-hidden className="transition group-hover:translate-x-1">→</span>
              </span>
            </div>
          </div>
        </Link>
      </div>

      {/* Phone / tablet */}
      <div className="lg:hidden">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="epic-rule" />
              <p className="type-eyebrow text-accent">Destinations</p>
            </div>
            <h2 className="mt-3 font-display text-[2.5rem] font-semibold leading-[0.95] tracking-[-0.04em]">
              Хаашаа <span className="italic text-accent">аялах</span> вэ?
            </h2>
          </div>
          <Link href="/map" className="shrink-0 pb-1 text-sm font-semibold text-accent">
            Газрын зураг →
          </Link>
        </div>

        <div className="hide-scrollbar -mx-4 mt-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
          {items.map((d, i) => (
            <motion.div
              key={d.key}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.6, ease }}
              className="w-[80vw] shrink-0 snap-center sm:w-[46vw]"
            >
              <Link href={d.href} className="relative block aspect-[3/4] overflow-hidden rounded-[1.75rem] active:scale-[0.98]">
                <Image src={d.cover} alt={d.name} fill className="object-cover" sizes="(max-width:640px) 80vw, 46vw" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[0.68rem] font-semibold text-ink">
                  {d.count ? `${d.count} аялал` : "Удахгүй"}
                </span>
                <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                  <p className="font-display text-[2.6rem] font-semibold italic leading-none">{d.name}</p>
                  <p className="mt-1.5 text-xs text-white/75">{d.blurb}</p>
                  <div className="mt-3 grid grid-cols-2 divide-x divide-white/15 rounded-xl border border-white/15 bg-white/10 py-2 backdrop-blur-md">
                    <div className="text-center">
                      <p className="font-num text-sm">{d.flight}</p>
                      <p className="text-[0.55rem] uppercase tracking-[0.14em] text-white/60">{d.flightLabel}</p>
                    </div>
                    <div className="text-center">
                      <p className="font-num text-sm text-[#f3d199]">{d.from ? formatPrice(d.from) : "Удахгүй"}</p>
                      <p className="text-[0.55rem] uppercase tracking-[0.14em] text-white/60">Эхлэх үнэ</p>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
