import "server-only";

import { can } from "@/lib/permissions";
import type { Admin } from "@/lib/server/auth";
import { db } from "@/lib/server/trips";

export type Pulse = {
  newBookings: number;
  /** New requests nobody has touched for 2+ hours */
  stale: string[];
  /** Bookings whose latest traveller message staff have not opened */
  unread: string[];
  installments: number;
  errors: number;
  /** Bookings with uploaded documents waiting for review */
  documents: string[];
  /** AI agent proposals waiting for a decision */
  proposals: number;
};

const none = () => Promise.resolve({ data: [] as never[], count: 0 });

/** What needs staff attention right now, limited to what this role may see. */
export async function pulseFor(admin: Admin): Promise<Pulse> {
  const client = db();
  const since = new Date(Date.now() - 60 * 86400_000).toISOString();
  const staleBefore = new Date(Date.now() - 2 * 3600_000).toISOString();
  const seesBookings = can(admin.role, "bookings.view");
  const [{ data: fresh }, { data: messages }, { count: installments }, { count: errors }, { data: docs }, { count: proposals }] = await Promise.all([
    seesBookings ? client.from("booking_requests").select("id, created_at").eq("status", "new") : none(),
    seesBookings ? client.from("booking_messages").select("booking_id, created_at").eq("sender", "traveller").gt("created_at", since) : none(),
    can(admin.role, "money.manage") ? client.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending").neq("method", "qpay") : none(),
    can(admin.role, "audit.view")
      ? client.from("error_log").select("id", { count: "exact", head: true }).eq("resolved", false).gt("at", new Date(Date.now() - 86400_000).toISOString())
      : none(),
    can(admin.role, "passports.view") ? client.from("booking_documents").select("booking_id").eq("status", "pending").limit(1000) : none(),
    can(admin.role, "agent.use") ? client.from("ai_proposals").select("id", { count: "exact", head: true }).eq("status", "pending").gt("created_at", new Date(Date.now() - 86400_000).toISOString()) : none(),
  ]);
  const stale = (fresh ?? []).filter((b) => b.created_at < staleBefore).map((b) => b.id);
  const latest = new Map<string, string>();
  for (const m of messages ?? []) if ((latest.get(m.booking_id) ?? "") < m.created_at) latest.set(m.booking_id, m.created_at);
  let unread: string[] = [];
  if (latest.size) {
    const { data: seen } = await client.from("booking_requests").select("id, staff_seen_at").in("id", [...latest.keys()]);
    unread = (seen ?? []).filter((b) => !b.staff_seen_at || b.staff_seen_at < latest.get(b.id)!).map((b) => b.id);
  }
  return {
    newBookings: fresh?.length ?? 0,
    stale,
    unread,
    installments: installments ?? 0,
    errors: errors ?? 0,
    documents: [...new Set((docs ?? []).map((d) => d.booking_id as string))],
    proposals: proposals ?? 0,
  };
}
