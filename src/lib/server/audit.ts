import "server-only";

import { supabaseAdmin } from "@/lib/server/supabase-admin";

/** Appends one entry to the admin audit trail. Never throws: a failed log must not undo the action. */
export async function audit(actor: string, action: string, target?: { type: string; id: string }, details?: Record<string, unknown>) {
  const db = supabaseAdmin();
  if (!db) return;
  const { error } = await db.from("admin_audit").insert({ actor, action, target_type: target?.type ?? null, target_id: target?.id ?? null, details: details ?? null });
  if (error) console.error("audit insert failed", error.code, error.message);
}
