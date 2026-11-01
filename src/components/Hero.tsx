"use client";

import { formatPrice, isBookable } from "@/data/tours";
import { INTRO_HOLD_MS } from "@/components/IntroCurtain";
import { useCanAutoplayVideo } from "@/hooks/useCanAutoplayVideo";
import { media } from "@/lib/cloudinary";
import { useTours } from "@/lib/content";
import { gsap, registerGsap, useGSAP } from "@/lib/gsap";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const INTERVAL_MS = 5600;
const HERO_SEEN = "elite-hero-seen";

/** Gold gradient lettering with a highlight band that the reveal sweeps across once. */
const ACCENT_STYLE = {
  color: "#e8b86d",
  backgroundImage: "linear-gradient(100deg, #f3d199 0%, #e8b86d 35%, #fff6df 50%, #e8b86d 65%, #7ef0e0 100%)",
  backgroundSize: "220% 100%",
  backgroundPosition: "0% 0",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
} as const;

const headline: { text: string; accent?: boolean }[][] = [
  [{ text: "Халуун" }, { text: "орны" }],
  [{ text: "мөрөөдлөө", accent: true }],
  [{ text: "бодит" }, { text: "болго." }],
];

export function Hero() {
  const tours = useTours();
  const slides = useMemo(() => tours.filter(isBookable).slice(0, 6), [tours]);
  registerGsap();
  const root = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const canAutoplay = useCanAutoplayVideo();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const html = document.documentElement;
        // First visit: the intro curtain covers the page for ~2.1s — start as it lifts, not under it
        const underCurtain = html.dataset.intro === "1";
        let seen = false;
        try {
          seen = sessionStorage.getItem(HERO_SEEN) === "1";
          sessionStorage.setItem(HERO_SEEN, "1");
        } catch {
          /* private mode: play the full reveal */
        }
        // Repeat visits in the same session get the same order, compressed to ~1s
        const k = seen && !underCurtain ? 0.35 : 1;
        // Start as the curtain begins to lift
        const t0 = underCurtain ? INTRO_HOLD_MS / 1000 + 0.15 : 0.05;
        if (underCurtain) html.dataset.heroHold = "1";

        // One beat at a time: sea → headline → actions + header → featured card → scroll cue
        const tl = gsap.timeline({ defaults: { ease: "expo.out" }, delay: t0 });
        tl.fromTo(".hero-media", { scale: 1.14, opacity: 0.35 }, { scale: 1, opacity: 1, duration: 2.6 * k, ease: "power2.out" }, 0)
          .fromTo(".hero-eyebrow", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 * k }, 0.9 * k)
          .fromTo(".hero-line > *", { yPercent: 110 }, { yPercent: 0, duration: 1.25 * k, stagger: 0.2 * k }, 1.0 * k)
          .fromTo(".hero-accent", { backgroundPosition: "100% 0" }, { backgroundPosition: "0% 0", duration: 1.4 * k, ease: "power2.inOut" }, 1.6 * k)
          .fromTo(".hero-lead", { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 * k }, 2.1 * k)
          .fromTo(".hero-cta > *", { y: 18, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1 * k, duration: 0.8 * k }, 2.3 * k);

        // Header's turn. A plain timer, not the timeline: GSAP pauses in background tabs and
        // the header must never stay hidden because the tab was opened behind another one.
        const holdTimer = window.setTimeout(() => delete html.dataset.heroHold, (t0 + 2.5 * k) * 1000);

        // The featured card waits its turn — or comes in as soon as the visitor moves
        gsap.set(".hero-card", { x: 70, opacity: 0, rotate: 2 });
        let cardIn = false;
        const showCard = () => {
          if (cardIn) return;
          cardIn = true;
          gsap.to(".hero-card", { x: 0, opacity: 1, rotate: 0, duration: 1.2, ease: "expo.out" });
        };
        const cardTimer = window.setTimeout(showCard, (t0 + 3.2 * k) * 1000);
        const earliest = (t0 + 2.3 * k) * 1000;
        const born = performance.now();
        const onMove = () => performance.now() - born > earliest && showCard();
        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("wheel", onMove, { passive: true });

        // Scroll cue only for visitors who have not found the page scrolls on their own
        gsap.set(".hero-scroll", { opacity: 0 });
        let scrolled = false;
        const onScroll = () => {
          scrolled = true;
          showCard();
        };
        window.addEventListener("scroll", onScroll, { passive: true, once: true });
        const cueTimer = window.setTimeout(() => !scrolled && gsap.to(".hero-scroll", { opacity: 1, duration: 0.8 }), (t0 + 4.4 * k) * 1000);

        return () => {
          window.clearTimeout(holdTimer);
          window.clearTimeout(cardTimer);
          window.clearTimeout(cueTimer);
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("wheel", onMove);
          window.removeEventListener("scroll", onScroll);
          delete html.dataset.heroHold;
        };

        gsap.to(".hero-media", {
          yPercent: 14,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
        });
        gsap.to(".hero-copy", {
          yPercent: -12,
          opacity: 0,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "70% top", scrub: true },
        });
      });
    },
    { scope: root },
  );

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !canAutoplay) return;
    v.muted = true;
    const play = () => v.play().catch(() => {});
    const onVis = () => (document.hidden ? v.pause() : play());
    play();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [canAutoplay]);

  useEffect(() => {
    if (paused || slides.length < 2) return;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % slides.length), INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [paused, index, slides.length]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    gsap.fromTo(
      el.querySelectorAll("[data-swap]"),
      { y: 18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.05, ease: "power3.out" },
    );
    gsap.fromTo(el.querySelector("[data-swap-img]"), { scale: 1.18 }, { scale: 1, duration: 1.4, ease: "expo.out" });
  }, [index]);

  const slide = slides[index] ?? slides[0];

  return (
    <section ref={root} className="relative isolate min-h-[100svh] overflow-hidden bg-[#062a2a]">
      <div className="hero-media absolute inset-0 z-0 will-change-transform">
        {canAutoplay ? (
          <video
            ref={videoRef}
            className="h-full w-full object-cover object-center"
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            poster={media.heroPoster}
            aria-hidden
          >
            <source src={media.heroVideo} />
          </video>
        ) : (
          <Image src={media.heroPoster} unoptimized alt="" fill priority className="object-cover" sizes="100vw" />
        )}
      </div>

      <div className="absolute inset-0 z-[1] bg-gradient-to-r from-[#031a1a]/85 via-[#062a2a]/45 to-[#062a2a]/10" />
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_80%_20%,rgba(232, 184, 109,0.22),transparent_50%)]" />
      <div className="absolute inset-x-0 bottom-0 z-[1] h-40 bg-gradient-to-t from-bg to-transparent" />
      <div className="hero-grain pointer-events-none absolute inset-0 z-[2]" aria-hidden />

      <div className="hero-copy relative z-[3] mx-auto grid min-h-[100svh] max-w-6xl items-end gap-10 px-4 pb-24 pt-[calc(7rem+env(safe-area-inset-top))] sm:px-6 lg:grid-cols-[1.35fr_1fr] lg:items-center lg:pb-16">
        <div>
          <p className="hero-eyebrow inline-flex items-center gap-3 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.3em] text-[#7ef0e0] backdrop-blur-md">
            <span className="size-1.5 animate-pulse rounded-full bg-[#e8b86d]" />
            Elite Travel Mongolia
          </p>

          <h1 className="mt-6 font-display text-[clamp(3rem,9.5vw,7.25rem)] font-semibold leading-[0.9] tracking-[-0.045em] text-white">
            {headline.map((line, li) => (
              <span key={li} className="hero-line block overflow-hidden pb-[0.08em]">
                {line.map((w) => (
                  <span
                    key={w.text}
                    className={`hero-word mr-[0.22em] inline-block ${w.accent ? "hero-accent italic" : ""}`}
                    // Inline so the word can never end up as transparent text with no gradient behind it
                    style={w.accent ? ACCENT_STYLE : undefined}
                  >
                    {w.text}
                  </span>
                ))}
              </span>
            ))}
          </h1>

          <p className="hero-lead mt-6 max-w-md text-base leading-relaxed text-white/80 sm:text-lg">
            Хайнаны далай, Балигийн арал, Хонг Конгийн гэрэлт шөнө — нислэг, буудал, хөтөчтэй бүрэн багц.
          </p>

          <div className="hero-cta mt-8 flex flex-wrap gap-3">
            <Link href="/tours" className="btn-shine inline-flex h-13 items-center gap-2 rounded-full bg-[#e8b86d] px-7 text-sm font-semibold text-ink shadow-[0_16px_40px_rgba(232, 184, 109,0.35)] transition hover:-translate-y-0.5">
              Аяллаа сонгох <span aria-hidden>→</span>
            </Link>
            <a href="tel:+97690031771" className="inline-flex h-13 items-center rounded-full border border-white/35 bg-white/10 px-6 text-sm font-medium text-white backdrop-blur-md transition hover:bg-white/20">
              +976 9003 1771
            </a>
          </div>
        </div>

        {slide ? (
          <div
            ref={cardRef}
            className="hero-card relative w-full max-w-sm justify-self-start overflow-hidden rounded-[1.75rem] border border-white/20 bg-white/10 p-3 text-white shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl lg:justify-self-end"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            <Link href={`/tours/${slide.id}`} className="block">
              <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem]">
                <div key={slide.id} data-swap-img className="absolute inset-0">
                  <Image src={slide.image} alt={slide.title} fill className="object-cover" sizes="384px" priority />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute left-3 top-3 flex gap-1.5">
                  <span data-swap className="rounded-full bg-white/95 px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.1em] text-ink">
                    {slide.destination}
                  </span>
                  {slide.discount ? (
                    <span data-swap className="rounded-full bg-accent px-2.5 py-1 text-[0.65rem] font-semibold">
                      {slide.discount}
                    </span>
                  ) : null}
                </div>
                <p data-swap className="absolute bottom-3 left-3 text-xs text-white/85">
                  {slide.duration}
                </p>
              </div>
              <div className="px-2 pb-2 pt-4">
                <p className="text-[0.62rem] font-semibold uppercase tracking-[0.25em] text-[#7ef0e0]">Онцлох аялал</p>
                <h2 data-swap className="mt-1.5 font-display text-2xl font-semibold leading-tight tracking-[-0.02em]">
                  {slide.title}
                </h2>
                <div data-swap className="mt-3 flex items-baseline gap-2">
                  <span className="font-num text-2xl font-semibold text-[#f3d199]">{formatPrice(slide.price)}</span>
                  {slide.oldPrice ? (
                    <span className="text-sm text-white/50 line-through">{formatPrice(slide.oldPrice)}</span>
                  ) : null}
                </div>
              </div>
            </Link>

            <div className="flex gap-1.5 px-2 pb-2 pt-2">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={s.title}
                  onClick={() => setIndex(i)}
                  className="relative h-1 flex-1 overflow-hidden rounded-full bg-white/20"
                >
                  {i < index ? <span className="absolute inset-0 bg-white/70" /> : null}
                  {i === index ? (
                    <span
                      key={`${index}-${paused}`}
                      className="hero-progress absolute inset-0 origin-left bg-[#e8b86d]"
                      style={{ animationDuration: `${INTERVAL_MS}ms`, animationPlayState: paused ? "paused" : "running" }}
                    />
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="hero-scroll absolute bottom-8 left-1/2 z-[3] hidden -translate-x-1/2 flex-col items-center gap-2 text-[0.6rem] font-semibold uppercase tracking-[0.35em] text-white/70 lg:flex">
        Scroll
        <span className="relative h-10 w-px overflow-hidden bg-white/25">
          <span className="scroll-cue absolute inset-x-0 top-0 h-1/2 bg-white" />
        </span>
      </div>
    </section>
  );
}
