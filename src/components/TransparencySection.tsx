"use client";

import Image from "next/image";
import { Database, Link2, Scale } from "lucide-react";
import { useTranslations } from "next-intl";
import { BlurFade } from "@/components/ui/blur-fade";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { SITE_MEDIA } from "@/lib/media";
import { Link } from "@/i18n/routing";

export function TransparencySection() {
  const t = useTranslations("transparency");
  const cards = [
    {
      title: t("c1.title"),
      body: t("c1.body"),
      cta: t("c1.cta"),
      href: "/sumber-data" as const,
      Icon: Database,
    },
    {
      title: t("c2.title"),
      body: t("c2.body"),
      cta: t("c2.cta"),
      href: "/peta" as const,
      Icon: Link2,
    },
    {
      title: t("c3.title"),
      body: t("c3.body"),
      cta: t("c3.cta"),
      href: "/metodologi" as const,
      Icon: Scale,
    },
  ];
  return (
    <section className="section-shell reveal relative mt-16 overflow-hidden md:mt-24" id="publikasi">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-full max-w-xl opacity-25 md:opacity-40" aria-hidden>
        <Image
          src={SITE_MEDIA.forest.src}
          alt=""
          fill
          sizes="40vw"
          className="object-cover object-left"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg)] via-[var(--bg)]/80 to-transparent" />
      </div>

      <BlurFade inView>
        <div className="relative max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {t("heading")}
          </h2>
        </div>
      </BlurFade>
      <div className="relative mt-10 grid gap-4 md:grid-cols-3">
        {cards.map((c, i) => (
          <BlurFade key={c.title} delay={0.08 * (i + 1)} inView>
            <GlassPanel className="h-full p-5 hover:border-[var(--accent)]/40 hover:shadow-[var(--shadow-elevated)]">
              <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-dim)] text-[var(--accent)]">
                <c.Icon size={18} strokeWidth={2.1} />
              </div>
              <h3 className="font-semibold tracking-tight">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--text-dim)]">
                {c.body}
              </p>
              <Link
                href={c.href}
                className="mt-4 inline-flex text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
              >
                {c.cta}
              </Link>
            </GlassPanel>
          </BlurFade>
        ))}
      </div>
    </section>
  );
}
