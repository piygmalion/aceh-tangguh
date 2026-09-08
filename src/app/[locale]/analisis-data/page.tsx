import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { AnalisisWorkspace } from "@/components/analisis/AnalisisWorkspace";
import { R3PChartSection } from "@/components/R3PChartSection";
import { Link } from "@/i18n/routing";

export default async function AnalisisDataPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("analisisData");
  const tn = await getTranslations("nav");

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-28">
        <p className="text-sm text-[var(--text-dim)]">
          <Link href="/" className="hover:text-[var(--primary)]">
            {t("backHome")}
          </Link>
          {" · "}
          <Link href="/data-bencana" className="hover:text-[var(--primary)]">
            {t("seeTable")}
          </Link>
          {" · "}
          <Link href="/peta" className="hover:text-[var(--primary)]">
            {t("seeMap")}
          </Link>
          {" · "}
          <Link href="/metodologi" className="hover:text-[var(--primary)]">
            {t("seeMetode")}
          </Link>
          {" · "}
          <Link href="/sumber-data" className="hover:text-[var(--primary)]">
            {t("seeSumber")}
          </Link>
        </p>
        <p className="type-kicker mt-4 text-[var(--accent-soft)]">{t("kicker")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight md:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--text-dim)]">
          {t("lead")}
        </p>
        <p className="mt-2 text-[0.8125rem] text-[var(--text-dim)]">{t("sourceStamp")}</p>
        <div className="mt-8">
          <Suspense fallback={<p className="text-sm text-[var(--text-dim)]">{t("loading")}</p>}>
            <AnalisisWorkspace />
          </Suspense>
        </div>
        <R3PChartSection sectionId="renduk" />
        <p className="sr-only">{tn("analisisData")}</p>
      </main>
      <SiteFooter />
    </>
  );
}
