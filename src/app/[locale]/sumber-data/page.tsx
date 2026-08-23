import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { DATA_SOURCES } from "@/lib/data-sources";
import { Link } from "@/i18n/routing";

export default async function SumberDataPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("sumberData");
  const locale = params.locale;

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-28">
        <p className="text-sm text-[var(--text-dim)]">
          <Link href="/" className="hover:text-[var(--accent)]">
            {t("backHome")}
          </Link>
          {" · "}
          <Link href="/metodologi" className="hover:text-[var(--accent)]">
            {t("seeMetodologi")}
          </Link>
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-[var(--text-dim)]">
          {t("lead")}
        </p>

        <ul className="mt-10 space-y-6">
          {DATA_SOURCES.map((entry) => {
            const title = locale === "en" ? entry.titleEn : entry.titleId;
            return (
              <li
                key={entry.id}
                id={entry.id}
                className="rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-raised)]/40 p-5"
              >
                <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
                <dl className="mt-3 grid gap-2 text-sm text-[var(--text-dim)] sm:grid-cols-[8rem_1fr]">
                  <dt className="font-medium text-[var(--text)]">{t("source")}</dt>
                  <dd>{entry.source}</dd>
                  <dt className="font-medium text-[var(--text)]">{t("license")}</dt>
                  <dd>{entry.license}</dd>
                  <dt className="font-medium text-[var(--text)]">{t("date")}</dt>
                  <dd>{entry.date}</dd>
                  <dt className="font-medium text-[var(--text)]">{t("format")}</dt>
                  <dd>{entry.format}</dd>
                  <dt className="font-medium text-[var(--text)]">{t("usedFor")}</dt>
                  <dd>{entry.usedFor}</dd>
                  {entry.href ? (
                    <>
                      <dt className="font-medium text-[var(--text)]">{t("link")}</dt>
                      <dd>
                        <a
                          href={entry.href}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-[var(--accent)] underline-offset-2 hover:underline"
                        >
                          {entry.href}
                        </a>
                      </dd>
                    </>
                  ) : null}
                </dl>
              </li>
            );
          })}
        </ul>

        <p className="mt-10 text-sm leading-relaxed text-[var(--text-dim)]">
          {t("disclaimer")}
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
