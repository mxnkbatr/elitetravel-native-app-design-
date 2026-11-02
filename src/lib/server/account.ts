import "server-only";

import type { AccountBooking, AccountProfile } from "@/lib/account-types";
import { supabaseAuth } from "@/lib/server/auth";
import { db } from "@/lib/server/trips";
import { cookies } from "next/headers";
import { cache } from "react";

/**
 * Traveller accounts: passwordless email codes through Supabase Auth. The session lives in the
 * same Supabase cookies as staff logins; being signed in never grants admin rights (those come
 * only from the admin_users allowlist).
 */

export type Traveller = { id: string; email: string };

/** The signed-in traveller, verified from the session JWT, or null. */
export const currentTraveller = cache(async (): Promise<Traveller | null> => {
  await cookies();
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return null;
  const { data } = await (await supabaseAuth()).auth.getClaims();
  const id = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  const email = typeof data?.claims?.email === "string" ? data.claims.email : null;
  return id && email ? { id, email } : null;
});

export async function getProfile(user: Traveller): Promise<AccountProfile> {
  const { data } = await db().from("traveller_profiles").select("name, phone, saved").eq("user_id", user.id).maybeSingle();
  return { email: user.email, name: data?.name ?? "", phone: data?.phone ?? "", saved: (data?.saved as string[] | null) ?? [] };
}

export async function saveProfile(user: Traveller, patch: { name?: string; phone?: string; saved?: string[] }) {
  const row: Record<string, unknown> = { user_id: user.id, email: user.email, updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name.trim().slice(0, 80) || null;
  if (patch.phone !== undefined) row.phone = patch.phone.trim().slice(0, 20) || null;
  if (patch.saved !== undefined) row.saved = [...new Set(patch.saved)].slice(0, 100);
  const { error } = await db().from("traveller_profiles").upsert(row, { onConflict: "user_id" });
  if (error) throw new Error("Профайл хадгалж чадсангүй.");
}

/** Every booking on the account, with the access token the device needs to open it. */
export async function accountBookings(user: Traveller): Promise<AccountBooking[]> {
  const { data } = await db()
    .from("booking_requests")
    .select("id, created_at, tour_id, travel_date, name, phone, adults, kids_own_bed, kids_shared_bed, single_rooms, total, deposit, note, access_token")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []).map((b) => ({
    id: b.id,
    tourId: b.tour_id,
    createdAt: b.created_at,
    name: b.name,
    phone: b.phone,
    date: b.travel_date ?? undefined,
    adults: b.adults,
    kidsOwnBed: b.kids_own_bed,
    kidsSharedBed: b.kids_shared_bed,
    singleRooms: b.single_rooms,
    total: Number(b.total),
    deposit: Number(b.deposit),
    note: b.note ?? undefined,
    synced: true,
    token: b.access_token,
  }));
}

/**
 * Attaches the bookings this device holds tokens for to the account. A booking already
 * belonging to another account is left alone.
 */
export async function claimBookings(user: Traveller, tripTokens: string[]) {
  const tokens = tripTokens.filter((t) => /^[A-Za-z0-9_-]{20,64}$/.test(t)).slice(0, 50);
  if (!tokens.length) return 0;
  const { data } = await db().from("booking_requests").update({ user_id: user.id }).in("access_token", tokens).is("user_id", null).select("id");
  return data?.length ?? 0;
}
