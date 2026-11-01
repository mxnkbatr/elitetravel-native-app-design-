import { getAdmin } from "@/lib/server/auth";
import { clientIp, rateLimit } from "@/lib/server/chat-security";
import { db } from "@/lib/server/trips";

export const runtime = "nodejs";

const FCM_TOKEN = /^[A-Za-z0-9_:-]{20,4096}$/;
const TRIP_TOKEN = /^[A-Za-z0-9_-]{20,64}$/;
const PLATFORMS = ["ios", "android", "web"] as const;

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

/**
 * Registers this device for push: { token, platform, tripTokens, staff }.
 * The device follows only bookings it holds an access token for; `staff` attaches the
 * signed-in admin (checked against the session, never trusted from the body).
 */
export async function POST(request: Request) {
  if (!rateLimit(`push:${clientIp(request)}`, 30)) return fail(429, "Түр хүлээгээд дахин оролдоно уу.");
  let body: { token?: unknown; platform?: unknown; tripTokens?: unknown; staff?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "Хүсэлт буруу байна.");
  }
  const token = typeof body.token === "string" ? body.token : "";
  const platform = PLATFORMS.find((p) => p === body.platform);
  if (!FCM_TOKEN.test(token) || !platform) return fail(400, "Хүсэлт буруу байна.");
  const tripTokens = Array.isArray(body.tripTokens) ? body.tripTokens.filter((t): t is string => typeof t === "string" && TRIP_TOKEN.test(t)).slice(0, 50) : [];

  const client = db();
  const { data: rows } = tripTokens.length ? await client.from("booking_requests").select("id").in("access_token", tripTokens) : { data: [] };
  const admin = body.staff === true ? await getAdmin() : null;

  const { error } = await client.from("push_devices").upsert(
    {
      token,
      platform,
      booking_ids: (rows ?? []).map((r) => r.id as string),
      staff_email: admin?.email.toLowerCase() ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  );
  if (error) {
    console.error("push register failed", error.code, error.message);
    return fail(502, "Бүртгэж чадсангүй.");
  }
  return Response.json({ bookings: rows?.length ?? 0, staff: admin != null });
}

/** Stops all pushes to this device: { token }. */
export async function DELETE(request: Request) {
  let token = "";
  try {
    const body = (await request.json()) as { token?: unknown };
    token = typeof body.token === "string" ? body.token : "";
  } catch {
    return fail(400, "Хүсэлт буруу байна.");
  }
  if (!FCM_TOKEN.test(token)) return fail(400, "Хүсэлт буруу байна.");
  await db().from("push_devices").delete().eq("token", token);
  return Response.json({ ok: true });
}
