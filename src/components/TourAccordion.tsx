"use client";

import { SaveButton } from "@/components/SaveButton";
import { formatPrice, type TourSummary } from "@/data/tours";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

/** Desktop tour picker: slim panels that widen on hover to reveal the full card. */
export function TourAccordion({ tours }: { tours: TourSummary[] }) {
  const [open, setOpen] = useState(0);

  return (
    <div className="flex h-[540px] gap-3">
      {tours.map((t, i) => {
        const on = i === open;
        return (
          <motion.div
            key={t.id}
            layout
            onMouseEnter={() => setOpen(i)}
            onFocus={() => setOpen(i)}
            animate={{ flexGrow: on ? 5 : 1 }}
            transition={{ type: "spring", stiffness: 170, damping: 26 }}
            className="group relative min-w-0 basis-0 overflow-hidden rounded-[1.75rem] bg-[#062a2a]"
          >
            <Link href={`/tours/${t.id}`} className="absolute inset-0 block" aria-label={t.title}>
              <motion.div className="absolute inset-0" animate={{ scale: on ? 1 : 1.15 }} transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}>
                <Image src={t.image} alt="" fill className="object-cover" sizes="(max-width:1280px) 60vw, 720px" />
              </motion.div>
              <div
                className={`absolute inset-0 transition-colors duration-700 ${
                  on ? "bg-gradient-to-t from-black/85 via-black/15 to-black/10" : "bg-[#062a2a]/55"
                }`}
              />
            </Link>

            {/* Collapsed: vertical title */}
            <AnimatePresence>
              {!on ? (
                <motion.div
                  key="slim"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: { delay: 0.2 } }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  className="pointer-events-none absolute inset-0 flex flex-col items-center justify-between py-6 text-white"
                >
                  <span className="font-num text-sm text-white/70">0{i + 1}</span>
                  <span className="whitespace-nowrap font-display text-2xl font-semibold [writing-mode:vertical-rl] rotate-180">
                    {t.destination}
                  </span>
                  <span className="grid size-9 place-items-center rounded-full border border-white/30 text-sm">+</span>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Expanded: full card */}
            <AnimatePresence>
              {on ? (
                <motion.div
                  key="full"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.25, duration: 0.5, ease: [0.22, 1, 0.36, 1] } }}
                  exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  className="pointer-events-none absolute inset-0 flex flex-col justify-between p-7 text-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-white px-3 py-1 type-label text-ink">{t.destination}</span>
                      {t.discount ? <span className="rounded-full bg-accent px-3 py-1 text-[0.68rem] font-bold">{t.discount}</span> : null}
                      {t.tag === "hot" ? <span className="rounded-full bg-[#e8b86d] px-3 py-1 text-[0.68rem] font-bold text-ink">Эрэлттэй</span> : null}                    </div>
                    <SaveButton tourId={t.id} className="pointer-events-auto" />
                  </div>

                  <div>
                    <p className="type-eyebrow text-[#f3d199]">
                      {[t.dates, t.duration].filter(Boolean).join(" · ")}
                    </p>
                    <h3 className="mt-2 max-w-md font-display text-[2.6rem] font-semibold leading-[1] tracking-[-0.03em]">{t.title}</h3>
                    <p className="mt-3 max-w-md text-sm text-white/75">{t.highlights.slice(0, 3).join(" · ")}</p>
                    <div className="mt-5 flex items-end justify-between gap-4">
                      {t.price ? (
                        <div>
                          <p className="text-[0.62rem] uppercase tracking-[0.16em] text-white/60">Үнэ / хүн</p>
                          <div className="flex items-baseline gap-2">
                            <span className="font-num text-3xl text-[#f3d199]">{formatPrice(t.price)}</span>
                            {t.oldPrice ? <span className="text-sm text-white/50 line-through">{formatPrice(t.oldPrice)}</span> : null}
                          </div>
                        </div>
                      ) : (
                        // A coming-soon tour has no price yet
                        <p className="font-display text-2xl font-semibold text-[#f3d199]">Үнэ удахгүй зарлагдана</p>
                      )}
                      <Link
                        href={t.price ? `/tours/${t.id}#book` : `/tours/${t.id}`}
                        className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-ink transition hover:bg-[#e8b86d]"
                      >
                        {t.price ? "Захиалах" : "Дэлгэрэнгүй"} <span aria-hidden>→</span>
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
