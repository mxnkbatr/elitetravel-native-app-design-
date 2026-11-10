import "server-only";

import { seedNews, type NewsItem } from "@/data/news";
import { ensureTourCalculator, seedTours, type Tour } from "@/data/tours";
import { reportError } from "@/lib/server/error-log";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { unstable_cache } from "next/cache";

/** Cache tag shared by every page that renders tours or news; /admin saves revalidate it. */
export const CONTENT_TAG = "content";

async function load<T>(table: "tours" | "news", fallback: T[]): Promise<T[]> {
  const db = supabaseAdmin();
  // Local dev without Supabase keys still renders the original catalogue
  if (!db) {
    return table === "tours" ? (fallback as Tour[]).map(ensureTourCalculator) as T[] : fallback;
  }
  const { data, error } = await db.from(table).select("data").order("position").order("id");
  if (error) {
    await reportError(`${table} load failed`, error);
    throw new Error(`Could not load ${table}`);
  }
  const rows = data.map((row) => row.data as T);
  if (table === "tours") return (rows as Tour[]).map(ensureTourCalculator) as T[];
  return rows;
}

const cachedTours = unstable_cache(() => load<Tour>("tours", seedTours), ["tours"], {
  tags: [CONTENT_TAG],
  // Short TTL: scripts upsert outside /admin, so hour-long cache hid new tours on Vercel
  revalidate: 60,
});

const cachedNews = unstable_cache(() => load<NewsItem>("news", seedNews), ["news"], {
  tags: [CONTENT_TAG],
  revalidate: 60,
});

/** Dev skips Data Cache so script/admin upserts show on the next refresh. */
export const getTours = process.env.NODE_ENV === "development" ? () => load<Tour>("tours", seedTours) : cachedTours;
export const getNews = process.env.NODE_ENV === "development" ? () => load<NewsItem>("news", seedNews) : cachedNews;
