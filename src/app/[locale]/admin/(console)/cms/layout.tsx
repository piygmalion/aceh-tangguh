import type { ReactNode } from "react";
import { requireSuperAdminPage } from "@/lib/auth/admin";

export default async function AdminCmsLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireSuperAdminPage();
  return children;
}
