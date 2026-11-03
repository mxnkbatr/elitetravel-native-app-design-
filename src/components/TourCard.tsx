"use client";

import { SaveButton } from "@/components/SaveButton";
import { formatPrice, type TourSummary } from "@/data/tours";
import { useSeats } from "@/lib/content";
import Image from "next/image";
import Link from "next/link";

export function TourCard({
  tour,
  className = "",
}: {
  tour: TourSummary;
  className?: string;
}) {
  const open = Object.values(useSeats(tour.id)).filter((s) => !s.closed);
  const seats = open.length ? Math.max(...open.map((s) => s.left)) : null;
  const bookHref = `/tours/${tour.id}#book`;

  return (
    <article
      className={`epic-card flex h-full w-[min(78vw,300px)] shrink-0 snap-start flex-col overflow-hidden sm:w-[300px] ${className}`}
    >
      <Link href={`/tours/${tour.id}`} className="group relative block aspect-[4/3] overflow-hidden">
        <Image
          src={tour.image}
          alt={tour.title}
          fill
          className="object-cover transition duration-500 group-hover:scale-[1.04]"
          sizes="300px"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        <SaveButton tourId={tour.id} className="absolute right-3 top-3 z-10" />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-md bg-white/95 px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-ink">
            {tour.destination}
          </span>
          {tour.discount ? (
            <span className="rounded-md bg-accent px-2 py-1 text-[0.65rem] font-semibold text-white">
              {tour.discount}
            </span>
          ) : null}
        </div>
        {tour.dates ? (
          <span className="absolute bottom-3 left-3 rounded-full bg-black/45 px-2.5 py-1 text-[0.68rem] font-medium text-white backdrop-blur-sm">
            {tour.dates}
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/tours/${tour.id}`}>
            <h3 className="font-display text-[1.05rem] font-semibold leading-snug tracking-[-0.02em] transition hover:text-accent">
              {tour.title}
            </h3>
          </Link>
        </div>

        <p className="text-xs text-muted">
          {tour.duration}
          {tour.departure ? ` · ${tour.departure}` : ""}
        </p>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-[var(--line)] pt-3">
          <div>
            <p className="font-num text-xl font-semibold leading-none text-accent">
              {formatPrice(tour.price)}
            </p>
            {tour.oldPrice ? (
              <p className="mt-1 text-[0.7rem] text-muted line-through">{formatPrice(tour.oldPrice)}</p>
            ) : null}
            {tour.tag !== "soon" && seats != null && seats <= 15 ? (
              <p className="mt-1.5 text-[0.68rem] font-medium text-[#c9964a]">
                {seats ? `${seats} суудал үлдсэн` : "Дүүрсэн · хүлээлэг"}
              </p>
            ) : null}
          </div>
          <Link
            href={bookHref}
            className="inline-flex h-10 shrink-0 items-center rounded-full bg-accent px-4 text-sm font-semibold text-white transition hover:bg-accent-soft"
          >
            Захиалах
          </Link>
        </div>
      </div>
    </article>
  );
}
