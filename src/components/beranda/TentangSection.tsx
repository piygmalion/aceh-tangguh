"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { SITE_MEDIA } from "@/lib/media";
import { TYPE_FLOOR_CLASS, TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

const BUTIR = ["tentang.b1", "tentang.b2", "tentang.b3"] as const;

export function TentangSection() {
  const t = useTranslations("beranda");
  const foto = SITE_MEDIA.heroSlides[2];

  return (
    <section id="tentang" className="scroll-mt-24 border-y border-[var(--border)] bg-[var(--bg-raised)] px-4 py-16 md:py-20">
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
          <p className={cn("text-[var(--accent)]", TYPE_KICKER_CLASS)}>{t("tentang.kicker")}</p>
          <h2 className="mt-3 max-w-[22ch] text-[1.6rem] font-semibold leading-[1.18] tracking-[-0.028em] sm:text-[2rem]">
            {t("hero.title")}
          </h2>
          <p className="mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-[var(--text-dim)]">
            {t("hero.lead")}
          </p>
          <ul className="mt-6 space-y-3">
            {BUTIR.map((key) => (
              <li key={key} className="flex items-start gap-3">
                <span
                  className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--primary-dim)] text-[var(--primary)]"
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
    </section>
  );
}
