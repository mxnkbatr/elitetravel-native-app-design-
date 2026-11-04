import "server-only";

import { db } from "@/lib/server/trips";

export type SiteStats = {
  visitors: number;
  sessions: number;
  pageviews: number;
  funnel: {
    visitors: number;
    tour_viewers: number;
    booking_openers: number;
    /** Reached the name/phone part of the booking form */
    contact_reachers: number;
    /** Sent forms the server turned back (a count of attempts, not visitors) */
    booking_errors: number;
    booking_submitters: number;
    pay_openers: number;
  };
  daily: { day: string; visitors: number; views: number }[];
  tours: { tour_id: string; viewers: number; views: number; openers: number; submitters: number }[];
  sources: { source: string; visitors: number; submitters: number }[];
  devices: Record<string, number>;
};

const EMPTY: SiteStats = {
  visitors: 0,
  sessions: 0,
  pageviews: 0,
  funnel: { visitors: 0, tour_viewers: 0, booking_openers: 0, contact_reachers: 0, booking_errors: 0, booking_submitters: 0, pay_openers: 0 },
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
  const stats = data as SiteStats;
  // Before 0018_funnel_steps.sql the database has no contact/error counts
  return { ...EMPTY, ...stats, funnel: { ...EMPTY.funnel, ...stats?.funnel } };
}

/** Raw events are only kept long enough for year-on-year comparisons. */
export async function purgeOldEvents(days = 400) {
  const { count } = await db()
    .from("site_events")
    .delete({ count: "exact" })
    .lt("at", new Date(Date.now() - days * 86400_000).toISOString());
  return count ?? 0;
}
