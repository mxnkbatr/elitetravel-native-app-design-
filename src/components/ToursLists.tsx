"use client";

import { MobileTours } from "@/components/MobileTours";
import { Tours } from "@/components/Tours";
import { useSearchParams } from "next/navigation";

/** The phone and desktop tour lists, starting on the destination chip `dest`. */
export function ToursLists({ dest = "all" }: { dest?: string }) {
  return (
    <>
      <div className="px-4 sm:hidden">
        {/* A new ?dest= while on the page restarts the phone list on that chip */}
        <MobileTours key={dest} initialFilter={dest} />
      </div>
      <div className="hidden sm:block">
        <Tours showHeader={false} initialFilter={dest} />
      </div>
    </>
  );
}

/**
 * Reads ?dest= in the browser, so /tours itself stays a static page: it is prefetched with the
 * links to it and opens at once, instead of showing the loading skeleton while the server
 * renders a page for every query string.
 */
export function ToursListsFromUrl() {
  return <ToursLists dest={useSearchParams().get("dest") ?? "all"} />;
}
