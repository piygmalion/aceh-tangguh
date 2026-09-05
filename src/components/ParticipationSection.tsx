"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { BlurFade } from "@/components/ui/blur-fade";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { SITE_MEDIA } from "@/lib/media";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

export function ParticipationSection() {
  const t = useTranslations("participation");
  const steps = [
    { title: t("step1.title"), body: t("step1.body") },
    { title: t("step2.title"), body: t("step2.body") },
    { title: t("step3.title"), body: t("step3.body") },
  ];
  return (
    <section id="partisipasi" className="reveal relative scroll-mt-28 overflow-hidden border-y border-[var(--glass-border)] px-4 py-20 md:py-28">
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
            <p className="type-kicker mb-2 text-[var(--accent-soft)]">{t("kicker")}</p>
            <h2 className="section-h2">
              {t("heading")}
            </h2>
          </div>
        </BlurFade>
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <BlurFade key={s.title} delay={0.08 * (i + 1)} inView>
              <li>
                <GlassPanel className="h-full p-0 hover:border-primary/40">
                  <Card className="h-full border-0 bg-transparent shadow-none">
                    <CardHeader className="flex flex-col gap-3 space-y-0 p-5">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "h-8 w-8 justify-center rounded-full",
                          TYPE_FLOOR_CLASS
                        )}
                      >
                        {i + 1}
                      </Badge>
                      <CardTitle>{s.title}</CardTitle>
                      <CardDescription>{s.body}</CardDescription>
                    </CardHeader>
                  </Card>
                </GlassPanel>
              </li>
            </BlurFade>
          ))}
        </ol>
        <p className="relative mt-7 max-w-2xl text-sm text-[var(--text-dim)]">{t("sla")}</p>
        <div className="relative mt-6 flex flex-wrap gap-3">
          <Link
            href="/lapor/kejadian"
            className="inline-flex h-11 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-foreground transition hover:bg-[var(--accent-hover)]"
          >
            {t("ctaKejadian")}
          </Link>
          <Link
            href="/lapor/penanganan"
            className="inline-flex h-11 items-center rounded-full border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white backdrop-blur-md transition hover:border-white/50 hover:bg-white/15"
          >
            {t("ctaPenanganan")}
          </Link>
        </div>
      </div>
    </section>
  );
}
