"use client";

import { formatPrice, getTour } from "@/data/tours";
import { useTours } from "@/lib/content";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export function FeaturedTour() {
  const tours = useTours();
  const tour = getTour(tours, "weeknd-world-tour") ?? getTour(tours, "bali");
  if (!tour) return null;

  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
        className="dream-glass overflow-hidden rounded-[1.5rem]"
      >
        <div className="grid lg:grid-cols-2">
          <div className="relative min-h-[280px] aspect-[4/3] overflow-hidden lg:aspect-auto lg:min-h-[440px]">
            <Image
              src={tour.image}
              alt={tour.title}
              fill
              className="object-cover"
              sizes="(max-width:1024px) 100vw, 50vw"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#041f1f]/50 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:to-[#041f1f]/15" />
          </div>
          <div className="flex flex-col justify-center p-6 sm:p-10">
            <div className="epic-rule mb-4" />
            <p className="type-eyebrow text-accent">
              Featured · {tour.destination}
            </p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              {tour.title}
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted sm:text-base">{tour.story}</p>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-t border-[var(--line)] pt-5">
              <div>
                <p className="text-xs text-muted">{tour.duration}</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <p className="font-num text-2xl font-semibold text-accent">
                    {formatPrice(tour.price)}
                  </p>
                  {tour.oldPrice ? (
                    <p className="text-sm text-muted line-through">{formatPrice(tour.oldPrice)}</p>
                  ) : null}
                </div>
              </div>
              <Link
                href={`/tours/${tour.id}`}
                className="inline-flex h-11 items-center rounded-full bg-accent px-5 text-sm font-semibold text-white transition hover:bg-accent-soft"
              >
                Дэлгэрэнгүй үзэх
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
