import "server-only";

import { isDesk, type Desk } from "@/lib/agent-desks";
import { db } from "@/lib/server/trips";
import type { UIMessage } from "ai";

/** Saved agent chats. Each belongs to one staff member and one desk; nobody else can read or continue it. */

export type ConversationSummary = { id: string; title: string; updatedAt: string };

export async function listConversations(email: string, desk: Desk): Promise<ConversationSummary[]> {
  const { data } = await db()
    .from("ai_conversations")
    .select("id, title, updated_at")
    .eq("admin_email", email)
    .eq("desk", desk)
    .order("updated_at", { ascending: false })
    .limit(40);
  return (data ?? []).map((r) => ({ id: r.id as string, title: r.title as string, updatedAt: r.updated_at as string }));
}

export async function getConversation(id: string, email: string) {
  const { data } = await db().from("ai_conversations").select("id, title, messages, admin_email, desk").eq("id", id).maybeSingle();
  if (!data || data.admin_email !== email) return null;
  return { id: data.id as string, title: data.title as string, desk: (isDesk(data.desk) ? data.desk : "site") as Desk, messages: (data.messages ?? []) as UIMessage[] };
}

/** Starts a chat under the id the browser picked, or returns null when that id is someone else's. */
export async function openConversation(id: string, email: string, firstText: string, desk: Desk) {
  const existing = await getConversation(id, email);
  if (existing) return existing;
  const title = firstText.replace(/\s+/g, " ").trim().slice(0, 60) || "Шинэ яриа";
  const { error } = await db().from("ai_conversations").insert({ id, admin_email: email, title, desk });
  if (error) return null;
  return { id, title, desk, messages: [] as UIMessage[] };
}

export async function saveConversation(id: string, email: string, messages: UIMessage[]) {
  const { error } = await db()
    .from("ai_conversations")
    .update({ messages: messages.slice(-200), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("admin_email", email);
  if (error) console.error("agent conversation save failed", error.code, error.message);
}

export async function deleteConversation(id: string, email: string) {
  await db().from("ai_conversations").delete().eq("id", id).eq("admin_email", email);
}
