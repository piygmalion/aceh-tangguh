import type { AdminRole } from "@/lib/supabase/types";
import type { AdminProfile } from "@/lib/auth/types";

export const SIK_ROLES = [
  "super_admin",
  "admin",
  "admin_provinsi",
  "admin_kabkota",
  "admin_desa",
  "penilai_pkd",
  "admin_rr",
] as const satisfies readonly AdminRole[];

export type SikModule =
  | "overview"
  | "moderasi"
  | "kejadian"
  | "logistik"
  | "master"
  | "destana"
  | "rehab"
  | "disabilitas"
  | "publikCms"
  | "cms"
  | "database";

const ALL_STAFF = new Set<AdminRole>(SIK_ROLES);

/** Legacy `admin` is treated as provincial operator. */
export function normalizedRole(role: AdminRole | null | undefined): AdminRole | null {
  if (!role) return null;
  if (role === "admin") return "admin_provinsi";
  return role;
}

export function isSikStaff(profile: AdminProfile | null): boolean {
  return Boolean(profile && ALL_STAFF.has(profile.role));
}

export function isProvinsiOps(profile: AdminProfile | null): boolean {
  const role = normalizedRole(profile?.role);
  return role === "super_admin" || role === "admin_provinsi";
}

/** Kunci / buka data statis Juklak (walidata daerah). */
export function canLockStatis(profile: AdminProfile | null): boolean {
  return isProvinsiOps(profile);
}

export function isKabScoped(profile: AdminProfile | null): boolean {
  return normalizedRole(profile?.role) === "admin_kabkota";
}

export function isDesaRole(profile: AdminProfile | null): boolean {
  return normalizedRole(profile?.role) === "admin_desa";
}

export function isPenilaiPkd(profile: AdminProfile | null): boolean {
  const role = normalizedRole(profile?.role);
  return role === "penilai_pkd" || role === "super_admin";
}

export function canAccessModule(profile: AdminProfile | null, module: SikModule): boolean {
  if (!profile) return false;
  const role = normalizedRole(profile.role);
  if (!role) return false;
  if (role === "super_admin") return true;

  switch (module) {
    case "overview":
      return true;
    case "moderasi":
    case "kejadian":
    case "logistik":
      return role === "admin_provinsi" || role === "admin_kabkota";
    case "master":
      return role === "admin_provinsi";
    case "destana":
      return (
        role === "admin_provinsi" ||
        role === "admin_kabkota" ||
        role === "admin_desa" ||
        role === "penilai_pkd"
      );
    case "rehab":
      return role === "admin_rr" || role === "admin_provinsi" || role === "admin_kabkota";
    case "disabilitas":
      return role === "admin_provinsi" || role === "admin_kabkota";
    case "publikCms":
      return role === "admin_provinsi" || role === "admin_kabkota";
    case "cms":
    case "database":
      return false;
    default:
      return false;
  }
}

export function defaultSikHome(profile: AdminProfile): "/admin" | "/admin/sik/destana" | "/admin/sik/rehab" {
  const role = normalizedRole(profile.role);
  if (role === "admin_desa" || role === "penilai_pkd") return "/admin/sik/destana";
  if (role === "admin_rr") return "/admin/sik/rehab";
  return "/admin";
}

export function scopeKabupaten(profile: AdminProfile | null): string | null {
  if (!isKabScoped(profile)) return null;
  return profile?.kodeKabupaten?.trim() || profile?.kabupaten?.trim() || null;
}

export function scopeDesa(profile: AdminProfile | null): string | null {
  if (!isDesaRole(profile)) return null;
  return profile?.kodeDesaKelurahan?.trim() || null;
}

export function matchesKabScope(
  profile: AdminProfile | null,
  row: { kode_kabupaten?: string | null; kabupaten?: string | null }
): boolean {
  const scope = scopeKabupaten(profile);
  if (!scope) return true;
  const kode = row.kode_kabupaten?.trim();
  const nama = row.kabupaten?.trim();
  return kode === scope || nama === scope;
}
