import { accountBookings, getProfile } from "@/lib/server/account";
import { adminRole } from "@/lib/server/auth";
import { clientIp, rateLimit } from "@/lib/server/chat-security";
import { redeemDevice, signInAs } from "@/lib/server/devices";

export const runtime = "nodejs";

function fail(status: number, error: string) {
  return Response.json({ error }, { status });
}

/**
 * Face ID sign-in ({ id, secret, purpose }): the app read the key from the Keychain after
 * Face ID succeeded. Returns the replacement key, which the app stores in place of the old one.
 */
export async function POST(request: Request) {
  if (!rateLimit(`device-login:${clientIp(request)}`, 10)) return fail(429, "Түр хүлээгээд дахин оролдоно уу.");
  let body: { id?: unknown; secret?: unknown; purpose?: unknown };
  try {
    body = await request.json();
  } catch {
    return fail(400, "Хүсэлт буруу байна.");
  }
  const purpose = body.purpose === "staff" ? "staff" : "traveller";
  const device = await redeemDevice(String(body.id ?? ""), String(body.secret ?? ""), purpose);
  if (!device) return fail(401, "Face ID-аар нэвтрэх хугацаа дууссан байна. Имэйлээр нэвтрээд дахин асаана уу.");
  if (purpose === "staff" && !(await adminRole(device.email))) return fail(403, "Энэ бүртгэлд admin эрх олгогдоогүй байна.");
  if (!(await signInAs(device.email))) return fail(502, "Нэвтэрч чадсангүй. Дахин оролдоно уу.");

  if (purpose === "staff") return Response.json({ secret: device.secret });
  const user = { id: device.userId, email: device.email };
  return Response.json({ secret: device.secret, user: await getProfile(user), bookings: await accountBookings(user) });
}
