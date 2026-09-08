import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { SetPasswordForm } from "@/components/admin/SetPasswordForm";
import { getAuthContext } from "@/lib/auth/admin";

export default async function AdminSetPasswordPage() {
  const locale = await getLocale();
  const ctx = await getAuthContext();
  if (!ctx.userId) {
    redirect({ href: "/admin/login", locale });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-4 pb-16 pt-28">
      <SetPasswordForm />
    </main>
  );
}
