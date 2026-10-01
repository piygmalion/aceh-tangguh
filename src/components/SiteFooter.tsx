"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { FOOTER_SUMBER } from "@/lib/data-sources";
import { SITE_MEDIA, UI_CREDITS } from "@/lib/media";
import { TYPE_FLOOR_CLASS, TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

export function SiteFooter() {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");
  const locale = useLocale();

  return (
    <footer className="reveal mt-16 bg-[var(--primary)] px-4 pb-10 pt-14 text-[var(--primary-fg)] md:pt-16">
      <div className="mx-auto grid max-w-[1080px] gap-10 md:grid-cols-3">
        <div>
          <div className="text-base font-semibold tracking-tight">Aceh Tangguh</div>
        </div>
        <nav aria-label={t("jelajah")}>
          <ul className="space-y-2 text-sm text-[var(--primary-fg)]">
            <li>
              <Link className="transition hover:underline" href="/peta">
                {tn("peta")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:underline" href="/data-bencana">
                {tn("dataBencana")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:underline" href="/analisis-data">
                {tn("analisisData")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:underline" href="/publikasi">
                {tn("publikasi")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:underline" href="/lapor/kejadian">
                {tn("laporKejadian")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:underline" href="/lapor/penanganan">
                {tn("laporPenanganan")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:underline" href="/destana">
                {tn("destana")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:underline" href="/nomor-penting">
                {tn("nomorPenting")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:underline" href="/pelatihan">
                {tn("pelatihan")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:underline" href="/mitra">
                {tn("mitra")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:underline" href="/sumber-data">
                {tn("sumberData")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:underline" href="/metodologi">
                {tn("metodologi")}
              </Link>
            </li>
          </ul>
        </nav>
        <nav aria-label={t("sumberData")} data-footer-sumber>
          <Link
            href="/sumber-data"
            className={cn(TYPE_KICKER_CLASS, "transition hover:underline")}
          >
            {t("sumberData")}
          </Link>
          <ul className={cn("mt-3 space-y-2 text-[var(--primary-fg)]", TYPE_FLOOR_CLASS)}>
            {FOOTER_SUMBER.map((row) => (
              <li key={row.id}>
                <Link
                  className="transition hover:underline"
                  href={{ pathname: "/sumber-data", hash: row.hash }}
                >
                  {locale === "en" ? row.labelEn : row.labelId}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div
        className={cn(
          "mx-auto mt-10 max-w-[1080px] border-t border-white/30 pt-6 text-[var(--primary-fg)]",
          TYPE_FLOOR_CLASS
        )}
      >
        <div>© {new Date().getFullYear()} Aceh Tangguh</div>
        <details className="mt-3">
          <summary className="cursor-pointer text-[var(--primary-fg)] transition hover:underline">
            {t("kreditVisual")}
          </summary>
          <ul className="mt-2 space-y-1 leading-relaxed">
            <li>{SITE_MEDIA.heroPoster.credit}</li>
            {UI_CREDITS.map((c) => (
              <li key={c.name}>
                <a className="hover:underline" href={c.href} target="_blank" rel="noreferrer">
                  {c.name} — {c.source}
                </a>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </footer>
  );
}
