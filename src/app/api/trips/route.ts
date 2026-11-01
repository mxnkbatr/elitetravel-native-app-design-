import { db } from "@/lib/server/trips";
import type { TripStatus, TripSummary } from "@/lib/trips";

export const runtime = "nodejs";

/** Status + unread count for every booking on the device: { tokens: string[] } → TripSummary[] */
export async function POST(request: Request) {
  let tokens: string[];
  try {
    const body = (await request.json()) as { tokens?: unknown };
    tokens = Array.isArray(body.tokens) ? body.tokens.filter((t): t is string => typeof t === "string" && /^[A-Za-z0-9_-]{20,64}$/.test(t)) : [];
  } catch {
    return Response.json({ error: "Хүсэлт буруу байна." }, { status: 400 });
  }
  if (!tokens.length) return Response.json([]);

  const client = db();
  const { data: rows } = await client
    .from("booking_requests")
    .select("id, status, paid_amount, total, traveller_seen_at")
    .in("access_token", tokens.slice(0, 30));
  if (!rows?.length) return Response.json([]);

  const oldestSeen = rows.reduce<string | null>((min, r) => (r.traveller_seen_at && (!min || r.traveller_seen_at < min) ? r.traveller_seen_at : min), null);
  let query = client.from("booking_messages").select("booking_id, created_at").in("booking_id", rows.map((r) => r.id)).neq("sender", "traveller");
  if (oldestSeen && rows.every((r) => r.traveller_seen_at)) query = query.gt("created_at", oldestSeen);
  const { data: messages } = await query;

  const summaries: TripSummary[] = rows.map((r) => ({
    id: r.id,
    status: r.status as TripStatus,
    paidAmount: Number(r.paid_amount),
    total: Number(r.total),
    unread: (messages ?? []).filter((m) => m.booking_id === r.id && (!r.traveller_seen_at || m.created_at > r.traveller_seen_at)).length,
  }));
  return Response.json(summaries);
}
