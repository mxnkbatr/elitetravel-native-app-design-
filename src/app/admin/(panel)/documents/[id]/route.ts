import { requireAdmin } from "@/lib/server/auth";
import { readDocument } from "@/lib/server/documents";
import { logPassportAccess } from "@/lib/server/passports";

export const runtime = "nodejs";

/** Decrypts one uploaded document for staff to view in the browser. Every opening is logged. */
export async function GET(_request: Request, ctx: RouteContext<"/admin/documents/[id]">) {
  const admin = await requireAdmin("passports.view");
  const { id } = await ctx.params;
  const doc = await readDocument(Number(id)).catch(() => null);
  if (!doc) return new Response("Not found", { status: 404 });
  await logPassportAccess(admin.email, doc.row.booking_id, "document");
  return new Response(new Uint8Array(doc.bytes), {
    headers: {
      "Content-Type": doc.row.mime,
      "Content-Disposition": `inline; filename="${doc.row.booking_id}-${doc.row.doc_type}-${doc.row.slot + 1}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
