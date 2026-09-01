"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Home, Map } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { IrbiHeroPanel } from "@/components/IrbiHeroPanel";
import { KrbHeroPanel } from "@/components/KrbHeroPanel";
import { BlurFade } from "@/components/ui/blur-fade";
import { MediaBackdrop } from "@/components/ui/MediaBackdrop";
import { Link } from "@/i18n/routing";
import { SITE_MEDIA } from "@/lib/media";
import type { PeringatanDiniResponse, PeringatanTone } from "@/lib/peringatan-dini-types";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import { TYPE_HERO_DISPLAY_CLASS, TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

type HeroTab = "utama" | "peta" | "irbi" | "krb";

async function fetchPeringatanDini(): Promise<PeringatanDiniResponse> {
  const res = await fetchPublicApi("/api/peringatan-dini");
  if (!res.ok) throw new Error("Failed to load peringatan dini");
  return res.json();
}

function toneChip(tone: PeringatanTone) {
  if (tone === "danger") {
    return {
      dot: "bg-[var(--awas)]",
      chip: "bg-[var(--awas)] text-white",
    };
  }
  if (tone === "warn") {
    return {
      dot: "bg-[var(--warn)]",
      chip: "bg-[var(--warn)] text-[var(--ink)]",
    };
  }
  return {
    dot: "bg-[var(--info)]",
    chip: "bg-[var(--info)] text-white",
  };
}

function HeroStatusPanel() {
  const t = useTranslations("hero");
  const tp = useTranslations("peringatanDini");
  const { data, isLoading } = useQuery({
    queryKey: qk.peringatanDini,
    queryFn: fetchPeringatanDini,
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });

  const rows = data
    ? [
        {
          key: "cuaca",
          place: data.cuaca.empty
            ? tp("cuaca.empty")
            : data.cuaca.highlights[0]?.kabupaten ?? tp("cuaca.source"),
          tone: data.cuaca.tone,
        },
        {
          key: "magma",
          place: data.magma.empty
            ? tp("magma.empty")
            : data.magma.event?.gunung_api_terdekat ??
              data.magma.event?.wilayah ??
              tp("magma.source"),
          tone: data.magma.tone,
        },
        {
          key: "sipongi",
          place: data.sipongi.empty
            ? tp("sipongi.empty")
            : data.sipongi.points[0]?.kabkota ?? tp("sipongi.source"),
          tone: data.sipongi.tone,
        },
      ]
    : [];

  return (
    <aside className="glass w-full shrink-0 rounded-2xl border border-white/10 p-5 lg:w-[320px]">
      <div className="mb-4 flex items-center justify-between">
        <p className={cn("mb-0 text-[var(--accent-soft)]", TYPE_KICKER_CLASS)}>
          {t("statusTitle")}
        </p>
        <span className="type-stamp text-[0.8125rem] text-white/40">{t("statusToday")}</span>
      </div>
      <div className="space-y-3">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className="skeleton block h-8 rounded-lg" aria-hidden />
            ))
          : rows.map((row) => {
              const chip = toneChip(row.tone);
              return (
                <div key={row.key} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={cn("h-2 w-2 shrink-0 rounded-full", chip.dot)} />
                    <span className="truncate text-sm font-medium">{row.place}</span>
                  </div>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-[0.8125rem] font-semibold uppercase",
                      chip.chip
                    )}
                  >
                    {tp(`tone.${row.tone}`)}
                  </span>
                </div>
              );
            })}
      </div>
      <a
        href="#status"
        className="mt-4 flex items-center gap-1.5 border-t border-white/10 pt-3 text-[0.8125rem] font-semibold text-[var(--accent-soft)] transition-colors hover:text-[#F7F7F4]"
      >
        {t("statusAll")}
        <span aria-hidden>→</span>
      </a>
    </aside>
  );
}

export function HeroSection() {
  const t = useTranslations("hero");
  const [tab, setTab] = useState<HeroTab>("utama");

  const tabs: { key: HeroTab; label: string }[] = [
    { key: "utama", label: t("tabs.utama") },
    { key: "peta", label: t("tabs.peta") },
    { key: "irbi", label: t("tabs.irbi") },
    { key: "krb", label: t("tabs.krb") },
  ];

  return (
    <section
      className={cn(
        "relative flex flex-col overflow-hidden bg-[var(--bg)] px-4 pt-24 text-[var(--hero-fg)] sm:pt-28",
        tab === "irbi" || tab === "krb"
          ? "min-h-[100svh] justify-start pb-16"
          : "min-h-[100svh] justify-end pb-16"
      )}
    >
      <MediaBackdrop
        imageSrc={SITE_MEDIA.heroPoster.src}
        imageAlt={SITE_MEDIA.heroPoster.alt}
        imageSrcs={SITE_MEDIA.heroSlides.map((slide) => slide.src)}
        imageAlts={SITE_MEDIA.heroSlides.map((slide) => slide.alt)}
        priority
        showDots
        overlayClassName="hero-gradient"
      />

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <div
          className="mb-6 inline-flex rounded-full border border-white/15 bg-black/30 p-1 backdrop-blur-md"
          role="tablist"
          aria-label={t("tabs.aria")}
        >
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[0.8125rem] font-semibold tracking-wide transition sm:px-4",
                tab === key
                  ? "bg-white/15 text-white shadow-sm"
                  : "text-white/55 hover:text-white/85"
              )}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "utama" && (
          <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <BlurFade delay={0.05} inView>
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <p className={cn("mb-0 text-[var(--accent-soft)]", TYPE_KICKER_CLASS)}>
                    {t("kicker")}
                  </p>
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--awas)]/40 bg-[var(--awas)]/20 px-3 py-1 text-[0.8125rem] font-semibold text-[#F7F7F4]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--awas)]" />
                    {t("liveBadge")}
                  </span>
                </div>
              </BlurFade>

              <BlurFade delay={0.12} inView>
                <h1 className={cn("mb-5 max-w-none text-left", TYPE_HERO_DISPLAY_CLASS)}>
                  {t.rich("title", {
                    brand: (chunks) => (
                      <span className="whitespace-nowrap text-[var(--orange)]">{chunks}</span>
                    ),
                    br: () => <br />,
                  })}
                </h1>
              </BlurFade>

              <BlurFade delay={0.2} inView>
                <p className="mb-8 max-w-xl text-lg leading-relaxed text-[var(--hero-muted)]">
                  {t("subtitle")}
                </p>
              </BlurFade>

              <BlurFade delay={0.28} inView>
                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    href="/peta"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    {t("ctaPeta")}
                    <Map size={18} />
                  </Link>
                  <Link
                    href="/lapor/kejadian"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
                  >
                    {t("ctaLaporKejadian")}
                    <AlertTriangle size={18} />
                  </Link>
                  <Link
                    href="/destana"
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-white/18 bg-white/[0.08] px-6 text-sm font-semibold text-[#F7F7F4] transition hover:bg-white/[0.14]"
                  >
                    {t("ctaDestana")}
                    <Home size={18} />
                  </Link>
                </div>
              </BlurFade>

              <p className="mt-6 text-[0.8125rem] text-white/50">{SITE_MEDIA.heroPoster.credit}</p>
            </div>

            <BlurFade delay={0.22} inView>
              <HeroStatusPanel />
            </BlurFade>
          </div>
        )}

        {tab === "peta" && (
          <BlurFade delay={0.05} inView>
            <div className="max-w-2xl pb-8">
              <h2 className="section-h2">{t("petaTab.heading")}</h2>
              <p className="mt-4 text-base text-[var(--hero-muted)] sm:text-lg">
                {t("petaTab.lead")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/peta"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 text-sm font-semibold text-white transition hover:opacity-90"
                >
                  {t("petaTab.cta")}
                  <Map size={18} />
                </Link>
                <Link
                  href={{
                    pathname: "/peta",
                    query: { area: "irbi2025", basemap: "positron" },
                  }}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-white/18 bg-white/[0.08] px-6 text-sm font-semibold text-white transition hover:bg-white/[0.14]"
                >
                  {t("petaTab.ctaIrbi")}
                </Link>
              </div>
            </div>
          </BlurFade>
        )}

        {tab === "irbi" && (
          <BlurFade delay={0.04} inView>
            <IrbiHeroPanel />
          </BlurFade>
        )}

        {tab === "krb" && (
          <BlurFade delay={0.04} inView>
            <KrbHeroPanel />
          </BlurFade>
        )}
      </div>
    </section>
  );
}
