import type { SupabaseClient } from "@supabase/supabase-js";
import type { AdminRole, Database } from "@/lib/supabase/types";
import { findKabupaten } from "@/lib/sik/juklak";
import { parseKodeDesaAceh } from "@/lib/sik/destana-program";
import {
  SIK_MODULES,
  SIK_ROLES,
  normalizedRole,
  overlayFromRows,
  type RoleModuleOverlay,
  type SikModule,
} from "@/lib/sik/roles";
import { authorizeStaffInvite } from "@/lib/sik/staff-invite";

export type StaffCatalogInviteInput = {
  email?: string | null;
  displayName?: string | null;
  role?: string | null;
  kodeKabupaten?: string | null;
  kodeDesaKelurahan?: string | null;
  desaLookup?: { nama: string; kabupaten?: string | null; kecamatan?: string | null } | null;
};

export type StaffCatalogInviteReady = {
  email: string;
  displayName: string | null;
  role: AdminRole;
  kodeKabupaten: string | null;
  kabupaten: string | null;
  kodeDesaKelurahan: string | null;
  desa: string | null;
  kecamatan: string | null;
};

export type StaffCatalogInviteDecision =
  | { ok: true; invite: StaffCatalogInviteReady }
  | { ok: false; status: 400; error: string };

const CATALOG_ROLES = new Set<string>(SIK_ROLES);

function normalizeEmail(value: string | null | undefined): string | null {
  const email = value?.trim().toLowerCase() ?? "";
  if (!email || !email.includes("@") || email.includes(" ")) return null;
  return email;
}

export function authorizeStaffCatalogInvite(input: StaffCatalogInviteInput): StaffCatalogInviteDecision {
  const email = normalizeEmail(input.email);
  if (!email) return { ok: false, status: 400, error: "email_required" };
  if (!input.role || !CATALOG_ROLES.has(input.role)) {
    return { ok: false, status: 400, error: "role_required" };
  }
  const role = normalizedRole(input.role as AdminRole);
  if (!role) return { ok: false, status: 400, error: "role_required" };
  const displayName = input.displayName?.trim() || null;

  if (role === "admin_kabkota") {
    const kab = authorizeStaffInvite({
      email,
      displayName,
      kodeKabupaten: input.kodeKabupaten,
    });
    if (!kab.ok) return kab;
    return {
      ok: true,
      invite: {
        email: kab.invite.email,
        displayName: kab.invite.displayName,
        role: "admin_kabkota",
        kodeKabupaten: kab.invite.kodeKabupaten,
        kabupaten: kab.invite.kabupaten,
        kodeDesaKelurahan: null,
        desa: null,
        kecamatan: null,
      },
    };
  }

  if (role === "admin_desa") {
    const kode = parseKodeDesaAceh(input.kodeDesaKelurahan);
    if (!kode) return { ok: false, status: 400, error: "desa_required" };
    if (!input.desaLookup) return { ok: false, status: 400, error: "desa_not_found" };
    const kab = findKabupaten(kode.slice(0, 4));
    return {
      ok: true,
      invite: {
        email,
        displayName,
        role: "admin_desa",
        kodeKabupaten: kab?.kode ?? kode.slice(0, 4),
        kabupaten: input.desaLookup.kabupaten ?? kab?.nama ?? null,
        kodeDesaKelurahan: kode,
        desa: input.desaLookup.nama,
        kecamatan: input.desaLookup.kecamatan ?? null,
      },
    };
  }

  return {
    ok: true,
    invite: {
      email,
      displayName,
      role,
      kodeKabupaten: null,
      kabupaten: null,
      kodeDesaKelurahan: null,
      desa: null,
      kecamatan: null,
    },
  };
}

export function authorizeLastSuperGuard(input: {
  actorId: string;
  targetId: string;
  targetRole: AdminRole | null | undefined;
  superAdminCount: number;
  action: "delete" | "suspend" | "demote";
}): { ok: true } | { ok: false; status: 409; error: "self" | "last_super_admin" } {
  if (input.actorId === input.targetId && (input.action === "delete" || input.action === "suspend" || input.action === "demote")) {
    return { ok: false, status: 409, error: "self" };
  }
  const targetIsSuper = normalizedRole(input.targetRole) === "super_admin";
  if (targetIsSuper && input.superAdminCount <= 1 && (input.action === "delete" || input.action === "suspend" || input.action === "demote")) {
    return { ok: false, status: 409, error: "last_super_admin" };
  }
  return { ok: true };
}

export function authorizeRoleMatrixPatch(input: {
  role?: string | null;
  module?: string | null;
  allowed?: boolean | null;
}): { ok: true; role: AdminRole; module: SikModule; allowed: boolean } | { ok: false; status: 400; error: string } {
  if (!input.role || !CATALOG_ROLES.has(input.role)) {
    return { ok: false, status: 400, error: "role_required" };
  }
  const role = normalizedRole(input.role as AdminRole);
  if (!role) return { ok: false, status: 400, error: "role_required" };
  if (role === "super_admin") return { ok: false, status: 400, error: "super_locked" };
  if (!input.module || !SIK_MODULES.includes(input.module as SikModule)) {
    return { ok: false, status: 400, error: "module_required" };
  }
  if (typeof input.allowed !== "boolean") {
    return { ok: false, status: 400, error: "allowed_required" };
  }
  return { ok: true, role, module: input.module as SikModule, allowed: input.allowed };
}

export function isUserSuspended(bannedUntil: string | null | undefined): boolean {
  if (!bannedUntil) return false;
  const ts = Date.parse(bannedUntil);
  return Number.isFinite(ts) && ts > Date.now();
}

export async function loadRoleModuleOverlay(
  client: SupabaseClient<Database>,
): Promise<RoleModuleOverlay | null> {
  const { data, error } = await client
    .from("admin_role_modules")
    .select("role, module, allowed");
  if (error || !data) return null;
  return overlayFromRows(data);
}
