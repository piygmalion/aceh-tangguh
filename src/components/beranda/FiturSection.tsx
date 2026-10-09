"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, BarChart3, BookOpen, Map, TriangleAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { PetaTeaserSvg } from "./PetaTeaserSvg";
import { SectionShell } from "./SectionShell";

const KARTU = [
  {
    href: "/lapor/kejadian" as const,
    titleKey: "fitur.laporTitle" as const,
    isiKey: "fitur.laporIsi" as const,
    Icon: TriangleAlert,
    id: undefined,
  },
  {
    href: "/peta" as const,
    titleKey: "fitur.petaTitle" as const,
    isiKey: "fitur.petaIsi" as const,
    Icon: Map,
    id: "peta-teaser",
  },
  {
    href: "/analisis-data" as const,
    titleKey: "fitur.analisisTitle" as const,
    isiKey: "fitur.analisisIsi" as const,
    Icon: BarChart3,
    id: undefined,
  },
  {
    href: "/publikasi" as const,
    titleKey: "fitur.infoTitle" as const,
    isiKey: "fitur.infoIsi" as const,
    Icon: BookOpen,
    id: undefined,
  },
] as const;

function Kartu({
  href,
  title,
  isi,
  Icon,
  id,
}: {
  href: (typeof KARTU)[number]["href"];
  title: string;
  isi: string;
  Icon: LucideIcon;
  id?: string;
}) {
  const peta = id === "peta-teaser";
  return (
    <Link
      id={id}
      href={href}
      className={cn(
        "group flex scroll-mt-24 rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] transition hover:border-[var(--primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ring)]",
        peta ? "flex-col items-stretch overflow-hidden p-0" : "items-center gap-4 p-4 md:p-5",
      )}
    >
      {peta ? <PetaTeaserSvg /> : null}
      <span className={cn("flex min-w-0 flex-1 items-center gap-4", peta && "p-4 md:p-5")}>
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--bg-muted)] text-[var(--text)]"
        aria-hidden
      >
        <Icon size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[1.0625rem] font-semibold">{title}</span>
        <span className={cn("mt-1 block leading-relaxed text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
          {isi}
        </span>
      </span>
      <ArrowUpRight
        size={18}
        aria-hidden
        className="shrink-0 text-[var(--text-dim)] transition group-hover:text-[var(--primary)]"
      />
      </span>
    </Link>
  );
}

export function FiturSection() {
  const t = useTranslations("beranda");

  return (
    <SectionShell id="layanan" density="spacious" raised>
      <div className="mx-auto max-w-6xl">
        <h2 className="type-h2">{t("fitur.title")}</h2>
        <ul className="mt-8 grid gap-3">
          {KARTU.map((kartu) => (
            <li key={kartu.href}>
              {kartu.id ? (
                <Kartu
                  id="peta-teaser"
                  href={kartu.href}
                  title={t(kartu.titleKey)}
                  isi={t(kartu.isiKey)}
                  Icon={kartu.Icon}
                />
              ) : (
                <Kartu
                  href={kartu.href}
                  title={t(kartu.titleKey)}
                  isi={t(kartu.isiKey)}
                  Icon={kartu.Icon}
                />
              )}
            </li>
          ))}
        </ul>
      </div>
    </SectionShell>
  );
}
