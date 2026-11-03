import { AgentChat } from "@/app/admin/(panel)/agent/AgentChat";
import type { ProposalStatus } from "@/lib/agent";
import { getConversation, listConversations } from "@/lib/server/agent/conversations";
import { chatModel } from "@/lib/server/ai";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/trips";

export const metadata = { title: "Elite Travel Agentic AI" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function AdminAgentPage({ searchParams }: PageProps<"/admin/agent">) {
  const admin = await requireAdmin("agent.use");
  const { c, ask } = await searchParams;
  const [conversations, open] = await Promise.all([
    listConversations(admin.email),
    typeof c === "string" && UUID.test(c) ? getConversation(c, admin.email) : Promise.resolve(null),
  ]);

  // Live status of every proposal in this chat (it may have been approved elsewhere since)
  const statuses: Record<string, ProposalStatus> = {};
  if (open) {
    const { data } = await db().from("ai_proposals").select("id, status").eq("conversation_id", open.id);
    for (const p of data ?? []) statuses[p.id as string] = p.status as ProposalStatus;
  }

  return (
    <AgentChat
      key={open?.id ?? `new-${typeof ask === "string" ? ask : ""}`}
      ask={!open && typeof ask === "string" ? ask.slice(0, 1000) : undefined}
      conversations={conversations}
      initial={open ? { id: open.id, messages: open.messages } : null}
      statuses={statuses}
      role={admin.role}
      configured={chatModel() != null}
    />
  );
}
