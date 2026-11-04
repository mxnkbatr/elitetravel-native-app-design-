"use client";

import { Icon } from "@/components/Icon";
import { MobileTitle } from "@/components/MobileTitle";
import { useStays } from "@/components/ResortsPage";
import { formatPrice } from "@/data/tours";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

/** Phone hotels: tall photo cards with the tours that stay there in a swipe row. */
export function MobileResorts() {
  const stays = useStays();
  return (
    <div className="px-4 pb-8">
      <MobileTitle title="Буудлууд" sub="Аялал бүрийн байрлах газар" />

      <div className="mt-6 space-y-5">
        {stays.map((s, i) => (
          <motion.article
            key={s.name}
            // The first card is on screen at load; only the ones below rise in as they scroll into view
            initial={i === 0 ? false : { opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden rounded-[1.75rem] bg-bg-elevated shadow-[0_14px_40px_rgba(6,42,42,0.1)]"
          >
            <div className="relative aspect-[4/3.4]">
              <Image src={s.image} alt={s.place} fill className="object-cover" sizes="100vw" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" />
              <span className="absolute left-3.5 top-3.5 rounded-full bg-white/95 px-3 py-1 text-[0.68rem] font-semibold text-ink"><Icon name="pin" size={12} strokeWidth={2} className="inline -mt-0.5 mr-1" />{s.place}</span>
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <h2 className="font-display text-[2rem] font-semibold leading-none tracking-[-0.02em]">{s.name}</h2>
                {s.from ? (
                  <p className="mt-2 text-sm text-white/80">
                    Аялал <span className="font-num text-[#f3d199]">{formatPrice(s.from)}</span>-аас
                  </p>
                ) : null}
              </div>
            </div>

            <div className="p-4">
              <p className="text-sm leading-relaxed text-muted">{s.blurb}</p>

              {s.linked.length ? (
                <>
                  <p className="mt-4 type-label text-muted">Энд байрлах аяллууд</p>
                  <div className="hide-scrollbar -mx-4 mt-2 flex snap-x gap-2 overflow-x-auto px-4">
                    {s.linked.map((t) => (
                      <Link
                        key={t.id}
                        href={`/tours/${t.id}`}
                        className="flex w-[70vw] shrink-0 snap-start items-center gap-3 rounded-2xl border border-[var(--line)] bg-bg p-2 active:scale-[0.98]"
                      >
                        <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
                          <Image src={t.image} alt="" fill className="object-cover" sizes="56px" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{t.title}</p>
                          <p className="truncate text-xs text-muted">{t.dates}</p>
                          <p className="font-num text-sm text-accent">{formatPrice(t.price)}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              ) : null}

              {s.linked[0] ? (
                <Link
                  href={`/tours/${s.linked[0].id}`}
                  className="mt-4 flex h-12 items-center justify-center gap-2 rounded-2xl bg-ink text-sm font-semibold text-white active:scale-[0.98]"
                >
                  Аялал үзэх <span aria-hidden>→</span>
                </Link>
              ) : null}
            </div>
          </motion.article>
        ))}
      </div>
    </div>
  );
}
