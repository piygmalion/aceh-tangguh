import createIntlMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { supabaseAnonKey, supabaseUrl } from "@/lib/supabase/public-env";

const intlMiddleware = createIntlMiddleware(routing);

async function refreshSession(request: NextRequest, response: NextResponse) {
  const url = supabaseUrl();
  const anonKey = supabaseAnonKey();
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/_vercel")
  ) {
    return refreshSession(request, NextResponse.next({ request }));
  }

  const response = intlMiddleware(request);
  return refreshSession(request, response);
}

export const config = {
  matcher: ["/", "/(id|en)/:path*", "/((?!_next|_vercel|.*\\..*).*)"],
};
