import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Writes to the error_log table. Kept free of `server-only` and Next imports so the
 * instrumentation hook can load it. Never throws: reporting must not cause new failures.
 */
let client: SupabaseClient | null = null;
const recent = new Map<string, number>();
let alerts: number[] = [];

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
    const message = entry.message.slice(0, 2000);
    const { data: seen } = await client
      .from("error_log")
      .select("id")
      .eq("message", message)
      .eq("resolved", false)
      .gt("at", new Date(now - 86400_000).toISOString())
      .limit(1);
    await client.from("error_log").insert({
      source: entry.source,
      message,
      digest: entry.digest?.slice(0, 100) ?? null,
      path: entry.path?.slice(0, 500) ?? null,
      context: entry.context ?? null,
    });
    if (entry.source === "server" && !seen?.length) await alertStaff(message, entry.path);
  } catch (e) {
    console.error("error log write failed", e);
  }
}

/**
 * Pushes a server error to staff who can see /admin/errors the first time it shows up in a day,
 * at most 3 alerts per 10 minutes per instance so an outage does not flood their phones.
 */
async function alertStaff(message: string, path?: string) {
  const now = Date.now();
  alerts = alerts.filter((t) => t > now - 10 * 60_000);
  if (alerts.length >= 3) return;
  alerts.push(now);
  try {
    // push.ts is server-only; where that cannot load (the instrumentation hook) the error is still logged
    const { pushToStaff } = await import("@/lib/server/push");
    await pushToStaff("audit.view", {
      title: "⚠️ Сайтад алдаа гарлаа",
      body: `${message.slice(0, 140)}${path ? ` · ${path}` : ""}`,
      url: "/admin/errors",
      tag: "site-error",
    });
  } catch (e) {
    console.error("error alert failed", e instanceof Error ? e.message : e);
  }
}

/** For failures a route handles itself (it answers the user) but staff should still hear about. */
export async function reportError(where: string, e: unknown, context?: Record<string, unknown>) {
  const detail = e instanceof Error ? `${e.name}: ${e.message}` : typeof e === "string" ? e : JSON.stringify(e);
  console.error(where, detail);
  await logError({
    source: "server",
    message: `${where}: ${detail}`,
    context: { ...context, stack: e instanceof Error ? e.stack?.split("\n").slice(0, 6).join("\n") : undefined },
  });
}
