import type { AdminRole } from "@/lib/supabase/types";

export type AdminProfile = {
  userId: string;
  email: string | null;
  role: AdminRole;
  displayName: string | null;
  createdAt: string;
  kodeKabupaten: string | null;
  kabupaten: string | null;
  kodeKecamatan: string | null;
  kecamatan: string | null;
  kodeDesaKelurahan: string | null;
  desa: string | null;
};

export function isSuperAdmin(profile: AdminProfile | null): boolean {
  return profile?.role === "super_admin";
}

export function isStaff(profile: AdminProfile | null): boolean {
  if (!profile) return false;
  return (
    profile.role === "admin" ||
    profile.role === "super_admin" ||
    profile.role === "admin_provinsi" ||
    profile.role === "admin_kabkota" ||
    profile.role === "admin_desa" ||
    profile.role === "penilai_pkd" ||
    profile.role === "admin_rr"
  );
}
