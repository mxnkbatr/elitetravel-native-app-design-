"use client";

import { markNavigated, setMorphTour, TOUR_PHOTO } from "@/lib/ui";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, ViewTransition, type ReactNode } from "react";

const depth = (path: string) => path.split("/").filter(Boolean).length;
type Nav = "forward" | "back" | "swap";
const navFor = (from: string, to: string): Nav => (depth(to) > depth(from) ? "forward" : depth(to) < depth(from) ? "back" : "swap");

/**
 * Tapping a tour card: its photo becomes the shared element that grows into the tour page's
 * poster (TourHero names the poster the same). Only one element may carry the name, so any
 * earlier one — a previous tap, or the poster of the tour page being left — gives it up first.
 */
function morphFrom(a: HTMLAnchorElement, leaving: boolean) {
  const root = document.documentElement;
  const id = leaving ? a.pathname.match(/^\/tours\/([a-z0-9-]+)$/)?.[1] : undefined;
  for (const el of document.querySelectorAll<HTMLElement>("[data-morph-src]")) {
    el.style.viewTransitionName = "";
    delete el.dataset.morphSrc;
  }
  delete root.dataset.morph;
  setMorphTour(null);
  if (!id || !("startViewTransition" in document)) return;
  const img = [...a.querySelectorAll("img")].find((i) => i.getBoundingClientRect().width > 40);
  if (!img) return;
  // The rounded frame around the photo, so the corners stay round while it flies
  let frame: HTMLElement = img;
  for (let el = img.parentElement; el && a.contains(el); el = el.parentElement) {
    if (getComputedStyle(el).overflow === "hidden") {
      frame = el;
      break;
    }
  }
  for (const el of document.querySelectorAll<HTMLElement>("[data-tour-poster]")) el.style.viewTransitionName = "";
  frame.style.viewTransitionName = TOUR_PHOTO;
  frame.dataset.morphSrc = "";
  root.dataset.morph = "";
  setMorphTour(id);
}

/**
 * Route changes run as a view transition: the old page leaves while the new one arrives (classes
 * page-exit / page-enter in globals.css). Phones get an iOS-style push — deeper pages slide in from
 * the right, shallower ones from the left, tabs at the same depth crossfade — read from
 * html[data-nav], which is set before Next starts the navigation. Browsers without view
 * transitions, and history back/forward, use the CSS enter animation on the wrapper (.page-in-*).
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [from, setFrom] = useState(pathname);
  const [dir, setDir] = useState<"forward" | "back">("forward");
  if (from !== pathname) {
    setDir(depth(pathname) >= depth(from) ? "forward" : "back");
    setFrom(pathname);
  }

  const current = useRef(pathname);
  useEffect(() => {
    if (current.current !== pathname) markNavigated();
    current.current = pathname;
    // Programmatic pushes (no link click) fall back to the crossfade
    const reset = window.setTimeout(() => {
      document.documentElement.dataset.nav = "swap";
      delete document.documentElement.dataset.pop;
      delete document.documentElement.dataset.morph;
      setMorphTour(null);
    }, 700);
    return () => window.clearTimeout(reset);
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement) || a.target === "_blank" || a.origin !== location.origin) return;
      if (a.pathname !== current.current) markNavigated();
      root.dataset.nav = navFor(current.current, a.pathname);
      morphFrom(a, a.pathname !== current.current);
    };
    // Back/forward buttons restore the page from the router cache outside a transition, so no view
    // transition runs; data-pop turns the wrapper's CSS enter animation back on for that render
    const onPop = () => {
      markNavigated();
      root.dataset.nav = navFor(current.current, location.pathname);
      root.dataset.pop = "1";
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPop);
    };
  }, []);

  return (
    <ViewTransition key={pathname} enter="page-enter" exit="page-exit" default="none">
      <div className={`page-in page-in-${dir}`}>{children}</div>
    </ViewTransition>
  );
}
