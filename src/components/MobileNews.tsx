"use client";

import { Icon, type IconName } from "@/components/Icon";
import { MobileTitle } from "@/components/MobileTitle";
import { NewsReader, tone } from "@/components/NewsPage";
import type { NewsCategory, NewsItem } from "@/data/news";
import { useNews } from "@/lib/content";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { useReflow } from "@/lib/ui";
import { useState } from "react";

const categories: ("Бүгд" | NewsCategory)[] = ["Бүгд", "Мэдээ", "Урамшуулал", "Зөвлөгөө"];
const icon: Record<NewsCategory, IconName> = { Мэдээ: "news", Урамшуулал: "tag", Зөвлөгөө: "bulb" };

/** Phone news: swipeable top stories, sticky category chips, compact rows, sheet reader. */
export function MobileNews() {
  const news = useNews();
  const [cat, setCat] = useState<(typeof categories)[number]>("Бүгд");
  const [open, setOpen] = useState<NewsItem | null>(null);
  const reflow = useReflow(cat);
  const featured = news.slice(0, 3);
  const list = cat === "Бүгд" ? news : news.filter((n) => n.category === cat);

  return (
    <div className="px-4 pb-8">
      <MobileTitle title="Мэдээ" sub="Шинэ огноо, урамшуулал, аяллын зөвлөгөө" />

      {/* Top stories */}
      <div className="hide-scrollbar -mx-4 mt-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
        {featured.map((n, i) => (
          <button
            key={n.id}
            type="button"
            onClick={() => setOpen(n)}
            style={{ animationDelay: `${i * 0.06}s` }}
            className="enter-from-right relative aspect-[4/5] w-[78vw] shrink-0 snap-center overflow-hidden rounded-[1.6rem] text-left active:scale-[0.98]"
          >
            <Image src={n.image} alt="" fill className="object-cover" sizes="78vw" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
            <span className={`absolute left-3.5 top-3.5 rounded-full px-2.5 py-1 text-[0.65rem] font-bold ${tone[n.category]}`}>{n.category}</span>
            <div className="absolute inset-x-0 bottom-0 p-4 text-white">
              <p className="font-display text-[1.6rem] font-semibold leading-[1.05]">{n.title}</p>
              <p className="mt-2 line-clamp-2 text-xs text-white/75">{n.excerpt}</p>
              <p className="mt-2.5 text-[0.7rem] font-semibold text-[#7ef0e0]">{n.readMin} мин унших →</p>
            </div>
          </button>
        ))}
      </div>

      {/* Categories */}
      <div className="sticky top-[calc(0.5rem+env(safe-area-inset-top))] z-30 -mx-4 mt-5 bg-gradient-to-b from-bg via-bg/95 to-bg/0 px-4 pb-3 pt-1">
        <div className="hide-scrollbar flex gap-1.5 overflow-x-auto">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`relative shrink-0 rounded-full px-3.5 py-2 text-[0.82rem] font-semibold transition active:scale-95 ${
                cat === c ? "text-white" : "border border-[var(--line)] bg-bg-elevated"
              }`}
            >
              {cat === c ? <motion.span layoutId="mn-cat" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} /> : null}
              <span className="relative">
                {c} <span className="opacity-50">{c === "Бүгд" ? news.length : news.filter((n) => n.category === c).length}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Rows */}
      <motion.ul layout={reflow} className="space-y-2.5">
        <AnimatePresence mode="popLayout" initial={false}>
          {list.map((n) => (
            <motion.li key={n.id} layout={reflow} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}>
              <button
                type="button"
                onClick={() => setOpen(n)}
                className="flex w-full gap-3 rounded-2xl border border-[var(--line)] bg-bg-elevated p-2.5 text-left active:scale-[0.98] active:bg-bg"
              >
                <div className="relative aspect-square w-[5.5rem] shrink-0 overflow-hidden rounded-xl bg-accent-mist">
                  <Image src={n.image} alt="" fill className="object-cover" sizes="88px" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col py-0.5">
                  <p className="type-label text-accent">
                    <Icon name={icon[n.category]} size={12} strokeWidth={2} className="inline -mt-0.5 mr-1" />
                    {n.category}
                  </p>
                  <p className="mt-1 line-clamp-2 font-semibold leading-snug">{n.title}</p>
                  <p className="mt-auto pt-1 text-xs text-muted">{n.readMin} мин унших</p>
                </div>
                <span className="self-center pr-1 text-muted" aria-hidden>
                  ›
                </span>
              </button>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>

      <AnimatePresence>{open ? <NewsReader item={open} onClose={() => setOpen(null)} /> : null}</AnimatePresence>
    </div>
  );
}
