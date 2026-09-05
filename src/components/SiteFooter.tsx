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
    <footer className="reveal mb-6 mt-16 border-t border-[var(--glass-border)] px-4 pb-10 pt-14 md:mt-20 md:pt-16">
      <div className="mx-auto grid max-w-[1080px] gap-10 md:grid-cols-4">
        <div>
          <div className="text-base font-semibold tracking-tight">Aceh Tangguh</div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--text-dim)]">
            {t("credit")}
          </p>
        </div>
        <div>
          <div className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
            {t("jelajah")}
          </div>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-dim)]">
            <li>
              <Link className="transition hover:text-[var(--primary)]" href="/peta">
                {tn("peta")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-[var(--primary)]" href="/data-bencana">
                {tn("dataBencana")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-[var(--primary)]" href="/anggaran-bencana">
                {tn("anggaranBencana")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-[var(--primary)]" href="/publikasi">
                {tn("publikasi")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-[var(--accent)]" href="/lapor/kejadian">
                {tn("laporKejadian")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-[var(--accent)]" href="/lapor/penanganan">
                {tn("laporPenanganan")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-[var(--primary)]" href="/destana">
                {tn("destana")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-[var(--primary)]" href="/nomor-penting">
                {tn("nomorPenting")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-[var(--primary)]" href="/pelatihan">
                {tn("pelatihan")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-[var(--primary)]" href="/mitra">
                {tn("mitra")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-[var(--primary)]" href="/sumber-data">
                {tn("sumberData")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-[var(--primary)]" href="/metodologi">
                {tn("metodologi")}
              </Link>
            </li>
          </ul>
        </div>
        <div className="md:col-start-4" data-footer-sumber>
          <div className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
            {t("sumberData")}
          </div>
          <ul className={cn("mt-3 space-y-2 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {FOOTER_SUMBER.map((row) => (
              <li key={row.id}>
                <Link
                  className="transition hover:text-[var(--primary)]"
                  href={{ pathname: "/sumber-data", hash: row.hash }}
                >
                  {locale === "en" ? row.labelEn : row.labelId}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div
        className={cn(
          "mx-auto mt-10 max-w-[1080px] border-t border-[var(--glass-border)] pt-6 text-[var(--text-dim)]",
          TYPE_FLOOR_CLASS
        )}
      >
        <div>© {new Date().getFullYear()} Aceh Tangguh</div>
        <details className="mt-3">
          <summary className="cursor-pointer text-[var(--text-dim)] transition hover:text-[var(--primary)]">
            {t("kreditVisual")}
          </summary>
          <ul className="mt-2 space-y-1 leading-relaxed">
            <li>{SITE_MEDIA.heroPoster.credit}</li>
            {UI_CREDITS.map((c) => (
              <li key={c.name}>
                <a className="hover:text-[var(--primary)]" href={c.href} target="_blank" rel="noreferrer">
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
