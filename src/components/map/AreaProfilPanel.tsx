"use client";

import { Fragment, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { ArrowLeft, Home, X } from "lucide-react";
import {
  AREA_PROFIL_INITIAL_VIEW,
  areaProfilBack,
  areaProfilBreadcrumbLevels,
  areaProfilBreadcrumbTarget,
  areaProfilViewOnOpen,
  kabupatenNameFromSelection,
  hasKabupatenQuery,
  profilDesaApiPath,
  profilDesaLookupParams,
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
  sortKecamatanListItems,
  type VillageClickSelection,
} from "@/lib/profil-desa";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { TYPE_FLOOR_CLASS, TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { requestOpenTanggapi } from "@/lib/panduan/open-tanggapi";
import {
  buildTanggapiSeedPrompt,
  shouldShowTanggapiCta,
} from "@/lib/tanggapi-distribusi";
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
  kode?: string | null;
  nama?: string;
  kabupaten?: string;
  kecamatan?: string;
}): Promise<DesaProfilResponse | null> {
  const params = profilDesaLookupParams(opts);
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
      <div className={cn("text-muted-foreground", TYPE_KICKER_CLASS)}>
        {label}
      </div>
      <div
        className={`mt-1 font-semibold tabular-nums ${
          isUnknown ? "text-sm text-muted-foreground" : `text-lg ${CARD_VALUE[tone]}`
        }`}
      >
        {formatMetricId(value, unknown)}
      </div>
    </div>
  );
}

function MetricSections({
  metrics,
  leadWith = "populasi",
}: {
  metrics: MetricBundle;
  leadWith?: "populasi" | "kerusakan";
}) {
  const t = useTranslations("profilDesa");
  const unknown = t("unknown");
  const populasi = (
      <section>
        <h3 className={cn("mb-2 text-muted-foreground", TYPE_KICKER_CLASS)}>
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
  );
  const korban = (
      <section>
        <h3 className={cn("mb-2 text-muted-foreground", TYPE_KICKER_CLASS)}>
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
  );
  const kerusakan = (
      <section>
        <h3 className={cn("mb-2 text-muted-foreground", TYPE_KICKER_CLASS)}>
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
  );
  return (
    <div className="flex flex-col gap-4">
      {leadWith === "kerusakan" ? (
        <>
          {kerusakan}
          {populasi}
          {korban}
        </>
      ) : (
        <>
          {populasi}
          {korban}
          {kerusakan}
        </>
      )}
    </div>
  );
}

function badgeClass(tone: ReturnType<typeof badgeTone>) {
  if (tone === "danger") {
    return "border-transparent bg-destructive/15 text-destructive";
  }
  if (tone === "ok") {
    return "border-transparent bg-primary/15 text-primary";
  }
  return "border-border bg-muted text-foreground";
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
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2.5 py-0.5 font-medium",
        TYPE_FLOOR_CLASS,
        badgeClass(badgeTone(badge))
      )}
    >
      {label}
    </Badge>
  );
}

function EmptyState() {
  const t = useTranslations("profilDesa");
  return (
    <div className="rounded-xl border border-dashed border-border px-3 py-6 text-center">
      <p className="text-sm font-medium">{t("empty")}</p>
      <p className={cn("mt-1 text-muted-foreground", TYPE_FLOOR_CLASS)}>
        {t("emptyHint")}
      </p>
    </div>
  );
}

function ProfilBreadcrumb({
  view,
  onGo,
}: {
  view: AreaProfilView;
  onGo: (next: AreaProfilView) => void;
}) {
  const t = useTranslations("profilDesa");
  const labels: Record<AreaProfilView, string> = {
    kabupaten: t("crumbKab"),
    kecamatan: t("crumbKec"),
    desa: t("crumbDesa"),
  };
  const levels = areaProfilBreadcrumbLevels(view);
  return (
    <Breadcrumb aria-label={t("crumbKab")}>
      <BreadcrumbList
        className={cn(
          "mt-0.5 gap-1 text-muted-foreground sm:gap-1",
          TYPE_FLOOR_CLASS
        )}
      >
        {levels.map((id, index) => {
          const target = areaProfilBreadcrumbTarget(view, id);
          return (
            <Fragment key={id}>
              {index > 0 ? (
                <BreadcrumbSeparator>{t("locationSep")}</BreadcrumbSeparator>
              ) : null}
              <BreadcrumbItem className="gap-1">
                {target ? (
                  <BreadcrumbLink asChild>
                    <button
                      type="button"
                      className="text-foreground underline-offset-2 hover:underline"
                      onClick={() => onGo(target)}
                    >
                      {labels[id]}
                    </button>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="font-medium text-foreground">
                    {labels[id]}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
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
          <span className={cn("block text-muted-foreground", TYPE_FLOOR_CLASS)}>
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
  variant = "desa",
  onClose,
}: {
  selection: VillageClickSelection;
  variant?: "desa" | "r3p";
  onClose: () => void;
}) {
  const t = useTranslations("profilDesa");
  const tPanduan = useTranslations("panduan");
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
    enabled: hasKabupatenQuery(profilKabupatenSearchParams(selection)),
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
  const levelKicker =
    view === "desa"
      ? t("desaLabel")
      : view === "kecamatan"
        ? t("kecamatanLabel")
        : t("kabupatenLabel");
  const kicker = variant === "r3p" ? `${t("r3pKicker")} · ${levelKicker}` : levelKicker;
  const metricLead = variant === "r3p" ? "kerusakan" : "populasi";
  const showClickedHint = Boolean(selection.name) && view !== "desa";

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
        <header className="flex items-start gap-3 px-4 py-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-orange-500/15 text-orange-500"
            aria-hidden
          >
            <Home size={20} strokeWidth={2.25} />
          </span>
          <div className="min-w-0 flex-1">
            <div className={cn("text-muted-foreground", TYPE_KICKER_CLASS)}>
              {kicker}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-base font-semibold tracking-tight">{title}</h2>
              {badge ? <BadgeChip badge={badge} /> : null}
            </div>
            <ProfilBreadcrumb view={view} onGo={setView} />
            {showClickedHint ? (
              <p className={cn("mt-0.5 truncate text-muted-foreground", TYPE_FLOOR_CLASS)}>
                {t("clickedHint", { name: selection.name })}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            aria-label={t("close")}
          >
            <X />
          </Button>
        </header>
        <Separator />

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-4 py-3">
          {loading ? (
            <div
              className="grid grid-cols-2 gap-2"
              aria-busy="true"
              aria-label={t("loading")}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[4.25rem] rounded-xl" />
              ))}
            </div>
          ) : errored ? (
            <p className="py-8 text-center text-sm text-destructive">{t("error")}</p>
          ) : view === "kabupaten" ? (
            kab ? (
              <div className="flex flex-col gap-4">
                <MetricSections metrics={kab.metrics} leadWith={metricLead} />
                <Separator />
                <section>
                  <h3 className={cn("mb-2 text-muted-foreground", TYPE_KICKER_CLASS)}>
                    {t("kecamatanLabel")}
                  </h3>
                  {kab.kecamatan_list.length > 0 ? (
                    <ul className="flex flex-col gap-1.5">
                      {sortKecamatanListItems(kab.kecamatan_list).map((item) => {
                        const highlighted =
                          item.kode_kecamatan === selection.kodeKecamatan ||
                          item.kecamatan.toLowerCase() ===
                            selection.kecamatan.toLowerCase();
                        const rusak =
                          item.total_rumah_rusak != null
                            ? t("damageCount", {
                                count: formatMetricId(
                                  item.total_rumah_rusak,
                                  t("unknown")
                                ),
                              })
                            : t("unknown");
                        return (
                          <ListRow
                            key={item.kode_kecamatan || item.kecamatan}
                            title={item.kecamatan}
                            subtitle={`${t("desaCount", { count: item.desa_count })} ${t("locationSep")} ${rusak}`}
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
              <div className="flex flex-col gap-4">
                <MetricSections metrics={kec.metrics} leadWith={metricLead} />
                <Separator />
                <section>
                  <h3 className={cn("mb-2 text-muted-foreground", TYPE_KICKER_CLASS)}>
                    {t("desaLabel")}
                  </h3>
                  {kec.desa.length > 0 ? (
                    <ul className="flex flex-col gap-1.5">
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
            <MetricSections metrics={desaQuery.data.metrics} leadWith={metricLead} />
          ) : (
            <EmptyState />
          )}
          </div>
        </ScrollArea>
        <Separator />

        <footer className="flex items-center gap-2 px-4 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
            data-icon="inline-start"
            onClick={goBack}
          >
            <ArrowLeft />
            {t("back")}
          </Button>
          {shouldShowTanggapiCta({
            view,
            kodeDesa: desaQuery.data?.kode_desa ?? activeDesa?.kode,
          }) ? (
            <Button
              type="button"
              variant="accent"
              size="sm"
              className={cn("rounded-xl text-[var(--accent-fg)]", TYPE_FLOOR_CLASS)}
              onClick={() => {
                const seed = buildTanggapiSeedPrompt({
                  kode_desa: desaQuery.data?.kode_desa ?? activeDesa?.kode,
                  nama: desaQuery.data?.title ?? activeDesa?.nama,
                  kecamatan: desaQuery.data?.kecamatan ?? activeDesa?.kecamatan,
                  kabupaten:
                    desaQuery.data?.kabupaten ?? activeDesa?.kabupaten ?? kabName,
                  kode_kecamatan: desaQuery.data?.kode_kecamatan,
                  kode_kabupaten: desaQuery.data?.kode_kabupaten,
                });
                requestOpenTanggapi(seed);
              }}
            >
              {tPanduan("askHero")}
            </Button>
          ) : null}
        </footer>
      </aside>
    </div>
  );
}
