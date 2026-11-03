import "server-only";

import { ASSISTANT_DEFAULTS, cleanAssistantSettings, type AssistantSettings } from "@/lib/assistant-settings";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { unstable_cache } from "next/cache";

const KEY = "assistant";
/** Revalidated when staff save the assistant in /admin/assistant. */
export const ASSISTANT_TAG = "assistant";

async function load(): Promise<AssistantSettings> {
  const db = supabaseAdmin();
  if (!db) return ASSISTANT_DEFAULTS;
  const { data, error } = await db.from("app_settings").select("value").eq("key", KEY).maybeSingle();
  // A missing row or a read error keeps the assistant working with its defaults
  if (error || !data) return ASSISTANT_DEFAULTS;
  return cleanAssistantSettings(data.value);
}

export const getAssistantSettings = unstable_cache(load, ["assistant-settings"], { tags: [ASSISTANT_TAG], revalidate: 3600 });

export async function saveAssistantSettings(settings: AssistantSettings, by: string) {
  const db = supabaseAdmin();
  if (!db) throw new Error("Supabase is not configured");
  const { error } = await db.from("app_settings").upsert({ key: KEY, value: settings, updated_at: new Date().toISOString(), updated_by: by }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}
