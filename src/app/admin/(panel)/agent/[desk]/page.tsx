import { AgentChat } from "@/app/admin/(panel)/agent/AgentChat";
import type { DeskContext } from "@/app/admin/(panel)/agent/DeskIntro";
import type { ProposalStatus } from "@/lib/agent";
import { DESK_INFO, DESK_PERMISSION, isDesk, type Desk } from "@/lib/agent-desks";
import { chatThreads } from "@/lib/server/agent/chats";
import { getConversation, listConversations } from "@/lib/server/agent/conversations";
import { chatModel } from "@/lib/server/ai";
import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/trips";
import { notFound, redirect } from "next/navigation";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function generateMetadata({ params }: PageProps<"/admin/agent/[desk]">) {
  const { desk } = await params;
  return { title: isDesk(desk) ? DESK_INFO[desk].title : "AI" };
}

async function deskContext(desk: Desk): Promise<DeskContext> {
  if (desk === "chats") return { kind: "chats", threads: await chatThreads({ limit: 12 }) };
  if (desk === "boost") return { kind: "boost", metaReady: !!(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID && process.env.META_PAGE_ID) };
  if (desk === "bookings") return { kind: "bookings" };
  return { kind: "site" };
}

export default async function AdminAgentDeskPage({ params, searchParams }: PageProps<"/admin/agent/[desk]">) {
  const { desk } = await params;
  if (!isDesk(desk)) notFound();
  await requireAdmin("agent.use");
  const admin = await requireAdmin(DESK_PERMISSION[desk]);
  const { c, ask } = await searchParams;
  const [conversations, open, context] = await Promise.all([
    listConversations(admin.email, desk),
    typeof c === "string" && UUID.test(c) ? getConversation(c, admin.email) : Promise.resolve(null),
    deskContext(desk),
  ]);
  // A chat opened from another desk's link lives on its own desk
  if (open && open.desk !== desk) redirect(`/admin/agent/${open.desk}?c=${open.id}`);

  // Live status of every proposal in this chat (it may have been approved elsewhere since)
  const statuses: Record<string, ProposalStatus> = {};
  if (open) {
    const { data } = await db().from("ai_proposals").select("id, status").eq("conversation_id", open.id);
    for (const p of data ?? []) statuses[p.id as string] = p.status as ProposalStatus;
  }

  return (
    <AgentChat
      key={`${desk}-${open?.id ?? `new-${typeof ask === "string" ? ask : ""}`}`}
      desk={desk}
      context={context}
      ask={!open && typeof ask === "string" ? ask.slice(0, 1000) : undefined}
      conversations={conversations}
      initial={open ? { id: open.id, messages: open.messages } : null}
      statuses={statuses}
      role={admin.role}
      configured={chatModel() != null}
    />
  );
}
