"use client";

import { useCanAutoplayVideo } from "@/hooks/useCanAutoplayVideo";
import { useEffect, useRef } from "react";

type ResponsiveVideoProps = {
  src: string;
  poster: string;
  className?: string;
  objectPosition?: string;
};

/** Plays looping muted video on desktop; static poster on mobile / reduced motion */
export function ResponsiveVideo({
  src,
  poster,
  className = "h-full w-full object-cover",
  objectPosition = "center",
}: ResponsiveVideoProps) {
  const canPlay = useCanAutoplayVideo();
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v || !canPlay) return;
    v.muted = true;
    v.play().catch(() => {});
  }, [canPlay]);

  if (!canPlay) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={poster}
        alt=""
        className={className}
        style={{ objectPosition }}
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <video
      ref={ref}
      className={className}
      style={{ objectPosition }}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      poster={poster}
      aria-hidden
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}
