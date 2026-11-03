"use client";

import { gsap, registerGsap, useGSAP } from "@/lib/gsap";
import { useRef } from "react";

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
};

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  registerGsap();
  const root = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({ defaults: { ease: "expo.out" } });
        tl.fromTo(".ph-rule", { scaleX: 0 }, { scaleX: 1, transformOrigin: "left center", duration: 0.9 })
          .fromTo(".ph-eyebrow", { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0.1)
          .fromTo(".ph-word", { yPercent: 110 }, { yPercent: 0, duration: 1.1, stagger: 0.07 }, 0.15)
          .fromTo(".ph-desc", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 }, 0.5);
      });
    },
    { scope: root },
  );

  return (
    <div ref={root} className="max-w-3xl">
      <div className="flex items-center gap-3">
        <span className="ph-rule epic-rule" />
        <p className="ph-eyebrow type-eyebrow text-accent">{eyebrow}</p>
      </div>
      <h1 className="mt-5 font-display text-[clamp(2.6rem,7vw,5rem)] font-semibold leading-[0.95] tracking-[-0.045em]">
        {title.split(" ").map((w, i) => (
          <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
            <span className="ph-word mr-[0.22em] inline-block">{w}</span>
          </span>
        ))}
      </h1>
      {description ? (
        <p className="ph-desc mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">{description}</p>
      ) : null}
    </div>
  );
}
