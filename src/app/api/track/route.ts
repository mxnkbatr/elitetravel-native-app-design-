import { isBot, parseEvent } from "@/lib/analytics";
import { clientIp, rateLimit } from "@/lib/server/chat-security";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";

const done = () => new Response(null, { status: 204 });

/**
 * One anonymous analytics event from the browser (sendBeacon, so the body is text).
 * Only the real site records: previews, the other Vercel projects and local dev answer
 * 204 without writing, so they never skew the numbers. Nothing identifying is stored.
 */
export async function POST(request: Request) {
  const ownHost = new URL(siteUrl()).host;
  const host = request.headers.get("host");
  if (host !== ownHost && process.env.ANALYTICS_ANY_HOST !== "on") return done();
  if (isBot(request.headers.get("user-agent"))) return done();
  if (!rateLimit(`track:${clientIp(request)}`, 120)) return done();

  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return done();
  }
  const event = parseEvent(body, ownHost);
  const db = supabaseAdmin();
  if (!event || !db) return done();

  const country = request.headers.get("x-vercel-ip-country");
  const { error } = await db.from("site_events").insert({ ...event, country: country && /^[A-Z]{2}$/.test(country) ? country : null });
  if (error) console.error("track insert failed", error.code, error.message);
  return done();
}
