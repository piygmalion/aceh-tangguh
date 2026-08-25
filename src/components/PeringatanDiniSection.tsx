"use client";

import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { CloudRain, Flame, Mountain } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import type {
  CuacaWarningCard,
  MagmaCard,
  PeringatanDiniResponse,
  PeringatanTone,
  SipongiCard,
} from "@/lib/peringatan-dini-types";

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
  const className = `glass flex h-full min-h-[14.5rem] flex-col gap-2 rounded-2xl px-3.5 py-3 transition hover:ring-1 ${ring}`;

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
        <span className="truncate text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-dim)]">
          {source}
        </span>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Chip
          tone={tone === "danger" ? "danger" : tone === "warn" ? "warn" : "neutral"}
          className="gap-1 px-1.5 py-0.5 text-[0.58rem] leading-none"
        >
          {t(`tone.${tone}`)}
        </Chip>
        {stamp ? (
          <span className="text-[0.58rem] tabular-nums text-[var(--text-dim)]">{stamp}</span>
        ) : null}
        {stale ? (
          <span className="text-[0.58rem] font-medium text-[var(--warn)]">{t("stale")}</span>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-[0.72rem] leading-snug">
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
            <p className="text-[0.68rem] text-[var(--text-dim)]">
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

export function PeringatanDiniSection() {
  const t = useTranslations("peringatanDini");
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.peringatanDini,
    queryFn: fetchPeringatanDini,
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });

  return (
    <section
      id="status"
      className="relative z-[1] -mt-2 border-y border-[var(--glass-border)] bg-[var(--bg-raised)]/80 px-4 py-5 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-6xl">
        <div>
          <h2 className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">
            {t("title")}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-dim)]">{t("subtitle")}</p>
        </div>

        {isLoading ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3" aria-hidden>
            {Array.from({ length: 3 }).map((_, i) => (
              <span key={i} className="skeleton h-[14.5rem] rounded-2xl" />
            ))}
          </div>
        ) : null}

        {isError ? (
          <p className="mt-4 text-sm text-[var(--text-dim)]">{t("error")}</p>
        ) : null}

        {data ? (
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <CuacaCard card={data.cuaca} />
            <MagmaCardView card={data.magma} />
            <SipongiCardView card={data.sipongi} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
