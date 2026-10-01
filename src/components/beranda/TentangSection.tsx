"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { SITE_MEDIA } from "@/lib/media";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { SectionShell } from "./SectionShell";

const BUTIR = ["tentang.b1", "tentang.b2", "tentang.b3"] as const;

export function TentangSection() {
  const t = useTranslations("beranda");
  const foto = SITE_MEDIA.heroSlides[2];

  return (
    <SectionShell id="tentang" density="default" raised>
      <div className="mx-auto grid max-w-6xl items-center gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-[var(--border)] lg:col-span-5">
          <Image
            src={foto.src}
            alt={foto.alt}
            fill
            sizes="(max-width: 1024px) 100vw, 480px"
            className="object-cover"
          />
        </div>
        <div className="lg:col-span-7">
          <h2 className="type-h2 max-w-[22ch]">
            {t("hero.title")}
          </h2>
          <p className="type-lead mt-4 max-w-xl text-[var(--text-dim)]">
            {t("hero.lead")}
          </p>
          <ul className="mt-6 space-y-3">
            {BUTIR.map((key) => (
              <li key={key} className="flex items-start gap-3">
                <span
                  className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--bg-muted)] text-[var(--text)]"
                  aria-hidden
                >
                  <Check size={14} />
                </span>
                <span className={cn("leading-relaxed text-[var(--text)]", TYPE_FLOOR_CLASS)}>
                  {t(key)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionShell>
  );
}
