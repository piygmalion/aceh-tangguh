import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireStaffPage } from "@/lib/auth/admin";

export default async function AdminConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile } = await requireStaffPage();
  return <AdminShell profile={profile}>{children}</AdminShell>;
}
