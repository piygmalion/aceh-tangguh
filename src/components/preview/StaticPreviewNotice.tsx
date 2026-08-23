import { getTranslations } from "next-intl/server";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Link } from "@/i18n/routing";

export async function StaticPreviewNotice({
  kind = "generic",
  withChrome = true,
}: {
  kind?: "admin" | "generic";
  withChrome?: boolean;
}) {
  const t = await getTranslations("staticPreview");
  const body = (
    <main className="mx-auto flex min-h-[70vh] max-w-lg items-center px-4 pb-16 pt-28">
      <GlassPanel className="w-full p-6 sm:p-8">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">
          {t("kicker")}
        </p>
        <h1 className="mt-2 text-xl font-semibold">
          {kind === "admin" ? t("adminTitle") : t("title")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-dim)]">
          {kind === "admin" ? t("adminLead") : t("lead")}
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-[var(--accent-dim)] px-4 py-2 text-sm font-medium text-[var(--accent)]"
        >
          {t("backHome")}
        </Link>
      </GlassPanel>
    </main>
  );

  if (!withChrome) return body;

  return (
    <>
      <SiteNav />
      {body}
      <SiteFooter />
    </>
  );
}
