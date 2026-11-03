"use client";

import { Hero } from "@/components/Hero";
import { JourneyScroll } from "@/components/JourneyScroll";
import { Magnetic } from "@/components/Magnetic";
import { Marquee } from "@/components/Marquee";
import { MobileHome } from "@/components/MobileHome";
import { ResponsiveVideo } from "@/components/ResponsiveVideo";
import { ScrubStatement } from "@/components/ScrubStatement";
import { Section } from "@/components/Section";
import { ToursCarousel } from "@/components/ToursCarousel";
import { media } from "@/lib/cloudinary";
import { useMediaQuery } from "@/lib/ui";
import { motion } from "framer-motion";
import Link from "next/link";

function HomeCta() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <motion.div
        initial={{ clipPath: "inset(12% 8% 12% 8% round 2rem)" }}
        whileInView={{ clipPath: "inset(0% 0% 0% 0% round 2rem)" }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        className="relative isolate overflow-hidden rounded-[2rem] text-white"
      >
        <div className="absolute inset-0 -z-10">
          <ResponsiveVideo src={media.seascapeVideo} poster={media.seascapePoster} />
          <div className="absolute inset-0 bg-gradient-to-r from-[#041f1f]/85 via-[#062a2a]/55 to-[#062a2a]/20" />
        </div>
        <div className="px-6 py-20 sm:px-12 sm:py-28">
          <p className="type-eyebrow text-[#7ef0e0]">Your next escape</p>
          <h2 className="mt-4 max-w-xl font-display text-[clamp(2.4rem,5vw,4.25rem)] font-semibold leading-[0.98] tracking-[-0.04em]">
            Дараагийн аяллаа <span className="italic text-[#e8b86d]">хамтдаа</span> төлөвлөе
          </h2>
          <p className="mt-4 max-w-md text-white/80">
            Instagram, Messenger эсвэл утсаар шууд холбогдоорой — Elite Travel зөвлөхүүд тусална.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Magnetic>
              <Link
                href="/tours"
                className="btn-shine inline-flex h-13 items-center rounded-full bg-[#e8b86d] px-7 text-sm font-semibold text-ink shadow-[0_16px_40px_rgba(232, 184, 109,0.35)]"
              >
                Аяллаа сонгох →
              </Link>
            </Magnetic>
            <a
              href="tel:+97690031771"
              className="inline-flex h-13 items-center rounded-full border border-white/40 bg-white/10 px-6 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20"
            >
              +976 9003 1771
            </a>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function HomePage() {
  // Server render and hydration carry both versions (CSS shows the right one); in the browser only
  // the one on screen is built, so arriving here doesn't mount a hidden landing with its video and scroll effects
  const wide = useMediaQuery("(min-width: 640px)");
  return (
    <>
      {/* Phones get an app-style start screen; the cinematic landing is for larger screens */}
      {wide !== true ? (
        <div className="sm:hidden">
          <MobileHome />
        </div>
      ) : null}
      {wide !== false ? (
        <div className="hidden sm:block">
          <Hero />
          <Marquee />
          <Section className="py-14 sm:py-20">
            <ToursCarousel />
          </Section>
          <JourneyScroll />
          <ScrubStatement />
          <Section className="pb-20 sm:pb-28">
            <HomeCta />
          </Section>
        </div>
      ) : null}
    </>
  );
}
