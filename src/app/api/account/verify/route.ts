import { accountBookings, getProfile, saveProfile } from "@/lib/server/account";
import { clientIp, rateLimit } from "@/lib/server/chat-security";
import { supabaseAuth } from "@/lib/server/auth";

export const runtime = "nodejs";

/** Checks the emailed code ({ email, code, name? }) and starts the session (Supabase sets the cookies). */
export async function POST(request: Request) {
  if (!rateLimit(`acc-verify:${clientIp(request)}`, 10)) return Response.json({ error: "Түр хүлээгээд дахин оролдоно уу." }, { status: 429 });
  let body: { email?: unknown; code?: unknown; name?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Хүсэлт буруу байна." }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const code = typeof body.code === "string" ? body.code.replace(/\D/g, "") : "";
  if (!email || !/^\d{6,10}$/.test(code)) return Response.json({ error: "Кодоо шалгана уу." }, { status: 400 });

  const { data, error } = await (await supabaseAuth()).auth.verifyOtp({ email, token: code, type: "email" });
  if (error || !data.user?.email) return Response.json({ error: "Код буруу эсвэл хугацаа нь дууссан байна." }, { status: 400 });

  const user = { id: data.user.id, email: data.user.email };
  const profile = await getProfile(user);
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name && !profile.name) await saveProfile(user, { name });
  else if (!profile.name && !profile.phone) await saveProfile(user, {});
  return Response.json({ user: await getProfile(user), bookings: await accountBookings(user) });
}
