"use server";

import { cleanAssistantSettings } from "@/lib/assistant-settings";
import { ASSISTANT_TAG, saveAssistantSettings } from "@/lib/server/assistant-settings";
import { audit } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/auth";
import { revalidatePath, revalidateTag } from "next/cache";

export type AssistantSaveResult = { ok: true } | { ok: false; error: string };

/** Saves the site assistant's greeting, suggestions and team instructions; the site picks them up at once. */
export async function saveAssistant(input: unknown): Promise<AssistantSaveResult> {
  const admin = await requireAdmin("content.manage");
  const settings = cleanAssistantSettings(input);
  try {
    await saveAssistantSettings(settings, admin.email);
  } catch {
    return { ok: false, error: "Хадгалж чадсангүй. Дахин оролдоно уу." };
  }
  await audit(admin.email, "assistant.save", { type: "assistant", id: "site" }, { enabled: settings.enabled, suggestions: settings.suggestions.length });
  revalidateTag(ASSISTANT_TAG, { expire: 0 });
  // The chat button lives in the root layout, so every page needs the new greeting / on-off switch
  revalidatePath("/", "layout");
  return { ok: true };
}
