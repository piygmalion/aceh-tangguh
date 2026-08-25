import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { KegiatanSlideshow } from "@/components/publikasi/KegiatanSlideshow";
import { PublikasiCatalog } from "@/components/publikasi/PublikasiCatalog";
import { Link } from "@/i18n/routing";

export default async function PublikasiPage({
  params,
}: {
  params: { locale: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("publikasi");

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-6xl px-4 pb-16 pt-28">
        <p className="text-sm text-[var(--text-dim)]">
          <Link href="/" className="hover:text-[var(--primary)]">
            {t("backHome")}
          </Link>
          {" · "}
          <Link href="/anggaran-bencana" className="hover:text-[var(--primary)]">
            {t("seeAnggaran")}
          </Link>
          {" · "}
          <Link href="/sumber-data" className="hover:text-[var(--primary)]">
            {t("seeSumber")}
          </Link>
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--text-dim)]">
          {t("lead")}
        </p>

        <section id="publikasi-kegiatan" className="mt-10 space-y-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("kegiatanTitle")}
            </h2>
            <p className="mt-2 text-sm text-[var(--text-dim)]">
              {t("kegiatanLatest")}
            </p>
            <p className="mt-2 text-xs text-[var(--text-dim)]">
              {t("kegiatanSource")}{" "}
              <a
                href="https://bpba.acehprov.go.id"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--primary)] hover:underline"
              >
                bpba.acehprov.go.id
              </a>
            </p>
          </div>
          <KegiatanSlideshow />
        </section>

        <section id="publikasi-analisis" className="mt-14 space-y-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("analisisTitle")}
            </h2>
            <p className="mt-2 text-xs text-[var(--text-dim)]">
              {t("analisisSource")}{" "}
              <a
                href="https://tanggapi.acehprov.go.id"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--primary)] hover:underline"
              >
                tanggapi.acehprov.go.id
              </a>
            </p>
          </div>
          <PublikasiCatalog />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
