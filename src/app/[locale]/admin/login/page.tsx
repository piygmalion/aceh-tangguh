import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "@/i18n/routing";
import { LoginForm } from "@/components/admin/LoginForm";
import { getAuthContext } from "@/lib/auth/admin";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const locale = await getLocale();
  const t = await getTranslations("admin");
  const ctx = await getAuthContext();
  if (ctx.profile) {
    redirect({ href: "/admin", locale });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-4 pb-16 pt-28">
      <LoginForm
        initialError={searchParams.error === "invite_invalid" ? t("inviteInvalid") : null}
      />
    </main>
  );
}
