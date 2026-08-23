"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Map, Megaphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { BlurFade } from "@/components/ui/blur-fade";
import { Chip } from "@/components/ui/Chip";
import { MediaBackdrop } from "@/components/ui/MediaBackdrop";
import { NumberTicker } from "@/components/ui/number-ticker";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { IrbiHeroPanel } from "@/components/IrbiHeroPanel";
import { SITE_MEDIA } from "@/lib/media";
import { qk } from "@/lib/qk";
import type { LiveStats } from "@/lib/types";
import { cn } from "@/lib/utils";

type HeroTab = "utama" | "peta" | "irbi";

async function fetchLiveStats(): Promise<LiveStats> {
  const res = await fetch("/api/stats/live");
  if (!res.ok) throw new Error("Failed to load stats");
  return res.json();
}

function StatSkeleton() {
  return <span className="skeleton inline-block h-3.5 w-8" aria-hidden />;
}

export function HeroSection() {
  const t = useTranslations("hero");
  const [tab, setTab] = useState<HeroTab>("utama");
  const [hovering, setHovering] = useState(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.liveStats,
    queryFn: fetchLiveStats,
    staleTime: 30_000,
    enabled: tab === "utama",
  });

  const incidents = isError ? null : data?.activeIncidents;
  const posko = isError ? null : data?.poskoCount;
  const reports = isError ? null : data?.reportsLast24h;

  const tabs: { key: HeroTab; label: string }[] = [
    { key: "utama", label: t("tabs.utama") },
    { key: "peta", label: t("tabs.peta") },
    { key: "irbi", label: t("tabs.irbi") },
  ];

  return (
    <section
      className={cn(
        "relative flex flex-col overflow-hidden bg-[#03060c] px-4 pt-24 text-[var(--hero-fg)] sm:pt-28",
        tab === "irbi"
          ? "min-h-[100svh] justify-start pb-16"
          : "min-h-[100svh] justify-end pb-20 sm:pb-24"
      )}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <MediaBackdrop
        imageSrc={SITE_MEDIA.heroPoster.src}
        imageAlt={SITE_MEDIA.heroPoster.alt}
        imageSrcs={SITE_MEDIA.heroSlides.map((slide) => slide.src)}
        imageAlts={SITE_MEDIA.heroSlides.map((slide) => slide.alt)}
        priority
        paused={hovering}
        showDots
        overlayClassName={
          tab === "irbi"
            ? "from-black/85 via-black/75 to-[var(--bg)]"
            : "from-black/78 via-black/62 to-[var(--bg)]"
        }
      />

      <div className="relative z-10 mx-auto w-full max-w-5xl">
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
                "rounded-full px-3.5 py-1.5 text-xs font-semibold tracking-wide transition sm:px-4 sm:text-sm",
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
          <div>
            <BlurFade delay={0.05} inView>
              <div className="mb-5 inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 backdrop-blur-md">
                <AnimatedShinyText className="mx-0 max-w-none text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[var(--accent-soft)] dark:text-[var(--accent-soft)]">
                  Aceh Tangguh · Observatorium
                </AnimatedShinyText>
              </div>
            </BlurFade>

            <BlurFade delay={0.12} inView>
              <h1 className="max-w-[46rem] text-[2.35rem] font-semibold leading-[1.12] tracking-tight sm:text-[3.4rem] lg:text-[4.4rem]">
                {t("title")}
              </h1>
            </BlurFade>

            <BlurFade delay={0.2} inView>
              <p className="mt-5 max-w-2xl text-base text-[var(--hero-muted)] sm:text-lg">
                {t("subtitle")}
              </p>
            </BlurFade>

            <BlurFade delay={0.28} inView>
              <div className="mt-9 flex flex-wrap gap-3">
                <Link href="/peta">
                  <ShimmerButton
                    className="shadow-2xl"
                    background="rgba(46, 158, 78, 1)"
                    shimmerColor="#e8ffe8"
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-semibold">
                      <Map size={18} />
                      {t("ctaPeta")}
                    </span>
                  </ShimmerButton>
                </Link>
                <Link href="/lapor">
                  <button
                    type="button"
                    className={cn(
                      "inline-flex h-12 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-md transition hover:border-white/40 hover:bg-white/15"
                    )}
                  >
                    <Megaphone size={18} />
                    {t("ctaLapor")}
                  </button>
                </Link>
              </div>
            </BlurFade>

            <BlurFade delay={0.36} inView>
              <div className="mt-10 flex flex-wrap gap-2.5" aria-live="polite">
                <Chip tone="glass" className="text-[0.9rem]">
                  <span className="inline-block h-2 w-2 rounded-full bg-[var(--accent-soft)] shadow-[0_0_8px_var(--accent)]" />
                  {isLoading || incidents == null ? (
                    <StatSkeleton />
                  ) : (
                    <NumberTicker
                      value={incidents}
                      className="font-semibold tabular-nums text-white"
                    />
                  )}{" "}
                  {t("chipIncidents")}
                </Chip>
                <Chip tone="glass" className="text-[0.9rem]">
                  {isLoading || posko == null ? (
                    <StatSkeleton />
                  ) : (
                    <NumberTicker
                      value={posko}
                      className="font-semibold tabular-nums text-white"
                    />
                  )}{" "}
                  {t("chipPosko")}
                </Chip>
                <Chip tone="glass" className="text-[0.9rem]">
                  {isLoading || reports == null ? (
                    <StatSkeleton />
                  ) : (
                    <NumberTicker
                      value={reports}
                      className="font-semibold tabular-nums text-white"
                    />
                  )}{" "}
                  {t("chipReports")}
                </Chip>
              </div>
            </BlurFade>

            <p className="mt-6 text-[10px] text-white/40">
              {SITE_MEDIA.heroPoster.credit}
            </p>
          </div>
        )}

        {tab === "peta" && (
          <BlurFade delay={0.05} inView>
            <div className="max-w-2xl pb-8">
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {t("petaTab.heading")}
              </h2>
              <p className="mt-4 text-base text-[var(--hero-muted)] sm:text-lg">
                {t("petaTab.lead")}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/peta">
                  <ShimmerButton
                    className="shadow-2xl"
                    background="rgba(46, 158, 78, 1)"
                    shimmerColor="#e8ffe8"
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-semibold">
                      <Map size={18} />
                      {t("petaTab.cta")}
                    </span>
                  </ShimmerButton>
                </Link>
                <Link
                  href={{
                    pathname: "/peta",
                    query: { area: "irbi2025", basemap: "positron" },
                  }}
                >
                  <button
                    type="button"
                    className="inline-flex h-12 items-center gap-2 rounded-full border border-white/25 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-md transition hover:border-white/40 hover:bg-white/15"
                  >
                    {t("petaTab.ctaIrbi")}
                  </button>
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
      </div>

      {tab === "utama" && (
        <a
          href="#status"
          className="scroll-cue absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-1 text-white/50 transition hover:text-white/80"
          aria-label="Scroll"
        >
          <ChevronDown size={22} />
        </a>
      )}
    </section>
  );
}
