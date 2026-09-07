import { NextResponse } from "next/server";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import {
  createAuthServerClient,
  type AuthSupabaseClient,
} from "@/lib/supabase/ssr";
import { createServiceClient } from "@/lib/supabase/server";
import type { AdminProfileRow } from "@/lib/supabase/types";
import { isSuperAdmin, type AdminProfile } from "@/lib/auth/types";
import { canAccessModule, type RoleModuleOverlay, type SikModule } from "@/lib/sik/roles";
import { loadRoleModuleOverlay } from "@/lib/sik/staff-manage";

export type { AdminProfile } from "@/lib/auth/types";
export { isSuperAdmin, isStaff } from "@/lib/auth/types";

export type AuthContext = {
  supabase: AuthSupabaseClient | null;
  userId: string | null;
  email: string | null;
  profile: AdminProfile | null;
  roleModules: RoleModuleOverlay | null;
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
    kodeKabupaten: row.kode_kabupaten,
    kabupaten: row.kabupaten,
    kodeKecamatan: row.kode_kecamatan,
    kecamatan: row.kecamatan,
    kodeDesaKelurahan: row.kode_desa_kelurahan,
    desa: row.desa,
  };
}

/** Strip PostgREST filter metacharacters from search boxes. */
export function sanitizeSearch(q: string): string {
  return q.replace(/[%*,.()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function getAuthContext(): Promise<AuthContext> {
  const supabase = createAuthServerClient();
  if (!supabase) {
    return { supabase: null, userId: null, email: null, profile: null, roleModules: null };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, userId: null, email: null, profile: null, roleModules: null };
  }

  const { data: row } = await supabase
    .from("admin_profiles")
    .select(
      "user_id, role, display_name, created_at, kode_kabupaten, kabupaten, kode_kecamatan, kecamatan, kode_desa_kelurahan, desa"
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const profile = row ? toProfile(row, user.email ?? null) : null;
  const overlayClient = createServiceClient() ?? supabase;
  const roleModules = profile ? await loadRoleModuleOverlay(overlayClient) : null;

  return {
    supabase,
    userId: user.id,
    email: user.email ?? null,
    profile,
    roleModules,
  };
}

export async function requireStaffPage(): Promise<{
  supabase: AuthSupabaseClient;
  profile: AdminProfile;
  roleModules: RoleModuleOverlay | null;
}> {
  const locale = await getLocale();
  const ctx = await getAuthContext();

  if (!ctx.supabase || !ctx.userId) {
    redirect({ href: "/admin/login", locale });
    throw new Error("redirect");
  }

  if (!ctx.profile) {
    redirect({ href: "/admin/denied", locale });
    throw new Error("redirect");
  }

  return { supabase: ctx.supabase, profile: ctx.profile, roleModules: ctx.roleModules };
}

export async function requireSuperAdminPage(): Promise<{
  supabase: AuthSupabaseClient;
  profile: AdminProfile;
  roleModules: RoleModuleOverlay | null;
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
  roleModules: RoleModuleOverlay | null;
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
  return { ok: true, supabase: ctx.supabase, profile: ctx.profile, roleModules: ctx.roleModules };
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

export function authorizeStaffModule(
  profile: AdminProfile | null,
  module: SikModule,
  overlay?: RoleModuleOverlay | null,
): { ok: true } | { ok: false; status: 403; error: "forbidden" } {
  if (!canAccessModule(profile, module, overlay)) {
    return { ok: false, status: 403, error: "forbidden" };
  }
  return { ok: true };
}

export async function requireModuleApi(module: SikModule): Promise<ApiOk | ApiErr> {
  const staff = await requireStaffApi();
  if (!staff.ok) return staff;
  const gate = authorizeStaffModule(staff.profile, module, staff.roleModules);
  if (!gate.ok) {
    return {
      ok: false,
      response: NextResponse.json({ error: gate.error }, { status: gate.status }),
    };
  }
  return staff;
}

export async function requireOpsApi(): Promise<ApiOk | ApiErr> {
  return requireModuleApi("kejadian");
}
