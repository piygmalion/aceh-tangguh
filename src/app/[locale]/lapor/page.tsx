import { setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { ReportForm } from "@/components/ReportForm";

export default async function LaporPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-28">
        <ReportForm />
      </main>
      <SiteFooter />
    </>
  );
}
