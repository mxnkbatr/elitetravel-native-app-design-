import "server-only";

import { can, homeFor, type Permission, type Role } from "@/lib/permissions";
import { supabaseAdmin } from "@/lib/server/supabase-admin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

/** Supabase Auth client bound to the request's cookies (publishable key, acts as the signed-in user). */
export async function supabaseAuth() {
  // Reading cookies first marks admin routes as request-time, so builds never prerender them
  const store = await cookies();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY missing");
  return createServerClient(url, key, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // Server Components cannot write cookies; proxy.ts refreshes the session instead
        }
      },
    },
  });
}

/** The staff member's role when the email is on the admin_users allowlist, else null. */
export async function adminRole(email: string): Promise<Role | null> {
  const db = supabaseAdmin();
  if (!db) return null;
  const { data } = await db.from("admin_users").select("role").eq("email", email.toLowerCase()).maybeSingle();
  return (data?.role as Role | undefined) ?? null;
}

export async function isAdminEmail(email: string) {
  return (await adminRole(email)) != null;
}

export type Admin = { email: string; role: Role };

/** The signed-in staff member, or null. Verified against Supabase Auth on every request. */
export const getAdmin = cache(async (): Promise<Admin | null> => {
  await cookies();
  // A deployment without Supabase Auth configured has no staff: everyone lands on the login page
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_PUBLISHABLE_KEY) return null;
  const supabase = await supabaseAuth();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email;
  if (!email) return null;
  const role = await adminRole(email);
  return role ? { email, role } : null;
});

/**
 * Guards admin pages and every admin Server Action — never trust the proxy or the nav alone.
 * Staff without `permission` are sent to the first screen their role may use.
 */
export async function requireAdmin(permission?: Permission) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  if (permission && !can(admin.role, permission)) redirect(homeFor(admin.role));
  return admin;
}
