"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { badgeVariants } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Separator } from "@/components/ui/separator";
import { SITE_MEDIA } from "@/lib/media";
import { DEFAULT_LAYERS } from "@/lib/map-url-aliases";
import { TYPE_FLOOR_CLASS, TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

const TEASER_CHIP_CLASS: Record<(typeof DEFAULT_LAYERS)[number], string> = {
  disasterEvents: "border-transparent bg-warn/25 text-[var(--hero-fg)]",
  facHealth: "border-transparent bg-danger/25 text-[var(--hero-fg)]",
  laporanKejadian: "border-transparent bg-primary/25 text-[var(--hero-fg)]",
};

const TEASER_CHIP_LABEL: Record<
  (typeof DEFAULT_LAYERS)[number],
  "chipKejadian" | "chipFaskes" | "chipLaporan"
> = {
  disasterEvents: "chipKejadian",
  facHealth: "chipFaskes",
  laporanKejadian: "chipLaporan",
};

export function MapTeaserSection() {
  const t = useTranslations("mapTeaser");
  const tm = useTranslations("map");
  return (
    <section id="peta-teaser" className="section-shell reveal scroll-mt-28 py-20 md:py-28">
      <BlurFade inView>
        <div className="max-w-2xl">
          <p className="type-kicker mb-2 text-[var(--accent-soft)]">{t("kicker")}</p>
          <h2 className="section-h2">
            {t("heading")}
          </h2>
          <p className="mt-3 text-[var(--text-dim)]">{t("lead")}</p>
        </div>
      </BlurFade>

      <BlurFade delay={0.1} inView>
        <GlassPanel className="relative mt-10 overflow-hidden rounded-3xl border border-[var(--glass-border)] p-0 shadow-[var(--shadow-elevated)]">
          <div className="relative flex min-h-[300px] sm:min-h-[340px]">
            <Image
              src={SITE_MEDIA.teaser.src}
              alt={SITE_MEDIA.teaser.alt}
              fill
              sizes="(max-width:768px) 100vw, 1080px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/35" />

            <div className="relative z-[1] flex flex-1 flex-col justify-between p-5 text-white/90 sm:p-7">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-danger/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-warn/80" />
                  <span className="h-2.5 w-2.5 rounded-full bg-primary/80" />
                  <span className={cn("ml-3 rounded-md bg-white/10 px-2.5 py-1 tracking-wide text-white/70 backdrop-blur", TYPE_FLOOR_CLASS)}>
                    Aceh · z7
                  </span>
                </div>
                <p className="mt-8 max-w-sm text-sm leading-relaxed text-white/75">
                  {t("overlay")}
                </p>
              </div>

              <div className="relative z-[1] mt-10 inline-flex flex-wrap gap-2">
                {DEFAULT_LAYERS.map((key) => (
                  <Link
                    key={key}
                    href={{ pathname: "/peta", query: { layers: key } }}
                    className={cn(
                      badgeVariants({ variant: "outline" }),
                      "rounded-full backdrop-blur",
                      TYPE_FLOOR_CLASS,
                      TEASER_CHIP_CLASS[key]
                    )}
                  >
                    {t(TEASER_CHIP_LABEL[key])}
                  </Link>
                ))}
              </div>
            </div>

            <Separator
              orientation="vertical"
              className="relative z-[1] hidden h-auto self-stretch bg-white/10 md:block"
            />

            <div className="relative z-[1] hidden w-56 shrink-0 bg-black/35 p-4 text-[length:var(--type-floor)] text-white/70 backdrop-blur-md md:block">
              <div className={cn("mb-3 text-white/80", TYPE_KICKER_CLASS)}>
                Toolbar
              </div>
              <div className="flex flex-col gap-2">
                <div className="rounded-lg bg-white/10 px-3 py-2.5">{tm("distribusi")}</div>
                <div className="rounded-lg border border-primary/30 bg-primary/20 px-3 py-2.5 text-[var(--hero-fg)]">
                  {tm("lokasi")}
                </div>
                <div className="rounded-lg bg-white/10 px-3 py-2.5">{tm("legenda")}</div>
              </div>
            </div>
          </div>
          <BorderBeam
            size={120}
            duration={10}
            colorFrom="var(--primary)"
            colorTo="var(--accent-soft)"
            borderWidth={1.5}
          />
        </GlassPanel>
      </BlurFade>

      <div className="mt-7">
        <Link
          href="/peta"
          className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          {t("cta")}
        </Link>
      </div>
    </section>
  );
}
