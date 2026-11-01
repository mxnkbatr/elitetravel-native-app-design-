import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Writes to the error_log table. Kept free of `server-only` and Next imports so the
 * instrumentation hook can load it. Never throws: reporting must not cause new failures.
 */
let client: SupabaseClient | null = null;
const recent = new Map<string, number>();

export async function logError(entry: { source: "server" | "client"; message: string; digest?: string; path?: string; context?: Record<string, unknown> }) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return;

  // The same error from the same place is stored at most once a minute per instance
  const fingerprint = `${entry.source}|${entry.message}|${entry.path ?? ""}`;
  const now = Date.now();
  if ((recent.get(fingerprint) ?? 0) > now - 60_000) return;
  recent.set(fingerprint, now);
  if (recent.size > 500) for (const [k, t] of recent) if (t < now - 60_000) recent.delete(k);

  try {
    client ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    await client.from("error_log").insert({
      source: entry.source,
      message: entry.message.slice(0, 2000),
      digest: entry.digest?.slice(0, 100) ?? null,
      path: entry.path?.slice(0, 500) ?? null,
      context: entry.context ?? null,
    });
  } catch (e) {
    console.error("error log write failed", e);
  }
}
