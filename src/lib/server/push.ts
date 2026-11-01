import "server-only";

import { can, type Permission, type Role } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { after } from "next/server";
import { createSign } from "node:crypto";

/**
 * Push notifications through Firebase Cloud Messaging (HTTP v1). The service account in
 * FIREBASE_* env vars signs a short-lived OAuth token; FCM forwards to APNs, Android and web.
 * Without those env vars every send is a no-op, so local dev and tests need no Firebase.
 */

export type Push = { title: string; body: string; url: string; tag?: string };

function credentials() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const email = process.env.FIREBASE_CLIENT_EMAIL;
  const key = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  return projectId && email && key ? { projectId, email, key } : null;
}

export const pushConfigured = () => credentials() != null;

let cached: { token: string; expires: number } | null = null;

async function accessToken(c: NonNullable<ReturnType<typeof credentials>>) {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${part({ alg: "RS256", typ: "JWT" })}.${part({
    iss: c.email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(c.key, "base64url");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${signature}` }),
  });
  const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error?: string };
  if (!res.ok || !json.access_token) throw new Error(`FCM auth failed: ${res.status} ${json.error ?? ""}`);
  cached = { token: json.access_token, expires: Date.now() + (json.expires_in ?? 3600) * 1000 };
  return cached.token;
}

/** One FCM v1 message. `url` is a site path the app opens when the notification is tapped. */
export function fcmMessage(token: string, p: Push, site = process.env.SITE_URL) {
  const title = p.title.slice(0, 80);
  const body = p.body.length > 180 ? `${p.body.slice(0, 177)}…` : p.body;
  const link = site?.startsWith("https://") ? new URL(p.url, site).toString() : null;
  return {
    token,
    notification: { title, body },
    data: { url: p.url, ...(p.tag ? { tag: p.tag } : {}) },
    apns: { payload: { aps: { sound: "default", ...(p.tag ? { "thread-id": p.tag } : {}) } } },
    android: { priority: "HIGH", notification: { sound: "default", ...(p.tag ? { tag: p.tag } : {}) } },
    // FCM rejects the whole message when a web link is not https (local dev)
    ...(link ? { webpush: { fcm_options: { link } } } : {}),
  };
}

type FcmError = { error?: { status?: string; message?: string; details?: { errorCode?: string }[] } };

/** True when FCM says the token will never work again (app removed, token rotated). */
export function tokenGone(status: number, json: FcmError | null) {
  const code = json?.error?.details?.find((d) => d.errorCode)?.errorCode ?? json?.error?.status;
  return status === 404 || code === "UNREGISTERED" || (code === "INVALID_ARGUMENT" && /registration token/i.test(json?.error?.message ?? ""));
}

/** Sends to each token; dead tokens are removed. Returns how many were accepted by FCM. */
export async function sendPush(tokens: string[], p: Push) {
  const c = credentials();
  const db = supabaseAdmin();
  if (!c || !db || tokens.length === 0) return 0;
  const auth = await accessToken(c);
  const results = await Promise.all(
    [...new Set(tokens)].map(async (token) => {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${c.projectId}/messages:send`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({ message: fcmMessage(token, p) }),
      });
      if (res.ok) return { token, ok: true, gone: false };
      const json = (await res.json().catch(() => null)) as FcmError | null;
      const gone = tokenGone(res.status, json);
      if (!gone) console.error("push send failed", res.status, json?.error?.status);
      return { token, ok: false, gone };
    }),
  );
  const gone = results.filter((r) => r.gone).map((r) => r.token);
  if (gone.length) await db.from("push_devices").delete().in("token", gone);
  return results.filter((r) => r.ok).length;
}

/** Every device that follows this booking (the traveller's phones). */
export async function pushToBooking(bookingId: string, p: Push) {
  const db = supabaseAdmin();
  if (!db || !pushConfigured()) return 0;
  const { data } = await db.from("push_devices").select("token").contains("booking_ids", [bookingId]);
  return sendPush((data ?? []).map((r) => r.token as string), p);
}

/** Every staff device whose owner's role has `permission`. */
export async function pushToStaff(permission: Permission, p: Push) {
  const db = supabaseAdmin();
  if (!db || !pushConfigured()) return 0;
  const { data: staff } = await db.from("admin_users").select("email, role");
  const emails = (staff ?? []).filter((s) => can(s.role as Role, permission)).map((s) => s.email as string);
  if (emails.length === 0) return 0;
  const { data } = await db.from("push_devices").select("token").in("staff_email", emails);
  return sendPush((data ?? []).map((r) => r.token as string), p);
}

/** Runs after the response is sent so chats and payments never wait on FCM or the AI. Outside a request (scripts, tests) it runs right away. */
export function sendLater(task: () => Promise<unknown>) {
  const run = () => task().catch((e) => console.error("background task failed", e instanceof Error ? e.message : e));
  try {
    after(run);
  } catch {
    void run();
  }
}
