import type { AdminRole } from "@/lib/supabase/types";

export type AdminProfile = {
  userId: string;
  email: string | null;
  role: AdminRole;
  displayName: string | null;
  createdAt: string;
};

export function isSuperAdmin(profile: AdminProfile | null): boolean {
  return profile?.role === "super_admin";
}

export function isStaff(profile: AdminProfile | null): boolean {
  return profile?.role === "admin" || profile?.role === "super_admin";
}
