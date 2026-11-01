"use client";

import { track } from "@/lib/track";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** One "page" event per route change; tour pages also count as a tour view. */
export function PageTracker() {
  const pathname = usePathname();

  useEffect(() => {
    track("page");
    const tour = pathname.match(/^\/tours\/([a-z0-9-]+)$/)?.[1];
    if (tour) track("tour_view", { tour });
  }, [pathname]);

  return null;
}
