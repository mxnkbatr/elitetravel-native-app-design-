import "server-only";

import { db } from "@/lib/server/trips";
import type { UIMessage } from "ai";

/** Saved agent chats. Each belongs to one staff member; nobody else can read or continue it. */

export type ConversationSummary = { id: string; title: string; updatedAt: string };

export async function listConversations(email: string): Promise<ConversationSummary[]> {
  const { data } = await db().from("ai_conversations").select("id, title, updated_at").eq("admin_email", email).order("updated_at", { ascending: false }).limit(60);
  return (data ?? []).map((r) => ({ id: r.id as string, title: r.title as string, updatedAt: r.updated_at as string }));
}

export async function getConversation(id: string, email: string) {
  const { data } = await db().from("ai_conversations").select("id, title, messages, admin_email").eq("id", id).maybeSingle();
  if (!data || data.admin_email !== email) return null;
  return { id: data.id as string, title: data.title as string, messages: (data.messages ?? []) as UIMessage[] };
}

/** Starts a chat under the id the browser picked, or returns null when that id is someone else's. */
export async function openConversation(id: string, email: string, firstText: string) {
  const existing = await getConversation(id, email);
  if (existing) return existing;
  const title = firstText.replace(/\s+/g, " ").trim().slice(0, 60) || "Шинэ яриа";
  const { error } = await db().from("ai_conversations").insert({ id, admin_email: email, title });
  if (error) return null;
  return { id, title, messages: [] as UIMessage[] };
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
