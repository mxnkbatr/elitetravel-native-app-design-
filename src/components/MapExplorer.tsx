"use client";

import { DestinationMap } from "@/components/DestinationMap";
import { destinations, formatPrice, isBookable } from "@/data/tours";
import { useTours } from "@/lib/content";
import { AnimatePresence, motion, type PanInfo } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClientValue } from "@/lib/ui";
import { useState } from "react";

const flight: Record<string, { time: string; label: string }> = {
  hainan: { time: "5 цаг", label: "Шууд нислэг" },
  hongkong: { time: "4ц 40м", label: "Шууд нислэг" },
  bali: { time: "Дамжин", label: "Нислэг" },
  egypt: { time: "—", label: "Нислэг" },
};

/** Full-screen map with an app-style bottom card: swipe or ‹ › between destinations. */
export function MapExplorer() {
  const openTours = useTours().filter(isBookable);
  const toursFor = (key: string) => openTours.filter((t) => t.destinationKey === key);
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [cardOpen, setCardOpen] = useState(true);
  const [listOpen, setListOpen] = useState(false);
  const isPhone = useClientValue(() => window.matchMedia("(max-width: 639px)").matches, false);

  const dest = destinations[index];
  const list = toursFor(dest.key);
  const from = list.reduce<number | null>((m, t) => (t.price && (!m || t.price < m) ? t.price : m), null);

  function go(step: number) {
    setDir(step);
    setIndex((i) => (i + step + destinations.length) % destinations.length);
    setCardOpen(true);
  }

  function select(key: string) {
    const i = destinations.findIndex((d) => d.key === key);
    if (i < 0) return;
    setDir(i > index ? 1 : -1);
    setIndex(i);
    setCardOpen(true);
  }

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x < -60) go(1);
    else if (info.offset.x > 60) go(-1);
  }

  const primaryHref = list.length === 1 ? `/tours/${list[0].id}` : `/tours?dest=${dest.key === "egypt" ? "soon" : dest.key}`;

  return (
    <section className="relative h-[100svh] min-h-[560px] w-full overflow-hidden bg-[#dfeee9] max-sm:[&_.maplibregl-ctrl-top-right]:hidden sm:[&_.maplibregl-ctrl-top-right]:top-36">
      <div className="absolute inset-0">
        <DestinationMap fullscreen active={dest.key} onSelect={select} bottomInset={isPhone ? 380 : 340} />
      </div>

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 px-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:px-6 sm:pt-[calc(5.5rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
          className="inline-flex h-11 items-center gap-2 rounded-full bg-ink px-4 text-sm font-semibold text-white shadow-lg active:scale-95"
        >
          <span aria-hidden className="text-lg leading-none">×</span> Гарах
        </button>
        <span className="inline-flex h-10 items-center gap-2 rounded-full bg-white/95 px-4 text-sm font-semibold shadow-md backdrop-blur">
          <span className="size-2 animate-pulse rounded-full bg-[#22c55e]" />
          {openTours.length} аялал нээлттэй
        </span>
        <button
          type="button"
          aria-label="Жагсаалт"
          onClick={() => setListOpen(true)}
          className="grid size-11 place-items-center rounded-full bg-white/95 shadow-md backdrop-blur active:scale-95"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M9 6h11M9 12h11M9 18h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <circle cx="4.5" cy="6" r="1.3" fill="currentColor" />
            <circle cx="4.5" cy="12" r="1.3" fill="currentColor" />
            <circle cx="4.5" cy="18" r="1.3" fill="currentColor" />
          </svg>
        </button>
      </div>

      {/* Bottom card */}
      <div className="absolute inset-x-0 bottom-[calc(var(--dock-h)+0.5rem)] z-20 flex justify-center px-3 sm:bottom-8">
        <AnimatePresence mode="wait" initial={false}>
          {cardOpen ? (
            <motion.div
              key="card"
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="w-full max-w-md overflow-hidden rounded-[1.75rem] bg-white shadow-[0_24px_60px_rgba(6, 42, 42,0.28)]"
            >
              <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.25} onDragEnd={onDragEnd} className="touch-pan-y px-4 pb-3 pt-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Өмнөх"
                    onClick={() => go(-1)}
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-bg text-lg active:scale-90"
                  >
                    ‹
                  </button>
                  <div className="min-w-0 flex-1 overflow-hidden text-center">
                    <AnimatePresence mode="popLayout" custom={dir} initial={false}>
                      <motion.div
                        key={dest.key}
                        custom={dir}
                        initial={{ x: dir * 60, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: dir * -60, opacity: 0 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[#0e8f84]">
                          {index + 1}/{destinations.length} · {dest.en}
                        </p>
                        <h2 className="mt-0.5 truncate font-display text-2xl font-semibold leading-tight">{dest.name}</h2>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <button
                    type="button"
                    aria-label="Дараах"
                    onClick={() => go(1)}
                    className="grid size-10 shrink-0 place-items-center rounded-full bg-bg text-lg active:scale-90"
                  >
                    ›
                  </button>
                </div>

                <p className="mt-2 line-clamp-2 text-center text-[0.8rem] text-muted">{dest.blurb}</p>

                <motion.dl key={`stats-${dest.key}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 grid grid-cols-3 rounded-2xl bg-bg py-3 text-center">
                  <div>
                    <dt className="sr-only">Нислэг</dt>
                    <dd className="font-num text-lg font-semibold leading-none">{flight[dest.key]?.time}</dd>
                    <p className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted">{flight[dest.key]?.label}</p>
                  </div>
                  <div className="border-x border-[var(--line)]">
                    <dt className="sr-only">Аялал</dt>
                    <dd className="font-num text-lg font-semibold leading-none">{list.length || "—"}</dd>
                    <p className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted">Аялал</p>
                  </div>
                  <div>
                    <dt className="sr-only">Эхлэх үнэ</dt>
                    <dd className="font-num text-lg font-semibold leading-none text-accent">{from ? formatPrice(from) : "Удахгүй"}</dd>
                    <p className="mt-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted">Эхлэх үнэ</p>
                  </div>
                </motion.dl>

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setListOpen(true)}
                    className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-2xl bg-bg px-4 text-sm font-semibold active:scale-95"
                  >
                    <span aria-hidden>☰</span> Жагсаалт
                  </button>
                  <Link
                    href={primaryHref}
                    className="btn-shine flex h-12 flex-1 items-center justify-center rounded-2xl bg-accent text-sm font-semibold text-white active:scale-[0.98]"
                  >
                    {list.length ? "Аялал үзэх" : "Удахгүй — дэлгэрэнгүй"}
                  </Link>
                </div>

                <button type="button" onClick={() => setCardOpen(false)} className="mx-auto mt-2 block px-4 py-1.5 text-sm text-muted">
                  Хаах
                </button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.button
              key="pill"
              type="button"
              onClick={() => setCardOpen(true)}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold shadow-lg"
            >
              {dest.name} <span className="text-accent">· {list.length} аялал</span> <span aria-hidden>▴</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Full list sheet */}
      <AnimatePresence>
        {listOpen ? (
          <motion.div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button type="button" aria-label="Хаах" onClick={() => setListOpen(false)} className="absolute inset-0 bg-ink/40 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={(_, info) => info.offset.y > 100 && setListOpen(false)}
              data-lenis-prevent
              className="relative max-h-[80svh] w-full max-w-md overflow-y-auto rounded-t-[1.75rem] bg-white pb-[max(1rem,env(safe-area-inset-bottom))] sm:rounded-[1.75rem]"
            >
              <div className="sticky top-0 z-10 bg-white px-5 pb-3 pt-3">
                <div className="mx-auto h-1.5 w-10 rounded-full bg-[var(--line)]" />
                <h3 className="mt-3 font-display text-2xl font-semibold">Бүх нээлттэй аялал</h3>
              </div>
              <ul className="space-y-2 px-4">
                {openTours.map((t) => (
                  <li key={t.id}>
                    <Link href={`/tours/${t.id}`} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-bg active:bg-bg">
                      <div className="relative size-16 shrink-0 overflow-hidden rounded-xl">
                        <Image src={t.image} alt="" fill className="object-cover" sizes="64px" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-accent">{t.destination}</p>
                        <p className="truncate font-semibold">{t.title}</p>
                        <p className="truncate text-xs text-muted">{t.dates} · {t.duration}</p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-accent">{formatPrice(t.price)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
