import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { KejadianTable } from "@/components/kejadian/KejadianTable";
import { Link } from "@/i18n/routing";

export default async function DataBencanaPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("dataBencana");
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
          <Link href="/peta" className="hover:text-[var(--primary)]">
            {t("seeMap")}
          </Link>
          {" · "}
          <Link href="/analisis-data" className="hover:text-[var(--primary)]">
            {tn("analisisData")}
          </Link>
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--text-dim)]">
          {t("lead")}
        </p>
        <div className="mt-8">
          <KejadianTable />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
