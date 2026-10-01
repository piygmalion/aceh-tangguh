"use client";

import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, CloudRain, Droplets, Flame, Mountain, Waves } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SITE_MEDIA } from "@/lib/media";
import type { PeringatanDiniResponse, PeringatanTone } from "@/lib/peringatan-dini-types";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { usePeringatan } from "./data";
import { StatusScaleChip, type StatusLevel } from "@/components/ui/StatusScaleChip";
import { jamPendek, rapikanTanda, TONE_CHIP, TONE_DOT, TONE_EDGE } from "./format";
import { PanelError, PanelSkeleton, SectionHeading } from "./primitives";

type Kartu = {
  key: string;
  bahaya: string;
  lembaga: string;
  Icon: LucideIcon;
  tone: PeringatanTone;
  ringkas: string;
  rincian: string[];
  stempel: string | null;
  href: string;
  external: boolean;
  basi: boolean;
};

type BerandaT = (key: string, values?: Record<string, string | number>) => string;

const URUTAN_TONE: Record<PeringatanTone, number> = { danger: 0, warn: 1, neutral: 2 };

function toneLevel(tone: PeringatanTone): StatusLevel {
  if (tone === "danger") return "awas";
  if (tone === "warn") return "waspada";
  return "aman";
}

function bangunKartu(pd: PeringatanDiniResponse, t: BerandaT, locale: string): Kartu[] {
  const kartu: Kartu[] = [];
  const lowerTag = locale === "en" ? "en-US" : "id-ID";

  if (pd.cuaca) {
    kartu.push({
      key: "cuaca",
      bahaya: t("feed.cuaca"),
      lembaga: t("lembaga.cuaca"),
      Icon: CloudRain,
      tone: pd.cuaca.tone,
      ringkas: pd.cuaca.empty
        ? t("peringatan.cuacaEmpty")
        : t("peringatan.cuacaCount", {
            count: pd.cuaca.highlights.length + pd.cuaca.extra_count,
          }),
      rincian: pd.cuaca.highlights
        .slice(0, 4)
        .map((h) => `${h.kabupaten}: ${h.kondisi.toLocaleLowerCase(lowerTag)}`),
      stempel: jamPendek(pd.cuaca.fetched_at, locale),
      href: pd.cuaca.href,
      external: false,
      basi: pd.cuaca.stale,
    });
  }

  if (pd.magma) {
    const ev = pd.magma.event;
    kartu.push({
      key: "magma",
      bahaya: t("feed.magma"),
      lembaga: t("lembaga.magma"),
      Icon: Mountain,
      tone: pd.magma.tone,
      ringkas: pd.magma.empty || !ev ? t("peringatan.magmaEmpty") : ev.magnitude_text,
      rincian:
        pd.magma.empty || !ev
          ? []
          : [ev.wilayah, ev.koordinat_kedalaman, ev.waktu_kejadian].filter(Boolean),
      stempel: jamPendek(pd.magma.fetched_at, locale),
      href: pd.magma.href,
      external: true,
      basi: pd.magma.stale,
    });
  }

  if (pd.sipongi) {
    kartu.push({
      key: "sipongi",
      bahaya: t("feed.sipongi"),
      lembaga: t("lembaga.sipongi"),
      Icon: Flame,
      tone: pd.sipongi.tone,
      ringkas: pd.sipongi.empty
        ? t("peringatan.sipongiEmpty")
        : t("peringatan.sipongiCount", { count: pd.sipongi.points.length }),
      rincian: pd.sipongi.points
        .slice(0, 4)
        .map((p) => `${p.kabkota}, ${t("peringatan.kecamatan", { name: p.kecamatan })}`),
      stempel: jamPendek(pd.sipongi.fetched_at, locale),
      href: pd.sipongi.href,
      external: true,
      basi: pd.sipongi.stale,
    });
  }

  if (pd.tatonas) {
    kartu.push({
      key: "tatonas",
      bahaya: t("feed.tatonas"),
      lembaga: t("lembaga.tatonas"),
      Icon: Droplets,
      tone: pd.tatonas.tone,
      ringkas: pd.tatonas.empty
        ? t("peringatan.tatonasEmpty")
        : t("peringatan.tatonasCount", { count: pd.tatonas.highlights.length }),
      rincian: pd.tatonas.highlights
        .slice(0, 4)
        .map((h) => `${h.pos_name}: ${h.level}`),
      stempel: jamPendek(pd.tatonas.fetched_at, locale),
      href: pd.tatonas.href,
      external: true,
      basi: pd.tatonas.stale,
    });
  }

  if (pd.maritim) {
    kartu.push({
      key: "maritim",
      bahaya: t("feed.maritim"),
      lembaga: t("lembaga.maritim"),
      Icon: Waves,
      tone: pd.maritim.tone,
      ringkas: pd.maritim.empty
        ? t("peringatan.maritimEmpty")
        : t("peringatan.maritimCount", {
            count: pd.maritim.highlights.length + pd.maritim.extra_count,
          }),
      rincian: pd.maritim.highlights
        .slice(0, 4)
        .map((h) => `${h.nama}: ${h.wave_cat}`),
      stempel: jamPendek(pd.maritim.fetched_at, locale),
      href: pd.maritim.href,
      external: true,
      basi: pd.maritim.stale,
    });
  }

  return kartu.sort((a, b) => URUTAN_TONE[a.tone] - URUTAN_TONE[b.tone]);
}

function Kepala({ kartu, besar }: { kartu: Kartu; besar?: boolean }) {
  const tp = useTranslations("peringatanDini");
  const { Icon } = kartu;
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <span
          className={cn(
            "mt-0.5 grid shrink-0 place-items-center rounded-lg",
            besar ? "h-9 w-9" : "h-8 w-8",
            TONE_CHIP[kartu.tone],
          )}
          aria-hidden
        >
          <Icon size={besar ? 18 : 16} strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p
            className={cn(
              "font-semibold leading-snug",
              besar ? "text-[1.0625rem]" : "text-[0.9375rem]",
            )}
          >
            {kartu.bahaya}
          </p>
          <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{kartu.lembaga}</p>
        </div>
      </div>
      <StatusScaleChip
        level={toneLevel(kartu.tone)}
        label={tp(`tone.${kartu.tone}`)}
      />
    </div>
  );
}

function Kaki({ kartu }: { kartu: Kartu }) {
  const t = useTranslations("beranda");
  return (
    <div
      className={cn(
        "mt-auto flex items-center justify-between gap-2 pt-3 text-[var(--text-dim)]",
        TYPE_FLOOR_CLASS,
      )}
    >
      <span className="truncate tabular-nums">
        {kartu.basi ? t("peringatan.snapshot") : (kartu.stempel ?? t("peringatan.waktuKosong"))}
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-[var(--text)] underline decoration-[var(--text-dim)] underline-offset-2">
        {t("peringatan.sumber")}
        <ArrowUpRight size={13} aria-hidden />
      </span>
    </div>
  );
}

function Sel({ kartu, besar }: { kartu: Kartu; besar?: boolean }) {
  const t = useTranslations("beranda");
  const tp = useTranslations("peringatanDini");
  const foto = SITE_MEDIA.heroSlides[1];
  const isi = (
    <>
      {besar ? (
        <div className="relative -mx-4 -mt-4 mb-4 aspect-[16/8] overflow-hidden sm:-mx-5 sm:-mt-5">
          <Image
            src={foto.src}
            alt={foto.alt}
            fill
            sizes="(max-width: 1024px) 100vw, 420px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" aria-hidden />
        </div>
      ) : null}
      <Kepala kartu={kartu} besar={besar} />
      <p
        className={cn(
          "mt-3 font-medium leading-snug",
          besar ? "text-[1.125rem]" : "text-[0.9375rem]",
        )}
      >
        {rapikanTanda(kartu.ringkas)}
      </p>
      {kartu.rincian.length > 0 ? (
        <ul className={cn("mt-3 space-y-1.5 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
          {kartu.rincian.slice(0, besar ? 4 : 2).map((baris) => (
            <li key={baris} className="flex gap-2">
              <span
                className={cn("mt-[0.45rem] h-1 w-1 shrink-0 rounded-full", TONE_DOT[kartu.tone])}
                aria-hidden
              />
              <span className="min-w-0 break-words">{rapikanTanda(baris)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <Kaki kartu={kartu} />
    </>
  );

  const kelas = cn(
    "flex h-full flex-col rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 transition",
    "hover:border-[var(--ink)] hover:shadow-[var(--shadow)]",
    "focus-visible:border-[var(--ink)]",
    // The lead cell is the most severe feed, so it carries a tint of its own status.
    besar
      ? cn(
          "sm:p-5",
          kartu.tone === "danger"
            ? "bg-[color-mix(in_srgb,var(--status-awas)_14%,var(--bg-raised))]"
            : kartu.tone === "warn"
              ? "bg-[color-mix(in_srgb,var(--status-waspada)_28%,var(--bg-raised))]"
              : "bg-[color-mix(in_srgb,var(--status-aman)_18%,var(--bg-raised))]",
        )
      : "",
    // Tone-tinted left edge: colour here carries status, not decoration.
    "relative overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-[3px]",
    TONE_EDGE[kartu.tone],
  );

  return (
    <a
      href={kartu.href}
      target={kartu.external ? "_blank" : undefined}
      rel={kartu.external ? "noopener noreferrer" : undefined}
      className={kelas}
      aria-label={t("peringatan.ariaKartu", {
        bahaya: kartu.bahaya,
        lembaga: kartu.lembaga,
        tone: tp(`tone.${kartu.tone}`),
      })}
    >
      {isi}
    </a>
  );
}

export function PeringatanBento() {
  const t = useTranslations("beranda");
  const locale = useLocale();
  const { data, isLoading, isError } = usePeringatan();
  const kartu = data ? bangunKartu(data, t, locale) : [];
  const [utama, ...sisanya] = kartu;

  return (
    <section id="status" className="scroll-mt-24 px-4 py-16 md:py-20">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          title={t("peringatan.title")}
          lead={t("peringatan.lead")}
          aside={
            <a
              href="#risiko"
              className={cn(
                "inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--border)] px-4 font-semibold transition-colors hover:border-[var(--ink)] hover:bg-[var(--bg-muted)]",
                TYPE_FLOOR_CLASS,
              )}
            >
              {t("peringatan.toRisiko")}
            </a>
          }
        />

        {isLoading ? (
          <div className="mt-8 grid gap-3 lg:grid-cols-3 lg:grid-rows-2">
            <PanelSkeleton className="h-64 lg:row-span-2 lg:h-full" />
            {Array.from({ length: 4 }).map((_, i) => (
              <PanelSkeleton key={i} className="h-44" />
            ))}
          </div>
        ) : null}

        {isError ? (
          <div className="mt-8">
            <PanelError>{t("peringatan.error")}</PanelError>
          </div>
        ) : null}

        {utama ? (
          <div className="mt-8 grid gap-3 lg:grid-cols-3 lg:grid-rows-2">
            <div className="lg:row-span-2">
              <Sel kartu={utama} besar />
            </div>
            {sisanya.map((k) => (
              <Sel key={k.key} kartu={k} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
