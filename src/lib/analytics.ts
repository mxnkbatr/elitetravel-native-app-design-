/** Shared rules for the site's own analytics (browser tracker, /api/track, reports). */

export const EVENT_TYPES = ["page", "tour_view", "booking_open", "booking_contact", "booking_submit", "booking_error", "pay_open", "chat_open"] as const;
export type EventType = (typeof EVENT_TYPES)[number];
export const DEVICES = ["phone", "tablet", "desktop", "app"] as const;
export type Device = (typeof DEVICES)[number];

export const SOURCE_LABEL: Record<string, string> = {
  direct: "Шууд / хаяг бичиж",
  instagram: "Instagram",
  facebook: "Facebook",
  google: "Google",
  tiktok: "TikTok",
  youtube: "YouTube",
  threads: "Threads",
  x: "X (Twitter)",
};

/**
 * Where a visit came from: utm_source when the link was tagged, else the referring site
 * folded into a known network ("l.instagram.com" → instagram), else the bare host.
 */
export function visitSource(referrer: string | null | undefined, utmSource: string | null | undefined, ownHost: string) {
  const tagged = (utmSource ?? "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 40);
  if (tagged) return tagged === "ig" ? "instagram" : tagged === "fb" ? "facebook" : tagged;
  let host = "";
  try {
    host = referrer ? new URL(referrer).hostname.toLowerCase() : "";
  } catch {
    return null;
  }
  if (!host || host === ownHost) return null;
  host = host.replace(/^(www|m|l|lm|mobile)\./, "");
  if (/(^|\.)instagram\.com$/.test(host)) return "instagram";
  if (/(^|\.)(facebook\.com|fb\.com|messenger\.com)$/.test(host)) return "facebook";
  if (/(^|\.)google\.[a-z.]+$/.test(host)) return "google";
  if (/(^|\.)tiktok\.com$/.test(host)) return "tiktok";
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) return "youtube";
  if (/(^|\.)threads\.net$/.test(host)) return "threads";
  if (/(^|\.)(t\.co|x\.com|twitter\.com)$/.test(host)) return "x";
  return host.slice(0, 60);
}

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|embedly|pingdom|monitor|curl|wget|python|node-fetch|axios/i;
export const isBot = (userAgent: string | null) => !userAgent || BOT.test(userAgent);

const ID = /^[A-Za-z0-9_-]{8,40}$/;
const TOUR = /^[a-z0-9-]{2,60}$/;

export type TrackEvent = { visitor: string; session: string; type: EventType; path: string | null; tour_id: string | null; source: string | null; utm_campaign: string | null; device: Device | null };

/** Validates one event from the browser; anything malformed is dropped (null). */
export function parseEvent(input: unknown, ownHost: string): TrackEvent | null {
  if (!input || typeof input !== "object") return null;
  const e = input as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  const visitor = str(e.visitor);
  const session = str(e.session);
  const type = EVENT_TYPES.find((t) => t === e.type);
  if (!visitor || !ID.test(visitor) || !session || !ID.test(session) || !type) return null;
  const path = str(e.path);
  const tour = str(e.tour);
  return {
    visitor,
    session,
    type,
    path: path && path.startsWith("/") ? path.split("?")[0].slice(0, 300) : null,
    tour_id: tour && TOUR.test(tour) ? tour : null,
    source: visitSource(str(e.referrer), str(e.utm_source), ownHost),
    utm_campaign: str(e.utm_campaign)?.replace(/[^\p{L}\p{N}._ -]/gu, "").slice(0, 60) || null,
    device: DEVICES.find((d) => d === e.device) ?? null,
  };
}
