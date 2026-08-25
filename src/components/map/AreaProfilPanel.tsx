"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowLeft, Home, X } from "lucide-react";
import {
  AREA_PROFIL_INITIAL_VIEW,
  areaProfilBack,
  areaProfilBreadcrumbEnabled,
  areaProfilBreadcrumbTarget,
  areaProfilViewOnOpen,
  kabupatenNameFromSelection,
  profilDesaApiPath,
  profilDesaSearchParams,
  profilKabupatenSearchParams,
  profilKecamatanSearchParams,
  type AreaProfilView,
} from "@/lib/area-profil-ia";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import {
  formatMetricId,
  type DesaListItem,
  type DesaProfilResponse,
  type ImpactBadge,
  type KabupatenProfilResponse,
  type KecamatanListItem,
  type KecamatanProfilResponse,
  type MetricBundle,
  type NullableCount,
  type VillageClickSelection,
} from "@/lib/profil-desa";
import { Button } from "@/components/ui/Button";
import { Chip } from "@/components/ui/Chip";
import { TYPE_FLOOR_CLASS, TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

async function fetchKabupaten(
  sel: VillageClickSelection
): Promise<KabupatenProfilResponse | null> {
  const params = profilKabupatenSearchParams(sel);
  const res = await fetchPublicApi(profilDesaApiPath("kabupaten", params));
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("kabupaten fetch failed");
  return res.json();
}

async function fetchKecamatan(opts: {
  kabupaten?: string;
  kecamatan?: string;
  kodeKecamatan?: string;
}): Promise<KecamatanProfilResponse | null> {
  const params = profilKecamatanSearchParams(opts);
  const res = await fetchPublicApi(profilDesaApiPath("kecamatan", params));
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
  const params = profilDesaSearchParams(opts);
  const res = await fetchPublicApi(profilDesaApiPath("desa", params));
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
      <div className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
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
        <h3 className={cn("mb-2 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
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
          <MetricCard
            label={t("kkLaki")}
            value={metrics.kk_laki_laki}
            unknown={unknown}
            tone="info"
          />
          <MetricCard
            label={t("kkPerempuan")}
            value={metrics.kk_perempuan}
            unknown={unknown}
            tone="info"
          />
          <MetricCard label={t("bayi")} value={metrics.bayi_0_1} unknown={unknown} tone="info" />
          <MetricCard
            label={t("balita")}
            value={metrics.balita_1_4}
            unknown={unknown}
            tone="info"
          />
          <MetricCard label={t("anak")} value={metrics.anak_5_12} unknown={unknown} tone="info" />
          <MetricCard
            label={t("remaja")}
            value={metrics.remaja_13_17}
            unknown={unknown}
            tone="info"
          />
          <MetricCard
            label={t("dewasa")}
            value={metrics.dewasa_18_59}
            unknown={unknown}
            tone="info"
          />
          <MetricCard
            label={t("lansia")}
            value={metrics.lansia_60_plus}
            unknown={unknown}
            tone="info"
          />
          <MetricCard
            label={t("disabilitas")}
            value={metrics.penyandang_disabilitas}
            unknown={unknown}
            tone="info"
          />
        </div>
      </section>
      <section>
        <h3 className={cn("mb-2 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
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
        <h3 className={cn("mb-2 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
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
    <Chip tone={badgeTone(badge)} className={cn("px-2.5 py-0.5", TYPE_FLOOR_CLASS)}>
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

function Breadcrumb({
  view,
  reached,
  onGo,
}: {
  view: AreaProfilView;
  reached: { kecamatan: boolean; desa: boolean };
  onGo: (next: AreaProfilView) => void;
}) {
  const t = useTranslations("profilDesa");
  const crumbs: { id: AreaProfilView; label: string }[] = [
    { id: "kabupaten", label: t("crumbKab") },
    { id: "kecamatan", label: t("crumbKec") },
    { id: "desa", label: t("crumbDesa") },
  ];
  return (
    <nav aria-label={t("crumbKab")}>
      <ol className={cn("mt-0.5 flex flex-wrap items-center gap-x-1 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
        {crumbs.map((crumb, index) => {
          const enabled = areaProfilBreadcrumbEnabled(view, crumb.id, reached);
          const target = areaProfilBreadcrumbTarget(view, crumb.id, reached);
          const current = crumb.id === view;
          return (
            <li key={crumb.id} className="flex items-center gap-x-1">
              {index > 0 ? <span aria-hidden>{t("locationSep")}</span> : null}
              {target ? (
                <button
                  type="button"
                  className="text-[var(--text)] underline-offset-2 hover:underline"
                  onClick={() => onGo(target)}
                >
                  {crumb.label}
                </button>
              ) : (
                <span
                  className={cn(
                    current ? "font-medium text-[var(--text)]" : "",
                    !enabled ? "opacity-50" : ""
                  )}
                  aria-current={current ? "page" : undefined}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function ListRow({
  title,
  subtitle,
  badge,
  highlighted,
  onClick,
}: {
  title: string;
  subtitle: string;
  badge: ImpactBadge;
  highlighted: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="map-option w-full"
        data-active={highlighted ? "true" : "false"}
      >
        <span className="min-w-0 flex-1 text-left">
          <span className="block truncate font-medium">{title}</span>
          <span className={cn("block text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {subtitle}
          </span>
        </span>
        <BadgeChip badge={badge} />
      </button>
    </li>
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
  const [view, setView] = useState<AreaProfilView>(AREA_PROFIL_INITIAL_VIEW);
  const [activeKecamatan, setActiveKecamatan] = useState<KecamatanListItem | null>(
    null
  );
  const [activeDesa, setActiveDesa] = useState<DesaListItem | null>(null);

  useEffect(() => {
    setView(areaProfilViewOnOpen(selection));
    setActiveKecamatan(null);
    setActiveDesa(null);
  }, [selection]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const kabName = kabupatenNameFromSelection(selection);
  const kabQuery = useQuery({
    queryKey: qk.profilKabupaten({
      kabupaten: kabName || undefined,
      kodeKabupaten: selection.kodeKabupaten,
    }),
    queryFn: () => fetchKabupaten(selection),
    enabled: Boolean(kabName || selection.kodeKabupaten),
  });

  const kecamatanName = activeKecamatan?.kecamatan || selection.kecamatan;
  const kecQuery = useQuery({
    queryKey: qk.profilKecamatan({
      kabupaten: kabName || selection.kabupaten,
      kecamatan: kecamatanName,
      kodeKecamatan: activeKecamatan?.kode_kecamatan ?? selection.kodeKecamatan,
    }),
    queryFn: () =>
      fetchKecamatan({
        kabupaten: kabName || selection.kabupaten,
        kecamatan: kecamatanName,
        kodeKecamatan:
          activeKecamatan?.kode_kecamatan ?? selection.kodeKecamatan,
      }),
    enabled:
      (view === "kecamatan" || view === "desa") &&
      Boolean(
        kecamatanName ||
          activeKecamatan?.kode_kecamatan ||
          selection.kodeKecamatan
      ),
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
        kabupaten: activeDesa?.kabupaten ?? kabName ?? selection.kabupaten,
        kecamatan: activeDesa?.kecamatan ?? kecamatanName,
      }),
    enabled: view === "desa" && !!activeDesa,
  });

  const kab = kabQuery.data;
  const kec = kecQuery.data;
  const title =
    view === "desa"
      ? (desaQuery.data?.title ?? activeDesa?.nama ?? selection.name)
      : view === "kecamatan"
        ? (kec?.title ?? activeKecamatan?.kecamatan ?? selection.kecamatan)
        : (kab?.title ?? kabName);
  const badge: ImpactBadge | null =
    view === "desa"
      ? (desaQuery.data?.badge ?? activeDesa?.badge ?? null)
      : view === "kecamatan"
        ? (kec?.badge ?? activeKecamatan?.badge ?? null)
        : (kab?.badge ?? null);
  const desaCount =
    view === "desa" ? 0 : view === "kecamatan" ? (kec?.desa_count ?? 0) : (kab?.desa_count ?? 0);
  const kicker =
    view === "desa"
      ? t("desaLabel")
      : view === "kecamatan"
        ? t("kecamatanLabel")
        : t("kabupatenLabel");
  const reached = {
    kecamatan: !!activeKecamatan,
    desa: !!activeDesa,
  };
  const showClickedHint =
    Boolean(selection.name) &&
    view !== "desa" &&
    selection.name !== kabName &&
    selection.name !== selection.kecamatan &&
    selection.level !== "kab" &&
    selection.level !== "kabupaten";

  const goBack = () => {
    const next = areaProfilBack(view);
    if (next === "close") {
      onClose();
      return;
    }
    setView(next);
  };

  const openKecamatan = (item: KecamatanListItem) => {
    setActiveKecamatan(item);
    setActiveDesa(null);
    setView("kecamatan");
  };

  const openDesa = (item: DesaListItem) => {
    setActiveDesa(item);
    setView("desa");
  };

  const loading =
    view === "kabupaten"
      ? kabQuery.isLoading
      : view === "kecamatan"
        ? kecQuery.isLoading
        : desaQuery.isLoading;
  const errored =
    view === "kabupaten"
      ? kabQuery.isError
      : view === "kecamatan"
        ? kecQuery.isError
        : desaQuery.isError;

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
            <div className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
              {kicker}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-semibold tracking-tight">{title}</h2>
              {badge ? <BadgeChip badge={badge} /> : null}
            </div>
            <Breadcrumb view={view} reached={reached} onGo={setView} />
            {desaCount > 0 ? (
              <p className="mt-0.5 truncate text-xs text-[var(--text-dim)]">
                {t("desaCount", { count: desaCount })}
              </p>
            ) : null}
            {showClickedHint ? (
              <p className={cn("mt-0.5 truncate text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
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
          {loading ? (
            <p className="py-8 text-center text-sm text-[var(--text-dim)]">{t("loading")}</p>
          ) : errored ? (
            <p className="py-8 text-center text-sm text-[var(--danger)]">{t("error")}</p>
          ) : view === "kabupaten" ? (
            kab ? (
              <div className="space-y-4">
                <MetricSections metrics={kab.metrics} />
                <section>
                  <h3 className={cn("mb-2 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
                    {t("kecamatanLabel")}
                  </h3>
                  {kab.kecamatan_list.length > 0 ? (
                    <ul className="space-y-1.5">
                      {kab.kecamatan_list.map((item) => {
                        const highlighted =
                          item.kode_kecamatan === selection.kodeKecamatan ||
                          item.kecamatan.toLowerCase() ===
                            selection.kecamatan.toLowerCase();
                        return (
                          <ListRow
                            key={item.kode_kecamatan || item.kecamatan}
                            title={item.kecamatan}
                            subtitle={
                              item.desa_count > 0
                                ? t("desaCount", { count: item.desa_count })
                                : item.total_rumah_rusak != null
                                  ? t("damageCount", {
                                      count: formatMetricId(
                                        item.total_rumah_rusak,
                                        t("unknown")
                                      ),
                                    })
                                  : t("unknown")
                            }
                            badge={item.badge}
                            highlighted={highlighted}
                            onClick={() => openKecamatan(item)}
                          />
                        );
                      })}
                    </ul>
                  ) : (
                    <EmptyState />
                  )}
                </section>
              </div>
            ) : (
              <EmptyState />
            )
          ) : view === "kecamatan" ? (
            kec ? (
              <div className="space-y-4">
                <MetricSections metrics={kec.metrics} />
                <section>
                  <h3 className={cn("mb-2 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
                    {t("desaLabel")}
                  </h3>
                  {kec.desa.length > 0 ? (
                    <ul className="space-y-1.5">
                      {kec.desa.map((item) => {
                        const highlighted =
                          item.kode === selection.kodeDesa ||
                          item.nama.toLowerCase() === selection.name.toLowerCase();
                        return (
                          <ListRow
                            key={item.id || item.kode || item.nama}
                            title={item.nama}
                            subtitle={
                              item.total_rumah_rusak != null
                                ? t("damageCount", {
                                    count: formatMetricId(
                                      item.total_rumah_rusak,
                                      t("unknown")
                                    ),
                                  })
                                : t("unknown")
                            }
                            badge={item.badge}
                            highlighted={highlighted}
                            onClick={() => openDesa(item)}
                          />
                        );
                      })}
                    </ul>
                  ) : (
                    <EmptyState />
                  )}
                </section>
              </div>
            ) : (
              <EmptyState />
            )
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
        </footer>
      </aside>
    </div>
  );
}
