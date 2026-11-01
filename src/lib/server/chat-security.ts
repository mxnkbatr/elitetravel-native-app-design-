import "server-only";

/** From elite-chatbot/lib/security.ts: origin allowlist and a per-instance rate limit for /api/chat. */

const allowedOrigins = () =>
  (process.env.ALLOWED_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function originAllowed(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin / curl
  const allowed = allowedOrigins();
  if (allowed.includes("*") || allowed.includes(origin)) return true;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}

const hits = new Map<string, number[]>();

export function rateLimit(key: string, max = Number(process.env.RATE_LIMIT_PER_MIN || 20), windowMs = 60_000) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
  return arr.length <= max;
}

export const clientIp = (req: Request) => (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || req.headers.get("x-real-ip") || "anon";
