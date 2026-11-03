"use client";

import { media } from "@/lib/cloudinary";
import { motion } from "framer-motion";
import Link from "next/link";
import { useEffect, useRef } from "react";

type CinematicBandProps = {
  eyebrow?: string;
  title: string;
  body?: string;
  ctaHref?: string;
  ctaLabel?: string;
  compact?: boolean;
};

export function CinematicBand({
  eyebrow = "Elite moments",
  title,
  body,
  ctaHref,
  ctaLabel,
  compact = false,
}: CinematicBandProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play().catch(() => {});
  }, []);

  return (
    <section
      className={`relative isolate overflow-hidden ${
        compact ? "min-h-[42vh]" : "min-h-[58vh] sm:min-h-[64vh]"
      }`}
    >
      <div className="absolute inset-0">
        <video
          ref={videoRef}
          className="h-full w-full scale-105 object-cover object-[center_35%]"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster={media.seascapePoster}
          aria-hidden
        >
          <source src={media.seascapeVideo} />
        </video>
      </div>

      <div className="absolute inset-0 bg-gradient-to-b from-[#041f1f]/55 via-[#062a2a]/35 to-[#041f1f]/70" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(126, 240, 224,0.12),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-bg to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-bg to-transparent" />

      <div
        className={`relative z-[2] mx-auto flex max-w-6xl flex-col justify-end px-4 sm:px-6 ${
          compact ? "py-16 sm:py-20" : "min-h-[58vh] py-20 sm:min-h-[64vh] sm:py-28"
        }`}
      >
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-xl"
        >
          <p className="type-eyebrow text-[#7ef0e0]">
            {eyebrow}
          </p>
          <h2 className="mt-3 font-display text-3xl font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-5xl">
            {title}
          </h2>
          {body ? (
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/80 sm:text-base">
              {body}
            </p>
          ) : null}
          {ctaHref && ctaLabel ? (
            <Link
              href={ctaHref}
              className="mt-8 inline-flex h-11 items-center rounded-full bg-white/95 px-5 text-sm font-semibold text-ink shadow-[0_12px_32px_rgba(0,0,0,0.2)] transition hover:bg-white"
            >
              {ctaLabel}
            </Link>
          ) : null}
        </motion.div>
      </div>
    </section>
  );
}
