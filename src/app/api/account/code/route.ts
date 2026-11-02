import { clientIp, rateLimit } from "@/lib/server/chat-security";
import { supabaseAuth } from "@/lib/server/auth";
import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Emails a one-time sign-in code ({ email }). Signing in and signing up are the same step. */
export async function POST(request: Request) {
  let email = "";
  try {
    const body = (await request.json()) as { email?: unknown };
    email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  } catch {
    return Response.json({ error: "Хүсэлт буруу байна." }, { status: 400 });
  }
  if (!EMAIL.test(email) || email.length > 254) return Response.json({ error: "Имэйл хаягаа шалгана уу." }, { status: 400 });
  if (!rateLimit(`acc-code:${clientIp(request)}`, 5) || !rateLimit(`acc-code:${email}`, 2)) {
    return Response.json({ error: "Түр хүлээгээд дахин оролдоно уу." }, { status: 429 });
  }

  const origin = process.env.SITE_URL ? siteUrl() : new URL(request.url).origin;
  const { error } = await (await supabaseAuth()).auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${origin}/account/callback` },
  });
  if (error) {
    console.error("account code failed", error.status, error.code);
    const limited = error.status === 429 || /rate limit/i.test(error.message);
    return Response.json(
      { error: limited ? "Хэт олон код илгээлээ. Хэдэн минут хүлээгээд дахин оролдоно уу." : "Код илгээж чадсангүй. Дахин оролдоно уу." },
      { status: limited ? 429 : 502 },
    );
  }
  return Response.json({ ok: true });
}
