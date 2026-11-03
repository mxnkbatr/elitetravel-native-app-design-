import "server-only";

import { firstName } from "@/lib/agent";
import { db } from "@/lib/server/trips";
import { STATUS_LABEL, type TripStatus } from "@/lib/trips";

export type ChatThread = {
  bookingId: string;
  name: string;
  tour: string;
  status: string;
  lastAt: string;
  lastFrom: "traveller" | "staff" | "system";
  lastText: string;
  /** The traveller wrote last: nobody has answered yet */
  unanswered: boolean;
  /** Staff have not opened the thread since the traveller's latest message */
  unread: boolean;
  messages: number;
};

/** Booking chats with recent activity, newest first. Travellers appear by first name only. */
export async function chatThreads(opts: { days?: number; limit?: number; onlyUnanswered?: boolean } = {}): Promise<ChatThread[]> {
  const since = new Date(Date.now() - (opts.days ?? 30) * 86400_000).toISOString();
  const client = db();
  const { data: rows } = await client
    .from("booking_messages")
    .select("booking_id, created_at, sender, body")
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1500);
  const byBooking = new Map<string, { last: { created_at: string; sender: string; body: string }; lastTraveller: string | null; count: number }>();
  for (const m of rows ?? []) {
    const t = byBooking.get(m.booking_id);
    if (!t) byBooking.set(m.booking_id, { last: m, lastTraveller: m.sender === "traveller" ? m.created_at : null, count: 1 });
    else {
      t.count++;
      if (!t.lastTraveller && m.sender === "traveller") t.lastTraveller = m.created_at;
    }
  }
  if (!byBooking.size) return [];
  const { data: bookings } = await client.from("booking_requests").select("id, name, tour_title, status, staff_seen_at").in("id", [...byBooking.keys()]);
  const threads = (bookings ?? []).map((b) => {
    const t = byBooking.get(b.id as string)!;
    // System notices (status changes) don't count as an answer or a question
    const lastFrom = t.last.sender as ChatThread["lastFrom"];
    return {
      bookingId: b.id as string,
      name: firstName(b.name as string),
      tour: b.tour_title as string,
      status: STATUS_LABEL[b.status as TripStatus] ?? String(b.status),
      lastAt: t.last.created_at,
      lastFrom,
      lastText: t.last.body.slice(0, 240),
      unanswered: lastFrom === "traveller",
      unread: !!t.lastTraveller && (!b.staff_seen_at || (b.staff_seen_at as string) < t.lastTraveller),
      messages: t.count,
    };
  });
  return threads
    .filter((t) => !opts.onlyUnanswered || t.unanswered)
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
    .slice(0, opts.limit ?? 30);
}
