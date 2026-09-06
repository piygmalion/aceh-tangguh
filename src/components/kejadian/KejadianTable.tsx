"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Download, MapPin, Search } from "lucide-react";
import { AnalisisTeaser } from "@/components/analisis/AnalisisTeaser";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { StatusChip } from "@/components/ui/StatusChip";
import { Link } from "@/i18n/routing";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import { formatStatusLabel, normalizeStatus } from "@/lib/status-vocab";
import type { KejadianListResult, KejadianRow } from "@/lib/kejadian-types";
import { TYPE_FLOOR_CLASS, TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

type Filters = {
  q: string;
  jenis: string;
  kabupaten: string;
  kecamatan: string;
  status: string;
  from: string;
  to: string;
  page: number;
  pageSize: number;
};

const DEFAULT_FILTERS: Filters = {
  q: "",
  jenis: "",
  kabupaten: "",
  kecamatan: "",
  status: "",
  from: "",
  to: "",
  page: 1,
  pageSize: 10,
};

function buildQuery(f: Filters, overrides?: Partial<Filters>): string {
  const merged = { ...f, ...overrides };
  const sp = new URLSearchParams();
  if (merged.q.trim()) sp.set("q", merged.q.trim());
  if (merged.jenis) sp.set("jenis", merged.jenis);
  if (merged.kabupaten) sp.set("kabupaten", merged.kabupaten);
  if (merged.kecamatan) sp.set("kecamatan", merged.kecamatan);
  if (merged.status) sp.set("status", merged.status);
  if (merged.from) sp.set("from", merged.from);
  if (merged.to) sp.set("to", merged.to);
  sp.set("page", String(merged.page));
  sp.set("pageSize", String(merged.pageSize));
  return sp.toString();
}

async function fetchKejadian(qs: string): Promise<KejadianListResult> {
  const res = await fetchPublicApi(`/api/kejadian?${qs}`);
  if (!res.ok) throw new Error("kejadian fetch failed");
  return res.json();
}

function truncate(text: string | undefined, max = 120): string {
  if (!text) return "—";
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trimEnd()}…`;
}

function formatNumber(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toLocaleString("id-ID");
}

function hasCoords(row: KejadianRow): boolean {
  const lat = row.arah_di_peta?.latitude;
  const lng = row.arah_di_peta?.longitude;
  return typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng);
}

function escapeCsv(value: unknown): string {
  const s = value == null ? "" : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function rowsToCsv(rows: KejadianRow[]): string {
  const headers = [
    "id",
    "jenis_bencana",
    "hari_tanggal",
    "jam",
    "kabupaten",
    "kecamatan",
    "desa",
    "lokasi",
    "penyebab",
    "kronologi",
    "status_proses",
    "pengungsi",
    "jiwa_terdampak",
    "kk_terdampak",
    "meninggal",
    "hilang",
    "latitude",
    "longitude",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.jenis_bencana,
        r.hari_tanggal,
        r.jam ?? "",
        r.lokasi?.kabupaten ?? "",
        r.lokasi?.kecamatan ?? "",
        r.lokasi?.desa ?? "",
        r.lokasi?.teks_lengkap ?? "",
        r.penyebab ?? "",
        r.kronologi ?? "",
        normalizeStatus(r.penanganan?.status_proses, "disasterEvents").key,
        r.pengungsi ?? "",
        r.jiwa_terdampak ?? "",
        r.kk_terdampak ?? "",
        r.jumlah_korban?.meninggal ?? "",
        r.jumlah_korban?.hilang ?? "",
        r.arah_di_peta?.latitude ?? "",
        r.arah_di_peta?.longitude ?? "",
      ]
        .map(escapeCsv)
        .join(",")
    );
  }
  return lines.join("\n");
}

function rowsToKml(rows: KejadianRow[]): string {
  const placemarks = rows
    .filter(hasCoords)
    .map((r) => {
      const lat = r.arah_di_peta!.latitude!;
      const lng = r.arah_di_peta!.longitude!;
      const name = `${r.jenis_bencana} — ${r.hari_tanggal}`.replace(/&/g, "&amp;");
      const desc = (r.kronologi || r.penyebab || "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
      return `  <Placemark>
    <name>${name}</name>
    <description>${desc}</description>
    <Point><coordinates>${lng},${lat},0</coordinates></Point>
  </Placemark>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>Kejadian Bencana Aceh</name>
${placemarks}
</Document>
</kml>
`;
}

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors [color-scheme:inherit] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function KejadianTable() {
  const t = useTranslations("dataBencana");
  const tStatus = useTranslations("statusVocab");
  const [draft, setDraft] = useState<Filters>(DEFAULT_FILTERS);
  const [applied, setApplied] = useState<Filters>(DEFAULT_FILTERS);
  const [detail, setDetail] = useState<KejadianRow | null>(null);
  const [exporting, setExporting] = useState(false);

  const qs = useMemo(() => buildQuery(applied), [applied]);
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: qk.kejadian({
      q: applied.q,
      jenis: applied.jenis,
      kabupaten: applied.kabupaten,
      kecamatan: applied.kecamatan,
      status: applied.status,
      from: applied.from,
      to: applied.to,
      page: applied.page,
      pageSize: applied.pageSize,
    }),
    queryFn: () => fetchKejadian(qs),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const analysisFilters = useMemo(
    () => ({
      jenis: applied.jenis,
      kabupaten: applied.kabupaten,
      kecamatan: applied.kecamatan,
      status: applied.status,
      from: applied.from,
      to: applied.to,
    }),
    [
      applied.jenis,
      applied.kabupaten,
      applied.kecamatan,
      applied.status,
      applied.from,
      applied.to,
    ]
  );

  const facets = data?.facets;
  const kecamatanOptions = useMemo(() => {
    if (!facets) return [] as string[];
    if (!draft.kabupaten) return facets.kecamatan;
    return facets.kecamatanByKabupaten?.[draft.kabupaten] ?? facets.kecamatan;
  }, [facets, draft.kabupaten]);

  const applyFilters = useCallback(() => {
    setApplied({ ...draft, page: 1 });
  }, [draft]);

  const resetFilters = useCallback(() => {
    setDraft(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
  }, []);

  const setPage = (page: number) => setApplied((f) => ({ ...f, page }));
  const setPageSize = (pageSize: number) =>
    setApplied((f) => ({ ...f, pageSize, page: 1 }));

  const total = data?.total ?? 0;
  const page = data?.page ?? applied.page;
  const pageSize = data?.pageSize ?? applied.pageSize;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const fromIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toIdx = Math.min(page * pageSize, total);

  const exportFiltered = async (format: "csv" | "json" | "kml") => {
    setExporting(true);
    try {
      const exportQs = buildQuery(applied, { page: 1, pageSize: 100 });
      // Walk pages to collect all filtered rows (pageSize max 100)
      const first = await fetchKejadian(exportQs);
      const all: KejadianRow[] = [...first.items];
      const totalPages = Math.max(1, Math.ceil(first.total / 100));
      for (let p = 2; p <= totalPages; p++) {
        const chunk = await fetchKejadian(
          buildQuery(applied, { page: p, pageSize: 100 })
        );
        all.push(...chunk.items);
      }
      const stamp = new Date().toISOString().slice(0, 10);
      if (format === "csv") {
        downloadBlob(
          `kejadian-bencana-${stamp}.csv`,
          new Blob([rowsToCsv(all)], { type: "text/csv;charset=utf-8" })
        );
      } else if (format === "json") {
        downloadBlob(
          `kejadian-bencana-${stamp}.json`,
          new Blob([JSON.stringify({ items: all, total: all.length }, null, 2)], {
            type: "application/json",
          })
        );
      } else {
        downloadBlob(
          `kejadian-bencana-${stamp}.kml`,
          new Blob([rowsToKml(all)], {
            type: "application/vnd.google-earth.kml+xml",
          })
        );
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <AnalisisTeaser filters={analysisFilters} />

      <GlassPanel className="p-4 md:p-5">
        <div className={cn("mb-3 text-muted-foreground", TYPE_KICKER_CLASS)}>
          {t("filters")}
        </div>
        <FieldGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <Field>
            <FieldLabel htmlFor="kejadian-from">{t("from")}</FieldLabel>
            <Input
              id="kejadian-from"
              type="date"
              className="[color-scheme:inherit]"
              value={draft.from}
              onChange={(e) => setDraft((f) => ({ ...f, from: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="kejadian-to">{t("to")}</FieldLabel>
            <Input
              id="kejadian-to"
              type="date"
              className="[color-scheme:inherit]"
              value={draft.to}
              onChange={(e) => setDraft((f) => ({ ...f, to: e.target.value }))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="kejadian-kabupaten">{t("kabupaten")}</FieldLabel>
            <select
              id="kejadian-kabupaten"
              className={selectClassName}
              value={draft.kabupaten}
              onChange={(e) =>
                setDraft((f) => ({
                  ...f,
                  kabupaten: e.target.value,
                  kecamatan: "",
                }))
              }
            >
              <option value="">{t("all")}</option>
              {(facets?.kabupaten ?? []).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="kejadian-kecamatan">{t("kecamatan")}</FieldLabel>
            <select
              id="kejadian-kecamatan"
              className={selectClassName}
              value={draft.kecamatan}
              onChange={(e) =>
                setDraft((f) => ({ ...f, kecamatan: e.target.value }))
              }
            >
              <option value="">{t("all")}</option>
              {kecamatanOptions.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="kejadian-jenis">{t("jenis")}</FieldLabel>
            <select
              id="kejadian-jenis"
              className={selectClassName}
              value={draft.jenis}
              onChange={(e) => setDraft((f) => ({ ...f, jenis: e.target.value }))}
            >
              <option value="">{t("all")}</option>
              {(facets?.jenis ?? []).map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </Field>
          <Field>
            <FieldLabel htmlFor="kejadian-status">{t("status")}</FieldLabel>
            <select
              id="kejadian-status"
              className={selectClassName}
              value={draft.status}
              onChange={(e) => setDraft((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="">{t("all")}</option>
              {(facets?.status ?? []).map((k) => (
                <option key={k} value={k}>
                  {formatStatusLabel(normalizeStatus(k, "disasterEvents"), (slug) =>
                    tStatus(slug)
                  )}
                </option>
              ))}
            </select>
          </Field>
          <Field className="sm:col-span-2 lg:col-span-1 xl:col-span-1">
            <FieldLabel htmlFor="kejadian-q">{t("search")}</FieldLabel>
            <Input
              id="kejadian-q"
              type="search"
              placeholder={t("searchPlaceholder")}
              value={draft.q}
              onChange={(e) => setDraft((f) => ({ ...f, q: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
            />
          </Field>
        </FieldGroup>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" onClick={applyFilters} data-icon="inline-start">
            <Search />
            {t("search")}
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={resetFilters}>
            {t("reset")}
          </Button>
        </div>
      </GlassPanel>

      <GlassPanel className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--glass-border)] px-4 py-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{t("pageSize")}</span>
            <select
              className={`${selectClassName} w-auto`}
              value={applied.pageSize}
              onChange={(e) => setPageSize(Number(e.target.value))}
              aria-label={t("pageSize")}
            >
              {[10, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>{t("entries")}</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("export")}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={exporting || total === 0}
              data-icon="inline-start"
              onClick={() => exportFiltered("csv")}
            >
              {exporting ? <Spinner /> : <Download />}
              {t("exportCsv")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={exporting || total === 0}
              onClick={() => exportFiltered("json")}
            >
              {t("exportJson")}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={exporting || total === 0}
              onClick={() => exportFiltered("kml")}
            >
              {t("exportKml")}
            </Button>
            {exporting ? (
              <span className="text-xs text-[var(--text-dim)]">{t("exporting")}</span>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[960px] w-full border-collapse text-left text-sm">
            <thead>
              <tr className={cn("border-b border-[var(--glass-border)] bg-[var(--bg-muted)]/40 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
                <th className="px-3 py-3 font-semibold">{t("cols.no")}</th>
                <th className="px-3 py-3 font-semibold">{t("cols.bencana")}</th>
                <th className="px-3 py-3 font-semibold">{t("cols.waktu")}</th>
                <th className="px-3 py-3 font-semibold">{t("cols.lokasi")}</th>
                <th className="px-3 py-3 font-semibold">{t("cols.penyebab")}</th>
                <th className="px-3 py-3 font-semibold">{t("cols.kronologi")}</th>
                <th className="px-3 py-3 font-semibold">{t("cols.pengungsi")}</th>
                <th className="px-3 py-3 font-semibold">{t("cols.foto")}</th>
                <th className="px-3 py-3 font-semibold">{t("cols.detail")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && !data ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-[var(--text-dim)]">
                    {t("loading")}
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-[var(--danger)]">
                    {t("error")}
                  </td>
                </tr>
              ) : !data?.items.length ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-[var(--text-dim)]">
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                data.items.map((row, idx) => {
                  const no = (page - 1) * pageSize + idx + 1;
                  const fotoUrl = row.foto?.url?.trim();
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--glass-border)]/70 align-top transition hover:bg-[var(--primary-dim)]/40"
                    >
                      <td className="px-3 py-3 tabular-nums text-[var(--text-dim)]">
                        {no}
                      </td>
                      <td className="px-3 py-3 font-medium">
                        <div>{row.jenis_bencana}</div>
                        <div className="mt-1.5">
                          <StatusChip
                            raw={row.penanganan?.status_proses}
                            layer="disasterEvents"
                            className={cn("px-2 py-0.5", TYPE_FLOOR_CLASS)}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <div>{row.hari_tanggal}</div>
                        {row.jam && row.jam !== "-" ? (
                          <div className="text-xs text-[var(--text-dim)]">{row.jam}</div>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 max-w-[14rem]">
                        <div>{row.lokasi?.teks_lengkap || "—"}</div>
                        {hasCoords(row) ? (
                          <a
                            href={
                              row.arah_di_peta?.url_google_maps ||
                              `https://www.google.com/maps?q=${row.arah_di_peta?.latitude},${row.arah_di_peta?.longitude}`
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--primary)] hover:underline"
                          >
                            <MapPin size={12} />
                            {row.arah_di_peta?.latitude?.toFixed(4)},{" "}
                            {row.arah_di_peta?.longitude?.toFixed(4)}
                          </a>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 max-w-[12rem] text-[var(--text-dim)]">
                        {truncate(row.penyebab, 80)}
                      </td>
                      <td className="px-3 py-3 max-w-[16rem] text-[var(--text-dim)]">
                        {truncate(row.kronologi, 120)}
                      </td>
                      <td className="px-3 py-3 tabular-nums">
                        {formatNumber(row.pengungsi)}
                      </td>
                      <td className="px-3 py-3">
                        {fotoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={fotoUrl}
                            alt={row.foto?.keterangan || row.jenis_bencana}
                            className="h-12 w-16 rounded-lg object-cover"
                          />
                        ) : (
                          <span className="text-[var(--text-dim)]">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDetail(row)}
                        >
                          {t("cols.detail")}
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm text-[var(--text-dim)]">
          <div>
            {t("showing", { from: fromIdx, to: toIdx, total })}
            {isFetching && !isLoading ? (
              <span className="ml-2 opacity-60">…</span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              {t("prev")}
            </Button>
            <span>{t("page", { page, pages })}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={page >= pages}
              onClick={() => setPage(page + 1)}
            >
              {t("next")}
            </Button>
          </div>
        </div>
      </GlassPanel>

      <Dialog open={detail != null} onOpenChange={(open) => { if (!open) setDetail(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[40rem]">
          {detail ? (
            <>
              <DialogHeader className="flex flex-col gap-1.5">
                <DialogTitle>{t("detail.title")}</DialogTitle>
                <DialogDescription className="sr-only">{detail.jenis_bencana}</DialogDescription>
              </DialogHeader>

            <dl className="grid gap-3 text-sm sm:grid-cols-[9rem_1fr]">
              <dt className="font-medium text-[var(--text-dim)]">{t("detail.id")}</dt>
              <dd className="font-mono text-xs">{detail.id}</dd>

              <dt className="font-medium text-[var(--text-dim)]">{t("detail.jenis")}</dt>
              <dd>{detail.jenis_bencana}</dd>

              <dt className="font-medium text-[var(--text-dim)]">{t("detail.waktu")}</dt>
              <dd>
                {detail.hari_tanggal}
                {detail.jam && detail.jam !== "-" ? ` · ${detail.jam}` : ""}
              </dd>

              <dt className="font-medium text-[var(--text-dim)]">{t("detail.lokasi")}</dt>
              <dd>{detail.lokasi?.teks_lengkap || "—"}</dd>

              <dt className="font-medium text-[var(--text-dim)]">{t("detail.penyebab")}</dt>
              <dd className="leading-relaxed">{detail.penyebab || "—"}</dd>

              <dt className="font-medium text-[var(--text-dim)]">{t("detail.kronologi")}</dt>
              <dd className="leading-relaxed whitespace-pre-wrap">
                {detail.kronologi || "—"}
              </dd>

              <dt className="font-medium text-[var(--text-dim)]">{t("detail.korban")}</dt>
              <dd>
                {t("detail.meninggal")}: {formatNumber(detail.jumlah_korban?.meninggal)}
                {" · "}
                {t("detail.hilang")}: {formatNumber(detail.jumlah_korban?.hilang)}
                {" · "}
                {t("detail.lukaBerat")}: {formatNumber(detail.jumlah_korban?.luka_berat)}
                {" · "}
                {t("detail.lukaRingan")}: {formatNumber(detail.jumlah_korban?.luka_ringan)}
              </dd>

              <dt className="font-medium text-[var(--text-dim)]">{t("detail.pengungsi")}</dt>
              <dd>{formatNumber(detail.pengungsi)}</dd>

              <dt className="font-medium text-[var(--text-dim)]">{t("detail.jiwa")}</dt>
              <dd>{formatNumber(detail.jiwa_terdampak)}</dd>

              <dt className="font-medium text-[var(--text-dim)]">{t("detail.kk")}</dt>
              <dd>{formatNumber(detail.kk_terdampak)}</dd>

              <dt className="font-medium text-[var(--text-dim)]">{t("detail.penanganan")}</dt>
              <dd className="leading-relaxed">
                {detail.penanganan?.langkah || "—"}
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-[var(--text-dim)]">
                    {t("detail.status")}:
                  </span>
                  <StatusChip
                    raw={detail.penanganan?.status_proses}
                    layer="disasterEvents"
                    className={cn("px-2 py-0.5", TYPE_FLOOR_CLASS)}
                  />
                </div>
              </dd>

              <dt className="font-medium text-[var(--text-dim)]">{t("detail.foto")}</dt>
              <dd>
                {detail.foto?.url?.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={detail.foto.url}
                    alt={detail.foto.keterangan || detail.jenis_bencana}
                    className="max-h-56 rounded-xl object-cover"
                  />
                ) : (
                  <span className="text-[var(--text-dim)]">{t("detail.noFoto")}</span>
                )}
                {detail.foto?.keterangan ? (
                  <div className="mt-1 text-xs text-[var(--text-dim)]">
                    {detail.foto.keterangan}
                  </div>
                ) : null}
              </dd>

              <dt className="font-medium text-[var(--text-dim)]">{t("detail.sumber")}</dt>
              <dd>
                {Array.isArray(detail.sumber_data) && detail.sumber_data.length ? (
                  <ul className="flex flex-col gap-1">
                    {detail.sumber_data.map((s) => (
                      <li key={s}>
                        {/^https?:\/\//i.test(s) ? (
                          <a
                            href={s}
                            target="_blank"
                            rel="noreferrer"
                            className="break-all text-[var(--primary)] hover:underline"
                          >
                            {s}
                          </a>
                        ) : (
                          s
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  "—"
                )}
              </dd>

              {hasCoords(detail) ? (
                <>
                  <dt className="font-medium text-[var(--text-dim)]">
                    {t("detail.koordinat")}
                  </dt>
                  <dd>
                    {detail.arah_di_peta?.latitude}, {detail.arah_di_peta?.longitude}
                    {" · "}
                    <a
                      href={
                        detail.arah_di_peta?.url_google_maps ||
                        `https://www.google.com/maps?q=${detail.arah_di_peta?.latitude},${detail.arah_di_peta?.longitude}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--primary)] hover:underline"
                    >
                      {t("detail.googleMaps")}
                    </a>
                  </dd>
                </>
              ) : null}
            </dl>

            {hasCoords(detail) ? (
              <div className="mt-2">
                <Button asChild data-icon="inline-start">
                  <Link
                    href={{
                      pathname: "/peta",
                      query: {
                        lat: String(detail.arah_di_peta!.latitude),
                        lng: String(detail.arah_di_peta!.longitude),
                        z: "11",
                        layers: "disasterEvents",
                      },
                    }}
                    onClick={() => setDetail(null)}
                  >
                    <MapPin />
                    {t("detail.lihatPeta")}
                  </Link>
                </Button>
              </div>
            ) : null}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
