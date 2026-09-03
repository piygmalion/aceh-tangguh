"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { CloudRain, Droplets, Flame, Mountain } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import type {
  CuacaWarningCard,
  MagmaCard,
  PeringatanDiniResponse,
  PeringatanTone,
  SipongiCard,
  TatonasCard,
} from "@/lib/peringatan-dini-types";
import {
  TYPE_FLOOR_CLASS,
  TYPE_KICKER_CLASS,
  TYPE_STAMP_CLASS,
} from "@/lib/type-floor";
import { cn } from "@/lib/utils";

async function fetchPeringatanDini(): Promise<PeringatanDiniResponse> {
  const res = await fetchPublicApi("/api/peringatan-dini");
  if (!res.ok) throw new Error("Failed to load peringatan dini");
  return res.json();
}

function formatStamp(iso: string | null | undefined, locale: string): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toLocaleString(locale === "en" ? "en-GB" : "id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function CardShell({
  href,
  external,
  tone,
  children,
  ariaLabel,
}: {
  href: string;
  external?: boolean;
  tone: PeringatanTone;
  children: ReactNode;
  ariaLabel: string;
}) {
  const ring =
    tone === "danger"
      ? "hover:ring-[var(--danger)]/50"
      : tone === "warn"
        ? "hover:ring-[var(--warn)]/50"
        : "hover:ring-[var(--primary)]/40";
  const className = `glass flex h-full min-h-[16rem] flex-col gap-2 rounded-2xl p-6 transition hover:ring-1 ${ring}`;

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={ariaLabel}
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <a href={href} aria-label={ariaLabel} className={className}>
      {children}
    </a>
  );
}

function CardHeader({
  icon,
  source,
  tone,
  stamp,
  stale,
}: {
  icon: ReactNode;
  source: string;
  tone: PeringatanTone;
  stamp: string | null;
  stale: boolean;
}) {
  const t = useTranslations("peringatanDini");
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1.5">
        {icon}
        <span className={cn("truncate text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
          {source}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Chip
          tone={tone === "danger" ? "danger" : tone === "warn" ? "warn" : "neutral"}
          className={cn("gap-1 px-1.5 py-0.5 leading-none", TYPE_FLOOR_CLASS)}
        >
          {t(`tone.${tone}`)}
        </Chip>
        {stamp ? (
          <span className={cn("text-[var(--text-dim)]", TYPE_STAMP_CLASS)}>{stamp}</span>
        ) : null}
        {stale ? (
          <span className={cn("font-medium text-[var(--warn)]", TYPE_FLOOR_CLASS)}>{t("stale")}</span>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className={cn("leading-snug", TYPE_FLOOR_CLASS)}>
      <span className="text-[var(--text-dim)]">{label}</span>
      <span className="text-[var(--text-dim)]"> : </span>
      <span className="text-[var(--text)]">{value}</span>
    </p>
  );
}

function CuacaCard({ card }: { card: CuacaWarningCard }) {
  const t = useTranslations("peringatanDini");
  const locale = useLocale();
  const stamp = formatStamp(card.fetched_at, locale);

  return (
    <CardShell href={card.href} tone={card.tone} ariaLabel={t("cuaca.aria")}>
      <CardHeader
        icon={<CloudRain className="h-3.5 w-3.5 shrink-0 text-[var(--info)]" />}
        source={t("cuaca.source")}
        tone={card.tone}
        stamp={stamp}
        stale={card.stale}
      />
      {card.empty ? (
        <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">{t("cuaca.empty")}</p>
      ) : (
        <div className="mt-1 flex flex-col gap-2">
          {card.highlights.map((h) => (
            <div key={h.kabupaten} className="space-y-0.5">
              <Field label={t("cuaca.kabupaten")} value={h.kabupaten} />
              <Field label={t("cuaca.kondisi")} value={h.kondisi} />
              <Field
                label={t("cuaca.curahHujan")}
                value={
                  h.curah_hujan_mm === null
                    ? "—"
                    : t("cuaca.rainValue", { value: h.curah_hujan_mm.toFixed(1) })
                }
              />
              {h.periode ? <Field label={t("cuaca.periode")} value={h.periode} /> : null}
              <Field label={t("cuaca.sumber")} value={h.source_label} />
            </div>
          ))}
          {card.extra_count > 0 ? (
            <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
              {t("cuaca.more", { n: card.extra_count })}
            </p>
          ) : null}
        </div>
      )}
    </CardShell>
  );
}

function MagmaCardView({ card }: { card: MagmaCard }) {
  const t = useTranslations("peringatanDini");
  const locale = useLocale();
  const stamp = formatStamp(card.fetched_at, locale);
  const ev = card.event;

  return (
    <CardShell
      href={card.href}
      external
      tone={card.tone}
      ariaLabel={t("magma.aria")}
    >
      <CardHeader
        icon={<Mountain className="h-3.5 w-3.5 shrink-0 text-[var(--warn)]" />}
        source={t("magma.source")}
        tone={card.tone}
        stamp={stamp}
        stale={card.stale}
      />
      {card.empty || !ev ? (
        <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">{t("magma.empty")}</p>
      ) : (
        <div className="mt-1 space-y-0.5">
          <Field label={t("magma.magnitudo")} value={ev.magnitude_text} />
          <Field label={t("magma.waktu")} value={ev.waktu_kejadian} />
          <Field label={t("magma.koordinat")} value={ev.koordinat_kedalaman} />
          <Field label={t("magma.wilayah")} value={ev.wilayah} />
          {ev.intensitas_mmi ? (
            <Field label={t("magma.intensitas")} value={ev.intensitas_mmi} />
          ) : null}
          {ev.gunung_api_terdekat ? (
            <Field label={t("magma.gunung")} value={ev.gunung_api_terdekat} />
          ) : null}
        </div>
      )}
    </CardShell>
  );
}

function SipongiCardView({ card }: { card: SipongiCard }) {
  const t = useTranslations("peringatanDini");
  const locale = useLocale();
  const stamp = formatStamp(card.fetched_at, locale);

  return (
    <CardShell
      href={card.href}
      external
      tone={card.tone}
      ariaLabel={t("sipongi.aria")}
    >
      <CardHeader
        icon={<Flame className="h-3.5 w-3.5 shrink-0 text-[var(--danger)]" />}
        source={t("sipongi.source")}
        tone={card.tone}
        stamp={stamp}
        stale={card.stale}
      />
      {card.empty ? (
        <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">{t("sipongi.empty")}</p>
      ) : (
        <div className="mt-1 flex flex-col gap-2">
          {card.points.map((p, i) => (
            <div key={`${p.tanggal}-${p.desa}-${i}`} className="space-y-0.5">
              <Field label={t("sipongi.tanggal")} value={p.tanggal} />
              <Field label={t("sipongi.sumber")} value={p.sumber} />
              <Field label={t("sipongi.desa")} value={p.desa} />
              <Field label={t("sipongi.kecamatan")} value={p.kecamatan} />
              <Field label={t("sipongi.kabkota")} value={p.kabkota} />
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

function TatonasCardView({ card }: { card: TatonasCard }) {
  const t = useTranslations("peringatanDini");
  const locale = useLocale();
  const stamp = formatStamp(card.fetched_at, locale);

  return (
    <CardShell
      href={card.href}
      external
      tone={card.tone}
      ariaLabel={t("tatonas.aria")}
    >
      <CardHeader
        icon={<Droplets className="h-3.5 w-3.5 shrink-0 text-[var(--info)]" />}
        source={t("tatonas.source")}
        tone={card.tone}
        stamp={stamp}
        stale={card.stale}
      />
      {card.empty ? (
        <p className="mt-2 text-sm leading-relaxed text-[var(--text)]">{t("tatonas.empty")}</p>
      ) : (
        <div className="mt-1 flex flex-col gap-2">
          {card.highlights.map((h) => (
            <div key={`${h.uid}-${h.pos_name}`} className="space-y-0.5">
              <Field label={t("tatonas.pos")} value={h.pos_name} />
              <Field label={t("tatonas.jenis")} value={t(`tatonas.kind.${h.logger_kind}`)} />
              <Field
                label={t("tatonas.nilai")}
                value={
                  h.value == null
                    ? "—"
                    : `${h.value} ${h.satuan}`.trim()
                }
              />
              <Field label={t("tatonas.level")} value={h.level} />
              {h.time_local ? <Field label={t("tatonas.waktu")} value={h.time_local} /> : null}
            </div>
          ))}
          {card.extra_count > 0 ? (
            <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
              {t("tatonas.more", { n: card.extra_count })}
            </p>
          ) : null}
        </div>
      )}
    </CardShell>
  );
}

export function PeringatanDiniSection() {
  const t = useTranslations("peringatanDini");
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.peringatanDini,
    queryFn: fetchPeringatanDini,
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });

  return (
    <section id="status" className="relative z-[1] scroll-mt-28 px-4 py-20 md:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className={cn("mb-2 text-[var(--accent-soft)]", TYPE_KICKER_CLASS)}>
              {t("kicker")}
            </p>
            <h2 className="section-h2">{t("title")}</h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--text-dim)]">
              {t("subtitle")}
            </p>
          </div>
          <a
            href="#cuaca"
            className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[var(--accent-soft)] transition-colors hover:text-[var(--text)]"
          >
            {t("archiveLink")}
            <span aria-hidden>→</span>
          </a>
        </div>

        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4" aria-hidden>
            {Array.from({ length: 4 }).map((_, i) => (
              <span key={i} className="skeleton h-[16rem] rounded-2xl" />
            ))}
          </div>
        ) : null}

        {isError ? (
          <p className="text-sm text-[var(--text-dim)]">{t("error")}</p>
        ) : null}

        {data ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <CuacaCard card={data.cuaca} />
            <MagmaCardView card={data.magma} />
            <SipongiCardView card={data.sipongi} />
            {data.tatonas ? <TatonasCardView card={data.tatonas} /> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
