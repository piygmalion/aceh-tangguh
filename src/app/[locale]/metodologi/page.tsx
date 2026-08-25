import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Link } from "@/i18n/routing";

export default async function MetodologiPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("metodologi");

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-28">
        <p className="text-sm text-[var(--text-dim)]">
          <Link href="/" className="hover:text-[var(--accent)]">
            {t("backHome")}
          </Link>
          {" · "}
          <Link href="/sumber-data" className="hover:text-[var(--accent)]">
            {t("seeSumber")}
          </Link>
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--text-dim)]">
          {t("lead")}
        </p>

        <article className="prose-docs mt-10 space-y-8 text-[var(--text)]">
          <section>
            <h2 className="text-xl font-semibold tracking-tight">{t("s1.title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-dim)]">
              {t("s1.body")}
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold tracking-tight">{t("s2.title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-dim)]">
              {t("s2.body")}
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold tracking-tight">{t("s3.title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-dim)]">
              {t("s3.body")}
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold tracking-tight">{t("s4.title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-dim)]">
              {t("s4.body")}
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold tracking-tight">{t("s5.title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-dim)]">
              {t("s5.body")}
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold tracking-tight">{t("s6.title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-dim)]">
              {t("s6.body")}
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold tracking-tight">{t("s7.title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-dim)]">
              {t("s7.body")}
            </p>
          </section>
          <section>
            <h2 className="text-xl font-semibold tracking-tight">{t("s8.title")}</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-dim)]">
              {t("s8.body")}
            </p>
          </section>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
