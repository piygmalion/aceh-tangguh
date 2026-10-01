import { getTranslations, setRequestLocale } from "next-intl/server";
import { AnggaranDashboard } from "@/components/anggaran/AnggaranDashboard";
import { R3PChartSection } from "@/components/R3PChartSection";

export default async function AdminAnggaranPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("anggaranBencana");

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{t("title")}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--text-dim)]">{t("lead")}</p>
        <p className="mt-2 text-xs text-[var(--text-dim)]">{t("source")}</p>
      </header>
      <AnggaranDashboard />
      <R3PChartSection sectionId="renduk" />
    </div>
  );
}
