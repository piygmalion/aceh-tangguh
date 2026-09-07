import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireStaffPage } from "@/lib/auth/admin";

export default async function AdminConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile, roleModules } = await requireStaffPage();
  return (
    <AdminShell
      profile={profile}
      moduleOverlay={roleModules ? Object.fromEntries(roleModules) : null}
    >
      {children}
    </AdminShell>
  );
}
