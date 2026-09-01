"use client";

import { useTranslations } from "next-intl";
import { BlurFade } from "@/components/ui/blur-fade";
import { DibiDashboard } from "@/components/dibi/DibiDashboard";

export function ClusterGrid() {
  const t = useTranslations("clusters");
  return (
    <section className="section-shell reveal py-20 md:py-28" id="dibi">
      <BlurFade inView>
        <div className="max-w-2xl">
          <p className="type-kicker mb-2 text-[var(--accent-soft)]">{t("kicker")}</p>
          <h2 className="section-h2">
            {t("heading")}
          </h2>
          <p className="mt-3 text-[var(--text-dim)]">{t("lead")}</p>
        </div>
      </BlurFade>

      <DibiDashboard />
    </section>
  );
}
