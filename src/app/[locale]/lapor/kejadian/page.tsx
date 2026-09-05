import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ReportKejadianForm } from "@/components/laporan/ReportKejadianForm";
import { StaticPreviewCallout } from "@/components/preview/StaticPreviewCallout";
import { Link } from "@/i18n/routing";

export default async function LaporKejadianPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("laporKejadian");
  const th = await getTranslations("laporHub");
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-28">
        <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-2 text-[0.8125rem] text-[var(--text-dim)]">
          <Link href="/" className="transition-colors hover:text-[var(--accent-soft)]">
            {th("home")}
          </Link>
          <span aria-hidden className="opacity-50">
            /
          </span>
          <Link href="/lapor" className="transition-colors hover:text-[var(--accent-soft)]">
            {th("crumb")}
          </Link>
          <span aria-hidden className="opacity-50">
            /
          </span>
          <span className="font-medium text-[var(--text)]">{t("crumb")}</span>
        </nav>
        <header className="mb-8">
          <p className="type-kicker mb-2 text-[var(--accent-soft)]">{t("kicker")}</p>
          <h1 className="page-h1 mb-3">{t("title")}</h1>
          <p className="max-w-xl text-base leading-relaxed text-[var(--text-dim)]">{t("subtitle")}</p>
        </header>
        <StaticPreviewCallout />
        <ReportKejadianForm />
      </main>
      <SiteFooter />
    </>
  );
}
