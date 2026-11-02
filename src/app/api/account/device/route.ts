import { currentTraveller } from "@/lib/server/account";
import { getAdmin } from "@/lib/server/auth";
import { clientIp, rateLimit } from "@/lib/server/chat-security";
import { createDevice, revokeDevice, type DevicePurpose } from "@/lib/server/devices";

export const runtime = "nodejs";

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

/** The signed-in account behind a Face ID key: staff keys need a current admin session. */
async function owner(purpose: DevicePurpose) {
  if (purpose === "staff") {
    const admin = await getAdmin();
    if (!admin) return null;
    const user = await currentTraveller();
    return user && user.email.toLowerCase() === admin.email.toLowerCase() ? user.id : null;
  }
  return (await currentTraveller())?.id ?? null;
}

/** Turns on Face ID sign-in for this phone ({ purpose, label }) → { id, secret } for the Keychain. */
export async function POST(request: Request) {
  if (!rateLimit(`device:${clientIp(request)}`, 10)) return fail(429, "Түр хүлээгээд дахин оролдоно уу.");
  let body: { purpose?: unknown; label?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "Хүсэлт буруу байна.");
  }
  const purpose = body.purpose === "staff" ? "staff" : body.purpose === "traveller" ? "traveller" : null;
  if (!purpose) return fail(400, "Хүсэлт буруу байна.");
  const userId = await owner(purpose);
  if (!userId) return fail(401, "Эхлээд нэвтэрнэ үү.");
  return Response.json(await createDevice(userId, purpose, typeof body.label === "string" ? body.label : ""));
}

/** Turns Face ID sign-in off for one phone ({ id, purpose }). */
export async function DELETE(request: Request) {
  let body: { id?: unknown; purpose?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "Хүсэлт буруу байна.");
  }
  const userId = await owner(body.purpose === "staff" ? "staff" : "traveller");
  if (userId && typeof body.id === "string") await revokeDevice(body.id, userId);
  return Response.json({ ok: true });
}
