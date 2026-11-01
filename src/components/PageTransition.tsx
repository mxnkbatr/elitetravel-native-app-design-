"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

const depth = (path: string) => path.split("/").filter(Boolean).length;

/**
 * Phones: iOS-style push — deeper pages slide in from the right, going back slides
 * in from the left; larger screens keep a soft fade-up (see .page-in-* in globals.css).
 * Pure CSS on purpose: a lingering JS transform on this wrapper would turn every
 * position:fixed sheet and bar inside the page into page-relative boxes.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [from, setFrom] = useState(pathname);
  const [dir, setDir] = useState<"forward" | "back">("forward");
  if (from !== pathname) {
    setDir(depth(pathname) >= depth(from) ? "forward" : "back");
    setFrom(pathname);
  }

  return (
    <div key={pathname} className={`page-in page-in-${dir}`}>
      {children}
    </div>
  );
}
