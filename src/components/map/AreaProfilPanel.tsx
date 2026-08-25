"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowLeft, Home, X } from "lucide-react";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import {
  formatMetricId,
  type DesaListItem,
  type DesaProfilResponse,
  type ImpactBadge,
  type KecamatanProfilResponse,
  type MetricBundle,
  type NullableCount,
  type VillageClickSelection,
} from "@/lib/profil-desa";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";

type PanelView = "kecamatan" | "desa-list" | "desa";

async function fetchKecamatan(sel: VillageClickSelection): Promise<KecamatanProfilResponse | null> {
  const params = new URLSearchParams();
  if (sel.kabupaten) params.set("kabupaten", sel.kabupaten);
  if (sel.kecamatan) params.set("kecamatan", sel.kecamatan);
  if (sel.kodeKecamatan) params.set("kode_kecamatan", sel.kodeKecamatan);
  const res = await fetchPublicApi(`/api/profil-desa/kecamatan?${params.toString()}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("kecamatan fetch failed");
  return res.json();
}

async function fetchDesa(opts: {
  id?: string;
  kode?: string;
  nama?: string;
  kabupaten?: string;
  kecamatan?: string;
}): Promise<DesaProfilResponse | null> {
  const params = new URLSearchParams();
  if (opts.id) params.set("id", opts.id);
  if (opts.kode) params.set("kode", opts.kode);
  if (opts.nama) params.set("nama", opts.nama);
  if (opts.kabupaten) params.set("kabupaten", opts.kabupaten);
  if (opts.kecamatan) params.set("kecamatan", opts.kecamatan);
  const res = await fetchPublicApi(`/api/profil-desa/desa?${params.toString()}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("desa fetch failed");
  return res.json();
}

function badgeTone(badge: ImpactBadge): "danger" | "ok" | "neutral" {
  if (badge === "terdampak") return "danger";
  if (badge === "tidak_terdampak") return "ok";
  return "neutral";
}

const CARD_TONE: Record<"info" | "danger" | "warn" | "ok", string> = {
  info: "border-[color-mix(in_srgb,var(--info)_35%,transparent)] bg-[var(--info-dim)]",
  danger: "border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[var(--danger-dim)]",
  warn: "border-[color-mix(in_srgb,var(--warn)_35%,transparent)] bg-[var(--warn-dim)]",
  ok: "border-[color-mix(in_srgb,var(--primary)_35%,transparent)] bg-[var(--primary-dim)]",
};

const CARD_VALUE: Record<"info" | "danger" | "warn" | "ok", string> = {
  info: "text-[var(--info)]",
  danger: "text-[var(--danger)]",
  warn: "text-[var(--warn)]",
  ok: "text-[var(--primary)]",
};

function MetricCard({
  label,
  value,
  unknown,
  tone,
}: {
  label: string;
  value: NullableCount;
  unknown: string;
  tone: "info" | "danger" | "warn" | "ok";
}) {
  const isUnknown = value == null;
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${CARD_TONE[tone]}`}>
      <div className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[var(--text-dim)]">
        {label}
      </div>
      <div
        className={`mt-1 font-semibold tabular-nums ${
          isUnknown ? "text-sm text-[var(--text-dim)]" : `text-lg ${CARD_VALUE[tone]}`
        }`}
      >
        {formatMetricId(value, unknown)}
      </div>
    </div>
  );
}

function MetricSections({ metrics }: { metrics: MetricBundle }) {
  const t = useTranslations("profilDesa");
  const unknown = t("unknown");
  return (
    <div className="space-y-4">
      <section>
        <h3 className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
          {t("populasi")}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label={t("kk")} value={metrics.kk} unknown={unknown} tone="info" />
          <MetricCard
            label={t("jumlahPenduduk")}
            value={metrics.populasi}
            unknown={unknown}
            tone="info"
          />
          <MetricCard
            label={t("kkTerdampak")}
            value={metrics.kk_terdampak}
            unknown={unknown}
            tone="warn"
          />
          <MetricCard
            label={t("popTerdampak")}
            value={metrics.populasi_terdampak}
            unknown={unknown}
            tone="warn"
          />
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
          {t("korban")}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <MetricCard
            label={t("meninggal")}
            value={metrics.korban_meninggal}
            unknown={unknown}
            tone="danger"
          />
          <MetricCard
            label={t("hilang")}
            value={metrics.korban_hilang}
            unknown={unknown}
            tone="danger"
          />
        </div>
      </section>
      <section>
        <h3 className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
          {t("kerusakan")}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label={t("rumahRr")} value={metrics.rumah_rr} unknown={unknown} tone="ok" />
          <MetricCard label={t("rumahRs")} value={metrics.rumah_rs} unknown={unknown} tone="warn" />
          <MetricCard label={t("rumahRb")} value={metrics.rumah_rb} unknown={unknown} tone="danger" />
          <MetricCard
            label={t("totalRusak")}
            value={metrics.total_rumah_rusak}
            unknown={unknown}
            tone="warn"
          />
        </div>
      </section>
    </div>
  );
}

function BadgeChip({ badge }: { badge: ImpactBadge }) {
  const t = useTranslations("profilDesa");
  const label =
    badge === "terdampak"
      ? t("badgeTerdampak")
      : badge === "tidak_terdampak"
        ? t("badgeTidak")
        : t("badgeUnknown");
  return (
    <Chip tone={badgeTone(badge)} className="px-2.5 py-0.5 text-[0.7rem]">
      {label}
    </Chip>
  );
}

function EmptyState() {
  const t = useTranslations("profilDesa");
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] px-3 py-6 text-center">
      <p className="text-sm font-medium">{t("empty")}</p>
      <p className="mt-1 text-xs text-[var(--text-dim)]">{t("emptyHint")}</p>
    </div>
  );
}

export function AreaProfilPanel({
  selection,
  onClose,
}: {
  selection: VillageClickSelection;
  onClose: () => void;
}) {
  const t = useTranslations("profilDesa");
  const [view, setView] = useState<PanelView>("kecamatan");
  const [activeDesa, setActiveDesa] = useState<DesaListItem | null>(null);

  useEffect(() => {
    setView("kecamatan");
    setActiveDesa(null);
  }, [selection.kabupaten, selection.kecamatan, selection.kodeKecamatan, selection.kodeDesa]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const kecQuery = useQuery({
    queryKey: qk.profilKecamatan({
      kabupaten: selection.kabupaten,
      kecamatan: selection.kecamatan,
      kodeKecamatan: selection.kodeKecamatan,
    }),
    queryFn: () => fetchKecamatan(selection),
  });

  const desaQuery = useQuery({
    queryKey: qk.profilDesa({
      id: activeDesa?.id,
      kode: activeDesa?.kode ?? undefined,
      nama: activeDesa?.nama,
    }),
    queryFn: () =>
      fetchDesa({
        id: activeDesa?.id,
        kode: activeDesa?.kode ?? undefined,
        nama: activeDesa?.nama,
        kabupaten: activeDesa?.kabupaten ?? selection.kabupaten,
        kecamatan: activeDesa?.kecamatan ?? selection.kecamatan,
      }),
    enabled: view === "desa" && !!activeDesa,
  });

  const kec = kecQuery.data;
  const title =
    view === "desa"
      ? (desaQuery.data?.title ?? activeDesa?.nama ?? selection.name)
      : (kec?.title ?? selection.kecamatan);
  const badge: ImpactBadge | null =
    view === "desa"
      ? (desaQuery.data?.badge ?? activeDesa?.badge ?? null)
      : (kec?.badge ?? null);
  const locationLine = [selection.kabupaten, selection.kecamatan].filter(Boolean).join(" · ");
  const desaCount = kec?.desa_count ?? 0;

  const goBack = () => {
    if (view === "desa") {
      setView("desa-list");
      return;
    }
    if (view === "desa-list") {
      setView("kecamatan");
      return;
    }
    onClose();
  };

  const openDesa = (item: DesaListItem) => {
    setActiveDesa(item);
    setView("desa");
  };

  return (
    <div className="pointer-events-none absolute inset-0 z-40">
      <button
        type="button"
        className="pointer-events-auto absolute inset-0 bg-black/25 md:bg-transparent"
        aria-label={t("close")}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="map-chrome-elevated pointer-events-auto absolute inset-x-2 top-[4.15rem] flex max-h-[min(78vh,40rem)] flex-col overflow-hidden rounded-2xl md:inset-x-auto md:left-14 md:top-[4.5rem] md:w-[24rem]"
      >
        <header className="flex items-start gap-3 border-b border-[var(--border)] px-4 py-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500/15 text-orange-500"
            aria-hidden
          >
            <Home size={20} strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-[var(--text-dim)]">
              {view === "desa-list"
                ? t("desaListTitle")
                : view === "desa"
                  ? t("desaLabel")
                  : t("kecamatanLabel")}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-semibold tracking-tight">{title}</h2>
              {badge ? <BadgeChip badge={badge} /> : null}
            </div>
            <p className="mt-0.5 truncate text-xs text-[var(--text-dim)]">
              {locationLine}
              {view !== "desa" && desaCount > 0 ? ` · ${t("desaCount", { count: desaCount })}` : ""}
            </p>
            {selection.name && view !== "desa" ? (
              <p className="mt-0.5 truncate text-[0.7rem] text-[var(--text-dim)]">
                {t("clickedHint", { name: selection.name })}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--text-dim)] transition hover:bg-[var(--bg-muted)] hover:text-[var(--text)]"
            aria-label={t("close")}
          >
            <X size={15} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
          {kecQuery.isLoading ? (
            <p className="py-8 text-center text-sm text-[var(--text-dim)]">{t("loading")}</p>
          ) : kecQuery.isError ? (
            <p className="py-8 text-center text-sm text-[var(--danger)]">{t("error")}</p>
          ) : view === "kecamatan" ? (
            kec ? (
              <MetricSections metrics={kec.metrics} />
            ) : (
              <EmptyState />
            )
          ) : view === "desa-list" ? (
            kec && kec.desa.length > 0 ? (
              <ul className="space-y-1.5">
                {kec.desa.map((item) => {
                  const highlighted =
                    item.kode === selection.kodeDesa ||
                    item.nama.toLowerCase() === selection.name.toLowerCase();
                  return (
                    <li key={item.id || item.kode || item.nama}>
                      <button
                        type="button"
                        onClick={() => openDesa(item)}
                        className="map-option w-full"
                        data-active={highlighted ? "true" : "false"}
                      >
                        <span className="min-w-0 flex-1 text-left">
                          <span className="block truncate font-medium">{item.nama}</span>
                          <span className="block text-[0.7rem] text-[var(--text-dim)]">
                            {item.total_rumah_rusak != null
                              ? t("damageCount", {
                                  count: formatMetricId(item.total_rumah_rusak, t("unknown")),
                                })
                              : t("unknown")}
                          </span>
                        </span>
                        <BadgeChip badge={item.badge} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <EmptyState />
            )
          ) : desaQuery.isLoading ? (
            <p className="py-8 text-center text-sm text-[var(--text-dim)]">{t("loading")}</p>
          ) : desaQuery.data ? (
            <MetricSections metrics={desaQuery.data.metrics} />
          ) : (
            <EmptyState />
          )}
        </div>

        <footer className="flex items-center gap-2 border-t border-[var(--border)] px-4 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            leftIcon={<ArrowLeft size={14} />}
            onClick={goBack}
          >
            {t("back")}
          </Button>
          {view === "kecamatan" && kec && kec.desa.length > 0 ? (
            <Button
              type="button"
              size="sm"
              className="ml-auto rounded-xl"
              onClick={() => setView("desa-list")}
            >
              {t("viewDesa")}
            </Button>
          ) : null}
        </footer>
      </aside>
    </div>
  );
}
