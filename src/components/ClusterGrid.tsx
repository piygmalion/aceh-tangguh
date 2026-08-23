"use client";

import {
  Ambulance,
  ArrowUpRight,
  GraduationCap,
  HeartPulse,
  Package,
  Shield,
  Tent,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import type { ClusterId } from "@/lib/types";
import { BlurFade } from "@/components/ui/blur-fade";
import { GlassPanel } from "@/components/ui/GlassPanel";

const ICONS: Record<ClusterId, typeof Shield> = {
  sar: Shield,
  logistik: Package,
  pengungsian: Tent,
  kesehatan: HeartPulse,
  pendidikan: GraduationCap,
  pemulihan: Ambulance,
};

const IDS: ClusterId[] = [
  "sar",
  "logistik",
  "pengungsian",
  "kesehatan",
  "pendidikan",
  "pemulihan",
];

export function ClusterGrid() {
  const t = useTranslations("clusters");
  return (
    <section className="section-shell reveal mt-16 md:mt-24" id="clusters">
      <BlurFade inView>
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {t("heading")}
          </h2>
          <p className="mt-3 text-[var(--text-dim)]">{t("lead")}</p>
        </div>
      </BlurFade>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {IDS.map((id, i) => {
          const Icon = ICONS[id];
          return (
            <BlurFade key={id} delay={0.05 * (i + 1)} inView>
              <Link href={{ pathname: "/peta", query: { cluster: id } }} className="group block">
                <GlassPanel className="relative h-full overflow-hidden p-5 transition hover:border-[var(--accent)] hover:shadow-[var(--shadow-elevated)] group-hover:-translate-y-0.5">
                  <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[var(--accent)]/10 blur-2xl transition group-hover:bg-[var(--accent)]/20" />
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-dim)] text-[var(--accent)] transition group-hover:scale-105">
                    <Icon size={20} strokeWidth={2.1} />
                  </div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold tracking-tight">
                      {t(`${id}.title`)}
                    </h3>
                    <ArrowUpRight
                      size={16}
                      className="mt-1 shrink-0 text-[var(--text-dim)] opacity-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100 group-hover:text-[var(--accent)]"
                    />
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-dim)]">
                    {t(`${id}.desc`)}
                  </p>
                </GlassPanel>
              </Link>
            </BlurFade>
          );
        })}
      </div>
    </section>
  );
}
