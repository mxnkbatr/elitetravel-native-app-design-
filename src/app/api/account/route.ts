import type { AccountState } from "@/lib/account-types";
import { accountBookings, claimBookings, currentTraveller, getProfile, saveProfile } from "@/lib/server/account";
import { supabaseAuth } from "@/lib/server/auth";
import { supabaseAdmin } from "@/lib/server/supabase-admin";

export const runtime = "nodejs";

const PHONE = /^[0-9+ ]{8,20}$/;
const TOUR = /^[a-z0-9-]{2,60}$/;

/** The signed-in traveller's profile and bookings, or { user: null }. */
export async function GET() {
  const user = await currentTraveller();
  const state: AccountState = user ? { user: await getProfile(user), bookings: await accountBookings(user) } : { user: null, bookings: [] };
  return Response.json(state, { headers: { "Cache-Control": "no-store" } });
}

/**
 * { name?, phone?, tripTokens?, saved? }: updates the profile, attaches this device's bookings
 * and replaces the saved tours, then returns the whole account so the device can catch up.
 */
export async function PATCH(request: Request) {
  const user = await currentTraveller();
  if (!user) return Response.json({ error: "Нэвтэрнэ үү." }, { status: 401 });
  let body: { name?: unknown; phone?: unknown; tripTokens?: unknown; saved?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Хүсэлт буруу байна." }, { status: 400 });
  }
  const patch: { name?: string; phone?: string; saved?: string[] } = {};
  if (typeof body.name === "string") patch.name = body.name;
  if (typeof body.phone === "string") {
    if (body.phone.trim() && !PHONE.test(body.phone.trim())) return Response.json({ error: "Утасны дугаараа шалгана уу." }, { status: 400 });
    patch.phone = body.phone;
  }
  // The device sends its full list (already merged with the account's on sign-in)
  if (Array.isArray(body.saved)) patch.saved = body.saved.filter((s): s is string => typeof s === "string" && TOUR.test(s));
  if (Array.isArray(body.tripTokens)) await claimBookings(user, body.tripTokens.filter((t): t is string => typeof t === "string"));
  if (Object.keys(patch).length) await saveProfile(user, patch);
  const state: AccountState = { user: await getProfile(user), bookings: await accountBookings(user) };
  return Response.json(state);
}

/**
 * Deletes the account (App Store rule 5.1.1(v)): the login and profile go; bookings stay with
 * Elite Travel (they are trips and payments) but are no longer tied to the person's login.
 */
export async function DELETE() {
  const user = await currentTraveller();
  const admin = supabaseAdmin();
  if (!user || !admin) return Response.json({ error: "Нэвтэрнэ үү." }, { status: 401 });
  await admin.from("booking_requests").update({ user_id: null }).eq("user_id", user.id);
  await admin.from("traveller_profiles").delete().eq("user_id", user.id);
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    console.error("account delete failed", error.status, error.code);
    return Response.json({ error: "Бүртгэл устгаж чадсангүй. Дахин оролдоно уу." }, { status: 502 });
  }
  await (await supabaseAuth()).auth.signOut({ scope: "local" }).catch(() => {});
  return Response.json({ ok: true });
}
