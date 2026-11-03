"use client";

import { SaveButton } from "@/components/SaveButton";
import { formatPrice } from "@/data/tours";
import { useTours } from "@/lib/content";

import { filterChipClass } from "@/lib/ui";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

const filters = [
  { key: "all", label: "Бүгд" },
  { key: "hainan", label: "Хайнань" },
  { key: "hongkong", label: "Хонг Конг" },
  { key: "bali", label: "Бали" },
  { key: "soon", label: "Удахгүй" },
] as const;

type ToursProps = {
  showHeader?: boolean;
  limit?: number;
  initialFilter?: string;
};

export function Tours({
  showHeader = true,
  limit,
  initialFilter = "all",
}: ToursProps) {
  const tours = useTours();
  const start = filters.some((f) => f.key === initialFilter) ? initialFilter : "all";
  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>(
    start as (typeof filters)[number]["key"],
  );

  // A new ?dest= in the URL resets the chip
  const [filterFrom, setFilterFrom] = useState(initialFilter);
  if (filterFrom !== initialFilter) {
    setFilterFrom(initialFilter);
    if (filters.some((f) => f.key === initialFilter)) setFilter(initialFilter as (typeof filters)[number]["key"]);
  }

  const visible = useMemo(() => {
    const list =
      (filter === "all" ? tours : tours.filter((t) => t.destinationKey === filter)).filter((t) => t.status !== "ended");
    return typeof limit === "number" ? list.slice(0, limit) : list;
  }, [tours, filter, limit]);

  return (
    <section>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        {showHeader ? (
          <motion.div
            className="mb-6 flex items-end justify-between gap-4"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="max-w-xl">
              <div className="epic-rule mb-4" />
              <p className="type-eyebrow text-accent">
                Tours
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                Аяллууд
              </h2>
              <p className="mt-3 text-sm text-muted sm:text-base">
                elitetravel.mn дээрх бодит аяллууд — үнэ, огноо шинэчлэгдсэн.
              </p>
            </div>
          </motion.div>
        ) : null}

        <div className="hide-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={filterChipClass(filter === f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((tour, i) => (
              <motion.article
                layout
                key={tour.id}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: Math.min(i, 5) * 0.04, duration: 0.4 }}
                className="epic-card group"
              >
                <Link href={`/tours/${tour.id}`} className="block">
                  <div className="relative aspect-[16/11] overflow-hidden">
                    <Image
                      src={tour.image}
                      alt={tour.title}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-105"
                      sizes="(max-width:768px) 100vw, 33vw"
                    />
                    <SaveButton tourId={tour.id} className="absolute right-3 top-3 z-10" />
                    <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                      {tour.discount ? (
                        <span className="rounded-full bg-accent px-2.5 py-1 text-[0.7rem] font-semibold text-white">
                          {tour.discount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="space-y-3 p-4 sm:p-5">
                    <div>
                      <p className="type-label text-accent">
                        {tour.destination}
                      </p>
                      <h3 className="mt-1 font-display text-xl font-semibold leading-snug tracking-[-0.02em]">
                        {tour.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-sm text-muted">{tour.description}</p>
                    </div>
                    <div className="flex items-end justify-between gap-3 border-t border-[var(--line)] pt-3">
                      <div>
                        <p className="text-xs text-muted">{tour.duration}</p>
                        <p className="mt-0.5 text-base font-semibold text-accent">
                          {formatPrice(tour.price)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-accent">Дэлгэрэнгүй →</span>
                    </div>
                  </div>
                </Link>
              </motion.article>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
