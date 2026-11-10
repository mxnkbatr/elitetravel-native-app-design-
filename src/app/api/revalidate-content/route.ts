import { CONTENT_TAG } from "@/lib/server/content";
import { revalidatePath, revalidateTag } from "next/cache";

export const runtime = "nodejs";

/**
 * Bust the tours/news cache after a DB script upsert (admin saves already call this).
 * Auth: Authorization: Bearer $CRON_SECRET
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("unauthorized", { status: 401 });
  }
  revalidateTag(CONTENT_TAG, { expire: 0 });
  revalidatePath("/", "layout");
  revalidatePath("/tours");
  return Response.json({ ok: true, tag: CONTENT_TAG });
}
