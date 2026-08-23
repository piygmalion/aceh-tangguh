import { setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ReportKejadianForm } from "@/components/laporan/ReportKejadianForm";

export default async function LaporKejadianPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-2xl px-4 pb-16 pt-28">
        <ReportKejadianForm />
      </main>
      <SiteFooter />
    </>
  );
}
