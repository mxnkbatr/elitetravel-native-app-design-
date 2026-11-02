import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps the staff session fresh on /admin and sends signed-out visitors to the login page.
 * This is only a convenience: admin pages and actions check the allowlist themselves.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) response.cookies.set(name, value, options);
      },
    },
  });

  // Refreshes an expiring session and verifies the JWT locally (no Auth server round trip)
  const { data } = await supabase.auth.getClaims();
  const onLogin = request.nextUrl.pathname === "/admin/login";
  if (!data?.claims && !onLogin) return NextResponse.redirect(new URL("/admin/login", request.url));
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
