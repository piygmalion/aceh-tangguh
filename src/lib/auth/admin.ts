import { NextResponse } from "next/server";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import {
  createAuthServerClient,
  type AuthSupabaseClient,
} from "@/lib/supabase/ssr";
import type { AdminProfileRow } from "@/lib/supabase/types";
import { isSuperAdmin, type AdminProfile } from "@/lib/auth/types";

export type { AdminProfile } from "@/lib/auth/types";
export { isSuperAdmin, isStaff } from "@/lib/auth/types";

export type AuthContext = {
  supabase: AuthSupabaseClient | null;
  userId: string | null;
  email: string | null;
  profile: AdminProfile | null;
};

function toProfile(
  row: AdminProfileRow,
  email: string | null
): AdminProfile {
  return {
    userId: row.user_id,
    email,
    role: row.role,
    displayName: row.display_name,
    createdAt: row.created_at,
  };
}

/** Strip PostgREST filter metacharacters from search boxes. */
export function sanitizeSearch(q: string): string {
  return q.replace(/[%*,.()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function getAuthContext(): Promise<AuthContext> {
  const supabase = createAuthServerClient();
  if (!supabase) {
    return { supabase: null, userId: null, email: null, profile: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, userId: null, email: null, profile: null };
  }

  const { data: row } = await supabase
    .from("admin_profiles")
    .select("user_id, role, display_name, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    supabase,
    userId: user.id,
    email: user.email ?? null,
    profile: row ? toProfile(row, user.email ?? null) : null,
  };
}

export async function requireStaffPage(): Promise<{
  supabase: AuthSupabaseClient;
  profile: AdminProfile;
}> {
  const locale = await getLocale();
  const ctx = await getAuthContext();

  if (!ctx.supabase || !ctx.userId) {
    redirect({ href: "/admin/login", locale });
  }

  if (!ctx.profile || !ctx.supabase) {
    redirect({ href: "/admin/denied", locale });
  }

  return { supabase: ctx.supabase, profile: ctx.profile };
}

export async function requireSuperAdminPage(): Promise<{
  supabase: AuthSupabaseClient;
  profile: AdminProfile;
}> {
  const locale = await getLocale();
  const result = await requireStaffPage();
  if (!isSuperAdmin(result.profile)) {
    redirect({ href: "/admin/moderasi", locale });
  }
  return result;
}

type ApiOk = {
  ok: true;
  supabase: AuthSupabaseClient;
  profile: AdminProfile;
};

type ApiErr = { ok: false; response: NextResponse };

export async function requireStaffApi(): Promise<ApiOk | ApiErr> {
  const ctx = await getAuthContext();
  if (!ctx.supabase || !ctx.userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }
  if (!ctx.profile) {
    return {
      ok: false,
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, supabase: ctx.supabase, profile: ctx.profile };
}

export async function requireSuperAdminApi(): Promise<ApiOk | ApiErr> {
  const staff = await requireStaffApi();
  if (!staff.ok) return staff;
  if (!isSuperAdmin(staff.profile)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }
  return staff;
}
