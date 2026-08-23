import { setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ReportPenangananForm } from "@/components/laporan/ReportPenangananForm";
import { StaticPreviewCallout } from "@/components/preview/StaticPreviewCallout";

export default async function LaporPenangananPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-28">
        <StaticPreviewCallout />
        <ReportPenangananForm />
      </main>
      <SiteFooter />
    </>
  );
}
