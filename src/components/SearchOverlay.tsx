"use client";

import type { NewsItem } from "@/data/news";
import { destinations, formatPrice, type TourSummary } from "@/data/tours";
import { useNews, useTours } from "@/lib/content";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

const OPEN_EVENT = "elite:search";

/** Opens the site-wide search from anywhere (header button, ⌘K, "/"). */
export function openSearch() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

const suggestions = ["Хайнань", "Бали", "Концерт", "Атлантис", "Хүүхэд", "Хуваан төлөх"];

function norm(s: string) {
  return s.toLowerCase().normalize("NFKC");
}

type Hit = { key: string; href: string; title: string; sub: string; image: string; kind: "Аялал" | "Чиглэл" | "Мэдээ"; price?: string };

const buildIndex = (tours: TourSummary[], news: NewsItem[]): Hit[] => [
  ...tours
    .filter((t) => t.status !== "ended")
    .map((t) => ({
      key: `t-${t.id}`,
      href: `/tours/${t.id}`,
      title: t.title,
      sub: [t.destination, t.duration, t.dates].filter(Boolean).join(" · "),
      image: t.image,
      kind: "Аялал" as const,
      price: t.price ? formatPrice(t.price) : undefined,
      text: norm([t.title, t.destination, t.description, t.story, ...t.highlights].join(" ")),
    })),
  ...destinations.map((d) => ({
    key: `d-${d.key}`,
    href: `/tours?dest=${d.key === "egypt" ? "soon" : d.key}`,
    title: d.name,
    sub: d.blurb,
    image: d.image,
    kind: "Чиглэл" as const,
    text: norm([d.name, d.en, d.blurb].join(" ")),
  })),
  ...news.map((n) => ({
    key: `n-${n.id}`,
    href: "/news",
    title: n.title,
    sub: n.excerpt,
    image: n.image,
    kind: "Мэдээ" as const,
    text: norm([n.title, n.excerpt, ...n.body].join(" ")),
  })),
];

export function SearchOverlay() {
  const tours = useTours();
  const news = useNews();
  const index = useMemo(() => buildIndex(tours, news), [tours, news]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  // Navigating from a result closes the overlay
  const [openOn, setOpenOn] = useState(pathname);
  if (openOn !== pathname) {
    setOpenOn(pathname);
    setOpen(false);
  }

  useEffect(() => {
    const show = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener(OPEN_EVENT, show);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, show);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = window.setTimeout(() => input.current?.focus(), 80);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(id);
    };
  }, [open]);

  const hits = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return (index as (Hit & { text: string })[]).filter((h) => words.every((w) => h.text.includes(w))).slice(0, 12);
  }, [q, index]);

  const groups = (["Аялал", "Чиглэл", "Мэдээ"] as const)
    .map((kind) => ({ kind, items: hits.filter((h) => h.kind === kind) }))
    .filter((g) => g.items.length);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div className="fixed inset-0 z-[90] flex items-start justify-center sm:p-6 sm:pt-[12vh]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button type="button" aria-label="Хаах" onClick={() => setOpen(false)} className="absolute inset-0 bg-ink/50 backdrop-blur-sm" />
          <motion.div
            role="dialog"
            aria-label="Хайлт"
            initial={{ y: -24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            data-lenis-prevent
            className="relative flex h-[100svh] w-full flex-col overflow-hidden bg-bg-elevated sm:h-auto sm:max-h-[70vh] sm:max-w-xl sm:rounded-[1.5rem] sm:shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 pb-3 pt-[calc(0.9rem+env(safe-area-inset-top))] sm:pt-3">
              <svg className="shrink-0 text-muted" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
                <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Аялал, чиглэл, мэдээ хайх…"
                enterKeyHint="search"
                className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none"
              />
              <button type="button" onClick={() => setOpen(false)} className="shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold text-accent">
                Болих
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:max-h-[56vh]">
              {!q.trim() ? (
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">Түгээмэл хайлт</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {suggestions.map((s, i) => (
                      <motion.button
                        key={s}
                        type="button"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => setQ(s)}
                        className="rounded-full border border-[var(--line)] px-3.5 py-2 text-sm active:scale-95"
                      >
                        {s}
                      </motion.button>
                    ))}
                  </div>
                  <p className="mt-6 hidden text-xs text-muted sm:block">
                    Товчлол: <kbd className="rounded border border-[var(--line)] px-1.5">/</kbd> эсвэл <kbd className="rounded border border-[var(--line)] px-1.5">Ctrl K</kbd>
                  </p>
                </div>
              ) : groups.length ? (
                groups.map((g) => (
                  <section key={g.kind} className="mb-5">
                    <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted">{g.kind}</p>
                    <ul className="space-y-1">
                      {g.items.map((h, i) => (
                        <motion.li key={h.key} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                          <Link href={h.href} onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-bg active:bg-bg">
                            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg">
                              <Image src={h.image} alt="" fill className="object-cover" sizes="48px" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">{h.title}</p>
                              <p className="truncate text-xs text-muted">{h.sub}</p>
                            </div>
                            {h.price ? <span className="shrink-0 font-num text-sm text-accent">{h.price}</span> : null}
                          </Link>
                        </motion.li>
                      ))}
                    </ul>
                  </section>
                ))
              ) : (
                <div className="py-10 text-center">
                  <p className="text-3xl" aria-hidden>🧭</p>
                  <p className="mt-3 font-semibold">“{q}” олдсонгүй</p>
                  <p className="mt-1 text-sm text-muted">Өөр үгээр хайгаад үзээрэй, эсвэл бидэнтэй холбогдоорой.</p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
