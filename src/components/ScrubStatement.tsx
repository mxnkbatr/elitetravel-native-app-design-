"use client";

import { gsap, registerGsap, useGSAP } from "@/lib/gsap";
import { useRef } from "react";

const statement =
  "Бид зөвхөн аялал зардаггүй. Нислэгээс эхлээд далайн эрэг дээрх анхны нар жаргалт хүртэл — бүгдийг нь таны өмнөөс бодно.";

const highlight = new Set(["аялал", "нар", "жаргалт"]);

const promises = [
  { k: "01", title: "Бүрэн багц", body: "Онгоц, буудал, шилжүүлэлт — нэг дор." },
  { k: "02", title: "Монгол хөтөч", body: "Аяллын турш хамт явж, хэлний бэрхшээлгүй." },
  { k: "03", title: "Ил тод үнэ", body: "Нуугдмал төлбөргүй, урьдчилан тодорхой." },
];

/** Words light up as the reader scrolls through the section. */
export function ScrubStatement() {
  registerGsap();
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          ".scrub-word",
          { opacity: 0.14 },
          {
            opacity: 1,
            stagger: 0.1,
            ease: "none",
            scrollTrigger: { trigger: ".scrub-text", start: "top 80%", end: "bottom 45%", scrub: true },
          },
        );
        gsap.fromTo(
          ".promise-item",
          { y: 50, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            stagger: 0.12,
            duration: 1,
            ease: "expo.out",
            scrollTrigger: { trigger: ".promise-grid", start: "top 85%" },
          },
        );
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
      <p className="type-eyebrow text-accent">Why Elite</p>
      <p className="scrub-text mt-6 font-display text-[clamp(1.9rem,4.4vw,3.6rem)] font-semibold leading-[1.12] tracking-[-0.03em] text-foam">
        {statement.split(" ").map((w, i) => (
          <span
            key={i}
            className={`scrub-word inline-block pr-[0.25em] ${
              highlight.has(w.replace(/[.,—]/g, "")) ? "text-accent" : ""
            }`}
          >
            {w}
          </span>
        ))}
      </p>

      <div className="promise-grid mt-16 grid gap-px overflow-hidden rounded-[1.5rem] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
        {promises.map((p) => (
          <div key={p.k} className="promise-item group bg-bg-elevated p-7 transition-colors duration-500 hover:bg-[#062a2a]">
            <span className="font-display text-sm font-semibold text-accent">{p.k}</span>
            <h3 className="mt-6 font-display text-2xl font-semibold transition-colors group-hover:text-white">{p.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted transition-colors group-hover:text-white/70">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
