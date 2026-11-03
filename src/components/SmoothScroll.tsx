"use client";

import { setLenis } from "@/lib/scroll";
import type Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Buttery inertia scroll, kept in sync with GSAP ScrollTrigger. */
export function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    // Touch devices already scroll natively and smoothly; Lenis there only adds per-frame work.
    // Loaded on demand so phones never download Lenis or GSAP just for this component.
    if (window.matchMedia("(prefers-reduced-motion: reduce), (pointer: coarse)").matches) return;
    let cleanup = () => {};
    let disposed = false;

    void Promise.all([import("lenis"), import("@/lib/gsap")]).then(([{ default: LenisClass }, { gsap, registerGsap, ScrollTrigger }]) => {
      if (disposed) return;
      registerGsap();
      const lenis = new LenisClass({ duration: 1.15, smoothWheel: true, anchors: { offset: -96 } });
      lenisRef.current = lenis;
      setLenis(lenis);
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      cleanup = () => {
        gsap.ticker.remove(tick);
        lenis.destroy();
        lenisRef.current = null;
        setLenis(null);
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, []);

  useEffect(() => {
    lenisRef.current?.scrollTo(0, { immediate: true });
  }, [pathname]);

  return null;
}
