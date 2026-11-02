import { supabaseAuth } from "@/lib/server/auth";
import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * The link in the sign-in email (when the email template sends a link instead of the code):
 * ?code= (PKCE, same browser) or ?token_hash=&type= (any browser). Lands on /account.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const supabase = await supabaseAuth();
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
      : { error: new Error("missing code") };
  return NextResponse.redirect(new URL(error ? "/account?link=expired" : "/account?welcome=1", url.origin));
}
