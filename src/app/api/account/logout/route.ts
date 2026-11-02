import { supabaseAuth } from "@/lib/server/auth";

export const runtime = "nodejs";

/** Ends the session on this device only. */
export async function POST() {
  await (await supabaseAuth()).auth.signOut({ scope: "local" }).catch(() => {});
  return Response.json({ ok: true });
}
