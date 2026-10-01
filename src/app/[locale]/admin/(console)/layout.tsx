import type { ReactNode } from "react";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireStaffPage } from "@/lib/auth/admin";

export default async function AdminConsoleLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { profile, roleModules } = await requireStaffPage();
  const messages = await getMessages();
  return (
    <NextIntlClientProvider messages={messages}>
      <AdminShell
        profile={profile}
        moduleOverlay={roleModules ? Object.fromEntries(roleModules) : null}
      >
        {children}
      </AdminShell>
    </NextIntlClientProvider>
  );
}
