"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { SITE_MEDIA, UI_CREDITS } from "@/lib/media";

export function SiteFooter() {
  const t = useTranslations("footer");
  const tn = useTranslations("nav");
  return (
    <footer className="reveal mb-6 mt-16 border-t border-[var(--glass-border)] px-4 pb-10 pt-14 md:mt-20 md:pt-16">
      <div className="mx-auto grid max-w-[1080px] gap-10 md:grid-cols-3">
        <div>
          <div className="text-base font-semibold tracking-tight">Aceh Tangguh</div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-[var(--text-dim)]">
            {t("credit")}
          </p>
        </div>
        <div>
          <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">
            {t("jelajah")}
          </div>
          <ul className="mt-3 space-y-2 text-sm text-[var(--text-dim)]">
            <li>
              <Link className="transition hover:text-[var(--accent)]" href="/peta">
                {tn("peta")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-[var(--accent)]" href="/data-bencana">
                {tn("dataBencana")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-[var(--accent)]" href="/lapor">
                {tn("lapor")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-[var(--accent)]" href="/sumber-data">
                {tn("sumberData")}
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-[var(--accent)]" href="/metodologi">
                {tn("metodologi")}
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">
            Kredit visual
          </div>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-[var(--text-dim)]">
            <li>
              <a className="hover:text-[var(--accent)]" href={SITE_MEDIA.heroPoster.href} target="_blank" rel="noreferrer">
                {SITE_MEDIA.heroPoster.credit}
              </a>
            </li>
            <li>{SITE_MEDIA.heroVideo.credit}</li>
            {UI_CREDITS.map((c) => (
              <li key={c.name}>
                <a className="hover:text-[var(--accent)]" href={c.href} target="_blank" rel="noreferrer">
                  {c.name} — {c.source}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-10 max-w-[1080px] border-t border-[var(--glass-border)] pt-6 text-xs text-[var(--text-dim)]">
        © {new Date().getFullYear()} Aceh Tangguh
      </div>
    </footer>
  );
}
