import { getAdmin } from "@/lib/server/auth";
import { pulseFor } from "@/lib/server/pulse";

export const runtime = "nodejs";

/**
 * Polled by the admin panel. A plain GET on purpose: Server Actions run one at a time per
 * tab, so polling through one made every Save wait behind it.
 */
export async function GET() {
  const admin = await getAdmin();
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json(await pulseFor(admin), { headers: { "Cache-Control": "no-store" } });
}
