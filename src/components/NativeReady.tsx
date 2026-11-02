"use client";

import { hideSplash } from "@/lib/native";
import { useEffect } from "react";

/** Lifts the native splash once the first screen has painted, so the app never shows a blank page. */
export function NativeReady() {
  useEffect(() => {
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => void hideSplash());
    });
    return () => cancelAnimationFrame(raf);
  }, []);
  return null;
}
