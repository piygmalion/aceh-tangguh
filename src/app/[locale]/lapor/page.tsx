import { setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ReportChoiceHub } from "@/components/laporan/ReportChoiceHub";

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
        <ReportChoiceHub />
      </main>
      <SiteFooter />
    </>
  );
}
