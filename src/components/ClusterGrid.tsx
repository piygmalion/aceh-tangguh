"use client";

import { useTranslations } from "next-intl";
import { BlurFade } from "@/components/ui/blur-fade";
import { DibiDashboard } from "@/components/dibi/DibiDashboard";

export function ClusterGrid() {
  const t = useTranslations("clusters");
  return (
    <section className="section-shell reveal mt-16 md:mt-24" id="dibi">
      <BlurFade inView>
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
            {t("heading")}
          </h2>
          <p className="mt-3 text-[var(--text-dim)]">{t("lead")}</p>
        </div>
      </BlurFade>

      <DibiDashboard />
    </section>
  );
}
