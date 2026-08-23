import { setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ReportChoiceHub } from "@/components/laporan/ReportChoiceHub";
import { StaticPreviewCallout } from "@/components/preview/StaticPreviewCallout";

export default async function LaporPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-28">
        <StaticPreviewCallout />
        <ReportChoiceHub />
      </main>
      <SiteFooter />
    </>
  );
}
