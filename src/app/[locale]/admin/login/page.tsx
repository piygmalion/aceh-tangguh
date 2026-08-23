import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { LoginForm } from "@/components/admin/LoginForm";
import { getAuthContext } from "@/lib/auth/admin";

export default async function AdminLoginPage() {
  const locale = await getLocale();
  const ctx = await getAuthContext();
  if (ctx.profile) {
    redirect({ href: "/admin", locale });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-4 pb-16 pt-28">
      <LoginForm />
    </main>
  );
}
