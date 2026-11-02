import "server-only";

import { supabaseAuth } from "@/lib/server/auth";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { db } from "@/lib/server/trips";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * Face ID sign-in keys. A signed-in phone gets a random key that the app keeps in the
 * iOS Keychain behind Face ID; the server stores only its hash. Using a key replaces it,
 * so a copied key works at most once, and deleting the row revokes the phone.
 */

export type DevicePurpose = "traveller" | "staff";

const hash = (secret: string) => createHash("sha256").update(secret).digest("hex");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SECRET = /^[A-Za-z0-9_-]{40,64}$/;

export async function createDevice(userId: string, purpose: DevicePurpose, label: string) {
  const secret = randomBytes(32).toString("base64url");
  const { data, error } = await db()
    .from("auth_devices")
    .insert({ user_id: userId, purpose, secret_hash: hash(secret), label: label.slice(0, 80) || null })
    .select("id")
    .single();
  if (error || !data) throw new Error("Face ID-г идэвхжүүлж чадсангүй.");
  return { id: data.id as string, secret };
}

/** Checks a key and swaps in a new one. Returns the account's email, or null for any mismatch. */
export async function redeemDevice(id: string, secret: string, purpose: DevicePurpose) {
  if (!UUID.test(id) || !SECRET.test(secret)) return null;
  const client = db();
  const { data: row } = await client.from("auth_devices").select("id, user_id, purpose, secret_hash, expires_at").eq("id", id).maybeSingle();
  if (!row || row.purpose !== purpose || new Date(row.expires_at) < new Date()) return null;
  const given = Buffer.from(hash(secret), "hex");
  const stored = Buffer.from(row.secret_hash as string, "hex");
  if (given.length !== stored.length || !timingSafeEqual(given, stored)) return null;

  const next = randomBytes(32).toString("base64url");
  // Only the request holding the current hash wins the swap
  const { data: swapped } = await client
    .from("auth_devices")
    .update({ secret_hash: hash(next), last_used_at: new Date().toISOString() })
    .eq("id", id)
    .eq("secret_hash", row.secret_hash)
    .select("id");
  if (!swapped?.length) return null;

  const admin = supabaseAdmin();
  const { data: user } = admin ? await admin.auth.admin.getUserById(row.user_id as string) : { data: null };
  const email = user?.user?.email;
  return email ? { userId: row.user_id as string, email, secret: next } : null;
}

export async function revokeDevice(id: string, userId: string) {
  if (!UUID.test(id)) return;
  await db().from("auth_devices").delete().eq("id", id).eq("user_id", userId);
}

/**
 * Starts a Supabase session for this account without sending an email: the admin API mints
 * a one-time magic-link token and verifying it sets the usual session cookies.
 */
export async function signInAs(email: string) {
  const admin = supabaseAdmin();
  if (!admin) return false;
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = data?.properties?.hashed_token;
  if (error || !tokenHash) return false;
  const { error: verifyError } = await (await supabaseAuth()).auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
  return !verifyError;
}
