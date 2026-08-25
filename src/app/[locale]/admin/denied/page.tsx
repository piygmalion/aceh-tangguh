import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/routing";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { getAuthContext } from "@/lib/auth/admin";

export default async function AdminDeniedPage() {
  const t = await getTranslations("admin");
  const ctx = await getAuthContext();

  return (
    <main className="mx-auto flex min-h-screen max-w-lg items-center px-4 pb-16 pt-28">
      <GlassPanel className="w-full p-6 sm:p-8">
        <h1 className="text-xl font-semibold">{t("deniedTitle")}</h1>
        <p className="mt-2 text-sm text-[var(--text-dim)]">{t("deniedLead")}</p>
        {ctx.email ? (
          <p className="mt-3 font-mono text-xs text-[var(--text-dim)]">{ctx.email}</p>
        ) : null}
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-[var(--primary-dim)] px-4 py-2 text-sm font-medium text-[var(--primary)]"
        >
          {t("backHome")}
        </Link>
      </GlassPanel>
    </main>
  );
}
