import "server-only";

import { db } from "@/lib/server/trips";

export type SiteStats = {
  visitors: number;
  sessions: number;
  pageviews: number;
  funnel: { visitors: number; tour_viewers: number; booking_openers: number; booking_submitters: number; pay_openers: number };
  daily: { day: string; visitors: number; views: number }[];
  tours: { tour_id: string; viewers: number; views: number; openers: number; submitters: number }[];
  sources: { source: string; visitors: number; submitters: number }[];
  devices: Record<string, number>;
};

const EMPTY: SiteStats = {
  visitors: 0,
  sessions: 0,
  pageviews: 0,
  funnel: { visitors: 0, tour_viewers: 0, booking_openers: 0, booking_submitters: 0, pay_openers: 0 },
  daily: [],
  tours: [],
  sources: [],
  devices: {},
};

/** Visits between two instants, aggregated in the database (see site_stats in 0011_analytics.sql). */
export async function siteStats(from: Date, to: Date): Promise<SiteStats> {
  const { data, error } = await db().rpc("site_stats", { p_from: from.toISOString(), p_to: to.toISOString() });
  if (error) {
    console.error("site_stats failed", error.code, error.message);
    return EMPTY;
  }
  return { ...EMPTY, ...(data as SiteStats) };
}

/** Raw events are only kept long enough for year-on-year comparisons. */
export async function purgeOldEvents(days = 400) {
  const { count } = await db()
    .from("site_events")
    .delete({ count: "exact" })
    .lt("at", new Date(Date.now() - days * 86400_000).toISOString());
  return count ?? 0;
}
