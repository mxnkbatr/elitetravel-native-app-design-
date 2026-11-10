import "server-only";

import { seedNews, type NewsItem } from "@/data/news";
import { seedTours, type Tour } from "@/data/tours";
import { reportError } from "@/lib/server/error-log";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { unstable_cache } from "next/cache";

/** Cache tag shared by every page that renders tours or news; /admin saves revalidate it. */
export const CONTENT_TAG = "content";

async function load<T>(table: "tours" | "news", fallback: T[]): Promise<T[]> {
  const db = supabaseAdmin();
  // Local dev without Supabase keys still renders the original catalogue
  if (!db) return fallback;
  const { data, error } = await db.from(table).select("data").order("position").order("id");
  if (error) {
    await reportError(`${table} load failed`, error);
    throw new Error(`Could not load ${table}`);
  }
  return data.map((row) => row.data as T);
}

const cachedTours = unstable_cache(() => load<Tour>("tours", seedTours), ["tours"], {
  tags: [CONTENT_TAG],
  revalidate: 3600,
});

const cachedNews = unstable_cache(() => load<NewsItem>("news", seedNews), ["news"], {
  tags: [CONTENT_TAG],
  revalidate: 3600,
});

/** Dev skips the hour-long cache so script/admin upserts show up on refresh. */
export const getTours = process.env.NODE_ENV === "development" ? () => load<Tour>("tours", seedTours) : cachedTours;
export const getNews = process.env.NODE_ENV === "development" ? () => load<NewsItem>("news", seedNews) : cachedNews;
