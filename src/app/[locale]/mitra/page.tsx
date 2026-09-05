import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { MitraPublic } from "@/components/sik/MitraPublic";
import { Link } from "@/i18n/routing";

export default async function MitraPage({ params }: { params: { locale: string } }) {
  setRequestLocale(params.locale);
  const t = await getTranslations("mitraPublic");
  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-28">
        <p className="text-sm text-[var(--text-dim)]">
          <Link href="/" className="hover:text-[var(--primary)]">
            {t("backHome")}
          </Link>
        </p>
        <h1 className="mt-4 text-3xl font-semibold">{t("title")}</h1>
        <p className="mt-3 max-w-3xl text-[var(--text-dim)]">{t("lead")}</p>
        <div className="mt-8">
          <MitraPublic />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
