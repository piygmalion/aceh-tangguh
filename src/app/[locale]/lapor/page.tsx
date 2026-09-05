import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ReportChoiceHub } from "@/components/laporan/ReportChoiceHub";
import { StaticPreviewCallout } from "@/components/preview/StaticPreviewCallout";
import { Link } from "@/i18n/routing";

export default async function LaporPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("laporHub");
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-28">
        <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-[0.8125rem] text-[var(--text-dim)]">
          <Link href="/" className="transition-colors hover:text-[var(--accent-soft)]">
            {t("home")}
          </Link>
          <span aria-hidden className="opacity-50">
            /
          </span>
          <span className="font-medium text-[var(--text)]">{t("crumb")}</span>
        </nav>
        <StaticPreviewCallout />
        <ReportChoiceHub />
      </main>
      <SiteFooter />
    </>
  );
}
