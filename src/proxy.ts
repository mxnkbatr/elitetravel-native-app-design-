import { createServerClient } from "@supabase/ssr";
import { NextResponse, userAgent, type NextRequest } from "next/server";

/**
 * Home: phones get /phone-home (the app-style start screen alone) while the address stays "/",
 * so they never download or build the desktop landing with its video, GSAP and map code.
 * Both pages stay static and CDN-cached; "/" itself still adapts if a phone slips through.
 *
 * Admin: keeps the staff session fresh and sends signed-out visitors to the login page.
 * This is only a convenience: admin pages and actions check the allowlist themselves.
 */
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/") {
    if (userAgent(request).device.type !== "mobile") return NextResponse.next();
    return NextResponse.rewrite(new URL(`/phone-home${request.nextUrl.search}`, request.url));
  }

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
  matcher: ["/", "/admin/:path*"],
};
