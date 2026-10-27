"use client";

import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, CloudRain, Droplets, Flame, Mountain, Waves } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SITE_MEDIA } from "@/lib/media";
import { magmaSummary, tatonasCopy, tatonasStaleRow } from "@/lib/peringatan-dini/card-copy";
import type { PeringatanDiniResponse, PeringatanTone } from "@/lib/peringatan-dini-types";
import {
  hiddenListItems,
  listItemCount,
  overflowLabelKey,
  SMALL_CARD_ROWS,
} from "@/lib/peringatan-bento-rows";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import { usePeringatan } from "./data";
import { StatusScaleChip } from "@/components/ui/StatusScaleChip";
import { jamPendek, rapikanTanda, toneLevel, TONE_CHIP, TONE_DOT, TONE_EDGE } from "./format";
import { PanelError, PanelSkeleton, SectionHeading } from "./primitives";
import { SectionShell } from "./SectionShell";

type Kartu = {
  key: string;
  bahaya: string;
  lembaga: string;
  Icon: LucideIcon;
  tone: PeringatanTone;
  ringkas: string;
  rincian: string[];
  /** API list length. Null when the card is one object, not a list of items. */
  itemCount: number | null;
  stempel: string | null;
  href: string;
  external: boolean;
  basi: boolean;
  /** Local mute. Neutral MAGMA and stale Tatonas stay off the green AMAN chip. */
  grey: boolean;
  chip: "tone" | "stale" | "info";
};

type BerandaT = (key: string, values?: Record<string, string | number>) => string;

const URUTAN_TONE: Record<PeringatanTone, number> = { danger: 0, siaga: 1, warn: 2, neutral: 3 };

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
      rincian: pd.cuaca.highlights.map(
        (h) => `${h.kabupaten}: ${h.kondisi.toLocaleLowerCase(lowerTag)}`,
      ),
      itemCount: listItemCount(pd.cuaca.highlights, pd.cuaca.extra_count),
      stempel: jamPendek(pd.cuaca.fetched_at, locale),
      href: pd.cuaca.href,
      external: false,
      basi: pd.cuaca.stale,
      grey: false,
      chip: "tone",
    });
  }

  if (pd.magma) {
    const ev = pd.magma.event;
    const summary = magmaSummary(pd.magma);
    const unavailable = summary === "unavailable";
    kartu.push({
      key: "magma",
      bahaya: t("feed.magma"),
      lembaga: t("lembaga.magma"),
      Icon: Mountain,
      tone: pd.magma.tone,
      ringkas: unavailable
        ? t("peringatan.magmaUnavailable")
        : summary === "empty" || !ev
          ? t("peringatan.magmaEmpty")
          : ev.magnitude_text,
      rincian:
        summary !== "event" || !ev
          ? []
          : [ev.wilayah, ev.koordinat_kedalaman, ev.waktu_kejadian].filter(Boolean),
      itemCount: null,
      stempel: jamPendek(pd.magma.fetched_at, locale),
      href: pd.magma.href,
      external: true,
      basi: pd.magma.stale,
      grey: pd.magma.tone === "neutral",
      chip: unavailable ? "stale" : pd.magma.tone === "neutral" ? "info" : "tone",
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
      rincian: pd.sipongi.points.map(
        (p) => `${p.kabkota}, ${t("peringatan.kecamatan", { name: p.kecamatan })}`,
      ),
      itemCount: listItemCount(pd.sipongi.points),
      stempel: jamPendek(pd.sipongi.fetched_at, locale),
      href: pd.sipongi.href,
      external: true,
      basi: pd.sipongi.stale,
      grey: false,
      chip: "tone",
    });
  }

  if (pd.tatonas) {
    const copy = tatonasCopy(pd.tatonas);
    kartu.push({
      key: "tatonas",
      bahaya: t("feed.tatonas"),
      lembaga: t("lembaga.tatonas"),
      Icon: Droplets,
      tone: pd.tatonas.tone,
      ringkas:
        copy.kind === "stale"
          ? copy.menit == null
            ? t("peringatan.tatonasStaleNoClock")
            : t("peringatan.tatonasStale", { menit: copy.menit })
          : copy.kind === "normal"
            ? t("peringatan.tatonasEmpty")
            : t("peringatan.tatonasCount", { count: copy.count }),
      rincian:
        copy.kind === "stale"
          ? pd.tatonas.highlights.map((h) => {
              const row = tatonasStaleRow(h.pos_name, h.time_local, Date.now());
              if (row.menit == null || row.min == null) return row.nama;
              return t("peringatan.tatonasRowStale", {
                nama: row.nama,
                menit: row.menit,
                min: row.min,
              });
            })
          : pd.tatonas.highlights.map((h) => `${h.pos_name}: ${h.level}`),
      itemCount: listItemCount(pd.tatonas.highlights, pd.tatonas.extra_count),
      stempel: jamPendek(pd.tatonas.fetched_at, locale),
      href: pd.tatonas.href,
      external: true,
      basi: pd.tatonas.stale,
      grey: copy.kind === "stale",
      chip: copy.kind === "stale" ? "stale" : "tone",
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
      rincian: pd.maritim.highlights.map((h) => `${h.nama}: ${h.wave_cat}`),
      itemCount: listItemCount(pd.maritim.highlights, pd.maritim.extra_count),
      stempel: jamPendek(pd.maritim.fetched_at, locale),
      href: pd.maritim.href,
      external: true,
      basi: pd.maritim.stale,
      grey: false,
      chip: "tone",
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
            kartu.grey
              ? "border border-[var(--map-keyline)] bg-[var(--bg-muted)] text-[var(--text-dim)]"
              : TONE_CHIP[kartu.tone],
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
      {kartu.grey ? (
        <span
          data-tone-chrome="grey"
          data-status-level="grey"
          className={cn(
            "inline-flex min-h-[44px] min-w-[44px] items-center rounded-full border border-[var(--map-keyline)] bg-[var(--bg-muted)] px-3 py-1 font-semibold uppercase tracking-[0.06em] text-[var(--text-dim)]",
            TYPE_FLOOR_CLASS,
          )}
        >
          {kartu.chip === "stale"
            ? tp("stale")
            : kartu.chip === "info"
              ? tp("tone.info")
              : tp(`tone.${kartu.tone}`)}
        </span>
      ) : (
        <StatusScaleChip
          level={toneLevel(kartu.tone)}
          label={tp(`tone.${kartu.tone}`)}
          className={
            toneLevel(kartu.tone) === "awas" ? "bg-[#B42318] text-white shadow-none" : undefined
          }
        />
      )}
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
  const shown = besar ? 4 : kartu.itemCount == null ? kartu.rincian.length : SMALL_CARD_ROWS;
  const hidden = besar ? 0 : hiddenListItems(kartu.itemCount, shown);
  const overflowKey = hidden > 0 ? overflowLabelKey(kartu.key) : null;
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
          {kartu.rincian.slice(0, shown).map((baris) => (
            <li key={baris} className="flex gap-2">
              <span
                className={cn(
                  "mt-[0.45rem] h-1 w-1 shrink-0 rounded-full",
                  kartu.grey ? "bg-[var(--text-dim)]" : TONE_DOT[kartu.tone],
                )}
                aria-hidden
              />
              <span className="min-w-0 break-words">{rapikanTanda(baris)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {overflowKey ? (
        <p className={cn("mt-1.5 font-semibold text-[var(--text)] underline underline-offset-2", TYPE_FLOOR_CLASS)} data-pos-lainnya="">
          {t(`peringatan.${overflowKey}`, { count: hidden })}
        </p>
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
          kartu.grey
            ? ""
            : toneLevel(kartu.tone) === "awas"
              ? "bg-[color-mix(in_srgb,#B42318_14%,var(--bg-raised))]"
              : toneLevel(kartu.tone) === "siaga"
                ? "bg-[color-mix(in_srgb,var(--status-siaga)_14%,var(--bg-raised))]"
                : toneLevel(kartu.tone) === "waspada"
                  ? "bg-[color-mix(in_srgb,var(--status-waspada)_28%,var(--bg-raised))]"
                  : "bg-[color-mix(in_srgb,var(--status-aman)_18%,var(--bg-raised))]",
        )
      : "",
    // Tone-tinted left edge: colour here carries status, not decoration.
    "relative overflow-hidden before:absolute before:inset-y-0 before:left-0 before:w-[3px]",
    kartu.grey ? "before:bg-[var(--text-dim)]" : TONE_EDGE[kartu.tone],
  );

  return (
    <a
      href={kartu.href}
      target={kartu.external ? "_blank" : undefined}
      rel={kartu.external ? "noopener noreferrer" : undefined}
      data-peringatan={kartu.key}
      className={kelas}
      aria-label={t("peringatan.ariaKartu", {
        bahaya: kartu.bahaya,
        lembaga: kartu.lembaga,
        tone:
          kartu.chip === "stale"
            ? tp("stale")
            : kartu.chip === "info"
              ? tp("tone.info")
              : tp(`tone.${kartu.tone}`),
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
    <SectionShell id="status" density="spacious" className="relative z-40">
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
    </SectionShell>
  );
}
