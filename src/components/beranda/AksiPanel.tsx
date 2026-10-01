"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { SITE_MEDIA } from "@/lib/media";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./primitives";

/** Numbering is used here because reporting genuinely is a three-stage sequence. */
const LANGKAH = [
  { titleKey: "aksi.step1Title", isiKey: "aksi.step1Isi" },
  { titleKey: "aksi.step2Title", isiKey: "aksi.step2Isi" },
  { titleKey: "aksi.step3Title", isiKey: "aksi.step3Isi" },
] as const;

const LAYANAN = [
  {
    href: "/nomor-penting" as const,
    namaKey: "aksi.nomorNama",
    isiKey: "aksi.nomorIsi",
  },
  {
    href: "/pelatihan" as const,
    namaKey: "aksi.pelatihanNama",
    isiKey: "aksi.pelatihanIsi",
  },
  {
    href: "/mitra" as const,
    namaKey: "aksi.mitraNama",
    isiKey: "aksi.mitraIsi",
  },
] as const;

export function AksiPanel() {
  const t = useTranslations("beranda");
  const th = useTranslations("hero");

  return (
    <section
      id="partisipasi"
      className="relative scroll-mt-24 overflow-hidden border-y border-[var(--border)] px-4 py-16 md:py-20"
    >
      <div className="absolute inset-0" aria-hidden>
        <Image
          src={SITE_MEDIA.heroSlides[0].src}
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-[var(--bg-raised)]/92" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <SectionHeading
          title={t("aksi.title")}
          lead={t("aksi.lead")}
        />

        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <ol className="grid gap-4 sm:grid-cols-3">
              {LANGKAH.map((l, i) => (
                <li
                  key={l.titleKey}
                  className="rounded-2xl border border-[var(--border)] bg-[var(--bg)] p-4"
                >
                  <span
                    className={cn(
                      "grid h-7 w-7 place-items-center rounded-full bg-[var(--primary)] font-semibold tabular-nums text-[var(--primary-fg)]",
                      TYPE_FLOOR_CLASS,
                    )}
                  >
                    {i + 1}
                  </span>
                  <p className="mt-3 text-[0.9375rem] font-semibold">{t(l.titleKey)}</p>
                  <p
                    className={cn(
                      "mt-1.5 leading-relaxed text-[var(--text-dim)]",
                      TYPE_FLOOR_CLASS,
                    )}
                  >
                    {t(l.isiKey)}
                  </p>
                </li>
              ))}
            </ol>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/lapor/kejadian"
                className="inline-flex h-11 items-center justify-center rounded-full bg-[var(--accent)] px-6 text-sm font-semibold text-[var(--accent-fg)] transition hover:bg-[var(--accent-hover)]"
              >
                {th("ctaLaporKejadian")}
              </Link>
              <Link
                href="/lapor/penanganan"
                className="inline-flex h-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg)] px-6 text-sm font-semibold transition hover:border-[var(--primary)] hover:text-[var(--primary)]"
              >
                {th("ctaLaporPenanganan")}
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5">
            <p className={cn("mb-1 font-semibold", TYPE_FLOOR_CLASS)}>
              {t("aksi.layanan")}
            </p>
            <ul className="divide-y divide-[var(--border)]">
              {LAYANAN.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="group flex items-center justify-between gap-4 py-3.5"
                  >
                    <span className="min-w-0">
                      <span className="block text-[0.9375rem] font-medium transition-colors group-hover:text-[var(--primary)]">
                        {t(l.namaKey)}
                      </span>
                      <span
                        className={cn("mt-0.5 block text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}
                      >
                        {t(l.isiKey)}
                      </span>
                    </span>
                    <ArrowRight
                      size={16}
                      aria-hidden
                      className="shrink-0 text-[var(--text-dim)] transition-colors group-hover:text-[var(--primary)]"
                    />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
