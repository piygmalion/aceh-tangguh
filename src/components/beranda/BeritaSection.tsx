"use client";

import { ArrowUpRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { KegiatanSlideshow } from "@/components/publikasi/KegiatanSlideshow";
import { Link } from "@/i18n/routing";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { SectionHeading } from "./primitives";
import { SectionShell } from "./SectionShell";

export function BeritaSection() {
  const t = useTranslations("beranda");

  return (
    <SectionShell id="berita" density="spacious" raised>
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          title={t("berita.title")}
          lead={t("berita.lead")}
          aside={
            <Link
              href="/publikasi"
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--border)] px-4 font-semibold transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]",
                TYPE_FLOOR_CLASS,
              )}
            >
              {t("berita.all")}
              <ArrowUpRight size={14} aria-hidden />
            </Link>
          }
        />
        <div className="mt-8">
          <KegiatanSlideshow />
        </div>
      </div>
    </SectionShell>
  );
}
