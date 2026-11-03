"use client";

import { useTours } from "@/lib/content";
import { POSTER_SIZES, posterGlow } from "@/lib/tour-poster";
import { getImageProps } from "next/image";
import { useEffect } from "react";
import { preload } from "react-dom";

/**
 * As a finger (or the mouse button) lands on a link to a tour, start downloading that tour
 * page's poster, so the page slides in with its photo instead of an empty frame.
 */
export function TourPreload() {
  const tours = useTours();
  useEffect(() => {
    const warmed = new Set<string>();
    const onDown = (e: PointerEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href^="/tours/"]');
      if (!(a instanceof HTMLAnchorElement)) return;
      const id = a.pathname.split("/")[2];
      const tour = id && !warmed.has(id) ? tours.find((t) => t.id === id) : undefined;
      if (!tour) return;
      warmed.add(id);
      const { props } = getImageProps({ src: tour.image, alt: "", fill: true, sizes: POSTER_SIZES });
      preload(props.src, { as: "image", imageSrcSet: props.srcSet, imageSizes: props.sizes, fetchPriority: "high" });
      preload(posterGlow(tour.image), { as: "image" });
    };
    document.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    return () => document.removeEventListener("pointerdown", onDown, { capture: true });
  }, [tours]);
  return null;
}
