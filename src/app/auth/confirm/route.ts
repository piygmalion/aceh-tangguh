import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import {
  inviteConfirmFailurePath,
  parseConfirmLocale,
  parseInviteOtpType,
  staffSetPasswordPath,
} from "@/lib/auth/email-invite";
import { clientIp, HOUR_MS, rateLimitAsync } from "@/lib/security/rate-limit";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/public-env";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const locale = parseConfirmLocale(request.nextUrl.searchParams.get("locale"));
  const failUrl = new URL(inviteConfirmFailurePath(locale), request.url);
  const fail = NextResponse.redirect(failUrl);

  const limited = await rateLimitAsync(`auth-confirm:${clientIp(request.headers)}`, 30, HOUR_MS);
  if (!limited.allowed) return fail;

  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = parseInviteOtpType(request.nextUrl.searchParams.get("type"));
  if (!tokenHash || !type) return fail;

  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();
  if (!url || !anonKey) return fail;

  const success = NextResponse.redirect(new URL(staffSetPasswordPath(locale), request.url));
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          success.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return fail;
  return success;
}
