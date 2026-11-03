"use server";

import { saveDeparture, saveNews, saveTour, sendStaffMessage, updateBooking } from "@/app/admin/(panel)/actions";
import { PROPOSAL_PERMISSION, type ProposalKind, type ProposalStatus } from "@/lib/agent";
import { can } from "@/lib/permissions";
import { deleteConversation } from "@/lib/server/agent/conversations";
import { audit } from "@/lib/server/audit";
import { requireAdmin, type Admin } from "@/lib/server/auth";
import { db } from "@/lib/server/trips";
import { revalidatePath } from "next/cache";

export type DecideResult = { ok: true; status: ProposalStatus } | { ok: false; status?: ProposalStatus; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Proposals older than this are refused: the facts the agent saw may have changed. */
const MAX_AGE_MS = 24 * 3600_000;
const DENIED = "Танд энэ саналыг шийдэх эрх алга.";

type Proposal = { id: string; kind: ProposalKind; target_id: string; base_updated_at: string | null; payload: Record<string, unknown>; status: ProposalStatus; created_at: string; admin_email: string };

async function setStatus(id: string, status: ProposalStatus, by: string, error?: string) {
  await db().from("ai_proposals").update({ status, decided_at: new Date().toISOString(), decided_by: by, error: error ?? null }).eq("id", id);
}

/** Why the proposal no longer matches the data it was based on, or null when it still does. */
async function staleReason(p: Proposal): Promise<string | null> {
  if (Date.now() - new Date(p.created_at).getTime() > MAX_AGE_MS) return "Санал 24 цагаас хуучирсан тул хүчингүй боллоо. Дахин бэлдүүлнэ үү.";
  const client = db();
  if (p.kind === "tour.update") {
    const { data: tour } = await client.from("tours").select("updated_at").eq("id", p.target_id).maybeSingle();
    if (!tour) return "Энэ аялал устсан байна.";
    if (new Date(tour.updated_at).getTime() !== new Date(p.base_updated_at ?? 0).getTime()) {
      return "Санал бэлдсэнээс хойш аяллыг өөр хүн зассан тул хүчингүй. Шинэ мэдээллээр дахин бэлдүүлнэ үү.";
    }
  }
  if (p.kind === "departure.update") {
    const base = p.payload.base as { capacity: number | null; closed: boolean };
    const { data: dep } = await client.from("departures").select("capacity, closed").eq("tour_id", p.payload.tourId).eq("date_label", p.payload.label).maybeSingle();
    if (((dep?.capacity as number | null | undefined) ?? null) !== base.capacity || ((dep?.closed as boolean | undefined) ?? false) !== base.closed) {
      return "Санал бэлдсэнээс хойш энэ огнооны суудлыг өөр хүн өөрчилсөн тул хүчингүй.";
    }
  }
  if (p.kind === "message.send") {
    const { data: b } = await client.from("booking_requests").select("status").eq("id", p.target_id).maybeSingle();
    if (!b || b.status === "cancelled") return "Захиалга устсан эсвэл цуцлагдсан байна.";
  }
  if (p.kind === "booking.status") {
    const { data: b } = await client.from("booking_requests").select("status").eq("id", p.target_id).maybeSingle();
    if (!b) return "Захиалга устсан байна.";
    if (b.status !== p.payload.base) return "Санал бэлдсэнээс хойш захиалгын төлөвийг өөр хүн сольсон тул хүчингүй.";
  }
  return null;
}

/** Applies a claimed proposal through the same path the matching admin screen uses. */
function apply(p: Proposal) {
  const x = p.payload;
  switch (p.kind) {
    case "tour.create":
      return saveTour(x, null);
    case "tour.update":
      return saveTour(x, p.target_id);
    case "departure.update":
      return saveDeparture(String(x.tourId), String(x.label), x.capacity as number | null, Boolean(x.closed));
    case "message.send":
      return sendStaffMessage(String(x.bookingId), String(x.text));
    case "news.create":
      return saveNews(x, null);
    case "booking.status":
      return updateBooking(String(x.bookingId), { status: String(x.status) });
  }
}

const mayDecide = (admin: Admin, kind: ProposalKind) => can(admin.role, PROPOSAL_PERMISSION[kind]);

/**
 * Applies an agent proposal (validation, cache refresh, push and audit come from the
 * existing save path). Refused when stale: the data changed after the agent read it, or
 * the proposal is more than a day old.
 */
export async function approveProposal(id: string): Promise<DecideResult> {
  const admin = await requireAdmin("agent.use");
  if (!UUID.test(id)) return { ok: false, error: "Буруу хүсэлт." };
  const client = db();
  const { data } = await client.from("ai_proposals").select("id, kind, target_id, base_updated_at, payload, status, created_at, admin_email").eq("id", id).maybeSingle();
  const p = data as Proposal | null;
  if (!p) return { ok: false, error: "Санал олдсонгүй." };
  if (!mayDecide(admin, p.kind)) return { ok: false, error: DENIED };
  if (p.status !== "pending") return { ok: false, status: p.status, error: "Энэ саналыг аль хэдийн шийдсэн байна." };

  const stale = await staleReason(p);
  if (stale) {
    await setStatus(id, "stale", admin.email, stale.slice(0, 200));
    return { ok: false, status: "stale", error: stale };
  }

  // Claim it first so a double tap cannot apply it twice
  const { data: claimed } = await client.from("ai_proposals").update({ status: "applied", decided_at: new Date().toISOString(), decided_by: admin.email }).eq("id", id).eq("status", "pending").select("id");
  if (!claimed?.length) return { ok: false, error: "Энэ саналыг аль хэдийн шийдсэн байна." };

  const saved = await apply(p);
  if (!saved.ok) {
    await setStatus(id, "failed", admin.email, saved.error);
    await audit(admin.email, "agent.proposal.failed", { type: p.kind.split(".")[0], id: p.target_id }, { proposal: id, error: saved.error });
    return { ok: false, status: "failed", error: saved.error };
  }
  await audit(admin.email, "agent.proposal.approve", { type: p.kind.split(".")[0], id: p.target_id }, { proposal: id, kind: p.kind });
  revalidatePath("/admin/agent", "layout");
  return { ok: true, status: "applied" };
}

export async function cancelProposal(id: string): Promise<DecideResult> {
  const admin = await requireAdmin("agent.use");
  if (!UUID.test(id)) return { ok: false, error: "Буруу хүсэлт." };
  const { data } = await db().from("ai_proposals").select("admin_email, kind, target_id, status").eq("id", id).maybeSingle();
  if (!data) return { ok: false, error: "Санал олдсонгүй." };
  if (data.admin_email !== admin.email && !mayDecide(admin, data.kind as ProposalKind)) return { ok: false, error: DENIED };
  if (data.status !== "pending") return { ok: false, status: data.status as ProposalStatus, error: "Энэ саналыг аль хэдийн шийдсэн байна." };
  const { data: done } = await db()
    .from("ai_proposals")
    .update({ status: "cancelled", decided_at: new Date().toISOString(), decided_by: admin.email })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  if (!done?.length) return { ok: false, error: "Энэ саналыг аль хэдийн шийдсэн байна." };
  await audit(admin.email, "agent.proposal.cancel", { type: String(data.kind).split(".")[0], id: data.target_id }, { proposal: id });
  return { ok: true, status: "cancelled" };
}

export async function removeConversation(id: string) {
  const admin = await requireAdmin("agent.use");
  if (!UUID.test(id)) return;
  await deleteConversation(id, admin.email);
  revalidatePath("/admin/agent", "layout");
}
