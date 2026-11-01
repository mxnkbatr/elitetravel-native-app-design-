"use server";

import { saveTour } from "@/app/admin/(panel)/actions";
import type { ProposalStatus } from "@/lib/agent";
import { can } from "@/lib/permissions";
import { deleteConversation } from "@/lib/server/agent/conversations";
import { audit } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/trips";
import { revalidatePath } from "next/cache";

export type DecideResult = { ok: true; status: ProposalStatus } | { ok: false; status?: ProposalStatus; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Proposals older than this are refused: the facts the agent saw may have changed. */
const MAX_AGE_MS = 24 * 3600_000;

async function setStatus(id: string, status: ProposalStatus, by: string, error?: string) {
  await db().from("ai_proposals").update({ status, decided_at: new Date().toISOString(), decided_by: by, error: error ?? null }).eq("id", id);
}

/**
 * Applies an agent proposal through the same save path as the tour editor (validation,
 * cache refresh, audit). Refused when it is stale: someone edited the tour after the agent
 * read it, or the proposal is more than a day old.
 */
export async function approveProposal(id: string): Promise<DecideResult> {
  const admin = await requireAdmin("content.manage");
  if (!UUID.test(id)) return { ok: false, error: "Буруу хүсэлт." };
  const client = db();
  const { data: p } = await client.from("ai_proposals").select("id, kind, target_id, base_updated_at, payload, status, created_at").eq("id", id).maybeSingle();
  if (!p) return { ok: false, error: "Санал олдсонгүй." };
  if (p.status !== "pending") return { ok: false, status: p.status as ProposalStatus, error: "Энэ саналыг аль хэдийн шийдсэн байна." };

  if (Date.now() - new Date(p.created_at).getTime() > MAX_AGE_MS) {
    await setStatus(id, "stale", admin.email, "24 цагаас хуучирсан");
    return { ok: false, status: "stale", error: "Санал 24 цагаас хуучирсан тул хүчингүй боллоо. Дахин бэлдүүлнэ үү." };
  }
  if (p.kind === "tour.update") {
    const { data: tour } = await client.from("tours").select("updated_at").eq("id", p.target_id).maybeSingle();
    if (!tour) {
      await setStatus(id, "stale", admin.email, "Аялал устсан");
      return { ok: false, status: "stale", error: "Энэ аялал устсан байна." };
    }
    if (new Date(tour.updated_at).getTime() !== new Date(p.base_updated_at).getTime()) {
      await setStatus(id, "stale", admin.email, "Аяллыг өөр хүн зассан");
      return { ok: false, status: "stale", error: "Санал бэлдсэнээс хойш аяллыг өөр хүн зассан тул хүчингүй. Шинэ мэдээллээр дахин бэлдүүлнэ үү." };
    }
  }

  // Claim it first so a double tap cannot apply it twice
  const { data: claimed } = await client.from("ai_proposals").update({ status: "applied", decided_at: new Date().toISOString(), decided_by: admin.email }).eq("id", id).eq("status", "pending").select("id");
  if (!claimed?.length) return { ok: false, error: "Энэ саналыг аль хэдийн шийдсэн байна." };

  const saved = await saveTour(p.payload, p.kind === "tour.update" ? p.target_id : null);
  if (!saved.ok) {
    await setStatus(id, "failed", admin.email, saved.error);
    await audit(admin.email, "agent.proposal.failed", { type: "tours", id: p.target_id }, { proposal: id, error: saved.error });
    return { ok: false, status: "failed", error: saved.error };
  }
  await audit(admin.email, "agent.proposal.approve", { type: "tours", id: p.target_id }, { proposal: id, kind: p.kind });
  revalidatePath("/admin/agent");
  return { ok: true, status: "applied" };
}

export async function cancelProposal(id: string): Promise<DecideResult> {
  const admin = await requireAdmin("agent.use");
  if (!UUID.test(id)) return { ok: false, error: "Буруу хүсэлт." };
  const { data: p } = await db().from("ai_proposals").select("admin_email, target_id, status").eq("id", id).maybeSingle();
  if (!p) return { ok: false, error: "Санал олдсонгүй." };
  if (p.admin_email !== admin.email && !can(admin.role, "content.manage")) return { ok: false, error: "Танд энэ саналыг цуцлах эрх алга." };
  if (p.status !== "pending") return { ok: false, status: p.status as ProposalStatus, error: "Энэ саналыг аль хэдийн шийдсэн байна." };
  const { data } = await db()
    .from("ai_proposals")
    .update({ status: "cancelled", decided_at: new Date().toISOString(), decided_by: admin.email })
    .eq("id", id)
    .eq("status", "pending")
    .select("id");
  if (!data?.length) return { ok: false, error: "Энэ саналыг аль хэдийн шийдсэн байна." };
  await audit(admin.email, "agent.proposal.cancel", { type: "tours", id: p.target_id }, { proposal: id });
  return { ok: true, status: "cancelled" };
}

export async function removeConversation(id: string) {
  const admin = await requireAdmin("agent.use");
  if (!UUID.test(id)) return;
  await deleteConversation(id, admin.email);
  revalidatePath("/admin/agent");
}
