"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { BlurFade } from "@/components/ui/blur-fade";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { SITE_MEDIA } from "@/lib/media";

export function ParticipationSection() {
  const t = useTranslations("participation");
  const steps = [
    { title: t("step1.title"), body: t("step1.body") },
    { title: t("step2.title"), body: t("step2.body") },
    { title: t("step3.title"), body: t("step3.body") },
  ];
  return (
    <section className="reveal relative mt-16 overflow-hidden border-y border-[var(--glass-border)] px-4 py-16 md:mt-24 md:py-20">
      <div className="absolute inset-0" aria-hidden>
        <Image
          src={SITE_MEDIA.community.src}
          alt=""
          fill
          sizes="100vw"
          className="object-cover opacity-30 dark:opacity-25"
        />
        <div className="absolute inset-0 bg-[var(--bg-raised)]/88 backdrop-blur-[2px]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <BlurFade inView>
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              {t("heading")}
            </h2>
          </div>
        </BlurFade>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <BlurFade key={s.title} delay={0.08 * (i + 1)} inView>
              <li>
                <GlassPanel className="h-full p-5 hover:border-[var(--accent)]/40">
                  <div className="mb-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent-dim)] text-sm font-semibold text-[var(--accent)]">
                    {i + 1}
                  </div>
                  <h3 className="font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-dim)]">
                    {s.body}
                  </p>
                </GlassPanel>
              </li>
            </BlurFade>
          ))}
        </ol>
        <p className="relative mt-7 max-w-2xl text-sm text-[var(--text-dim)]">{t("sla")}</p>
        <div className="relative mt-6 flex flex-wrap gap-3">
          <Link href="/lapor/kejadian">
            <ShimmerButton background="rgba(46, 158, 78, 1)" shimmerColor="#e8ffe8">
              <span className="text-sm font-semibold">{t("ctaKejadian")}</span>
            </ShimmerButton>
          </Link>
          <Link href="/lapor/penanganan">
            <span className="inline-flex h-11 items-center rounded-full border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-md transition hover:border-white/50 hover:bg-white/15">
              {t("ctaPenanganan")}
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
