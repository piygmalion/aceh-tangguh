"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Link } from "@/i18n/routing";
import {
  buildAncamanRiwayat,
  krbJenisToDisasterJenis,
  type AnalogRange,
} from "@/lib/analisis-ancaman";
import { fetchKrb } from "@/lib/krb-by-kab";
import type { KejadianAnalisisPayload } from "@/lib/kejadian-analisis";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import { kelasFill } from "@/lib/chart-colors";
import { TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

function analisisSearch(params: {
  jenis?: string;
  kabupaten?: string;
  from?: string;
  to?: string;
}): string {
  const sp = new URLSearchParams();
  if (params.jenis) sp.set("jenis", params.jenis);
  if (params.kabupaten) sp.set("kabupaten", params.kabupaten);
  if (params.from) sp.set("from", params.from);
  if (params.to) sp.set("to", params.to);
  return sp.toString();
}

async function fetchAnalisis(qs: string): Promise<KejadianAnalisisPayload> {
  const res = await fetchPublicApi(`/api/kejadian/analisis${qs ? `?${qs}` : ""}`);
  if (!res.ok) throw new Error("analisis");
  return res.json();
}

type IrbiRow = Record<string, unknown> & {
  kabupaten_kota?: string;
  kabupaten_kota_kode?: string;
};

type IrbiPayload = {
  kabupaten_kota: IrbiRow[];
};

async function fetchIrbi(): Promise<IrbiPayload> {
  const res = await fetchPublicApi("/api/irbi");
  if (!res.ok) throw new Error("irbi");
  return res.json();
}

function KelasChip({ kelas }: { kelas: string }) {
  if (!kelas) return null;
  return (
    <span
      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
      style={{ background: kelasFill(kelas) }}
    >
      {kelas}
    </span>
  );
}

function AnalogLine({
  label,
  range,
}: {
  label: string;
  range: AnalogRange | null;
}) {
  const t = useTranslations("analisisData");
  const locale = useLocale();
  const loc = locale === "id" ? "id-ID" : "en-US";
  if (!range) return null;
  return (
    <div className="text-sm">
      <span className="text-[var(--text-dim)]">{label}</span>
      {": "}
      {t("analogRange", {
        min: range.min.toLocaleString(loc),
        median: range.median.toLocaleString(loc),
        max: range.max.toLocaleString(loc),
      })}
    </div>
  );
}

export function AnalisisAncamanPanel({
  kab,
  ancaman,
  from,
  to,
}: {
  kab: string;
  ancaman: string;
  from: string;
  to: string;
}) {
  const t = useTranslations("analisisData");
  const ti = useTranslations("irbi");
  const locale = useLocale();
  const loc = locale === "id" ? "id-ID" : "en-US";
  const labels = useMemo(() => krbJenisToDisasterJenis(ancaman), [ancaman]);
  const historyJenis = labels[0] ?? "";

  const { data: irbi } = useQuery({
    queryKey: qk.irbi,
    queryFn: fetchIrbi,
    staleTime: 60_000,
  });
  const { data: krb } = useQuery({
    queryKey: qk.krb,
    queryFn: () => fetchKrb(),
    staleTime: 60_000,
  });

  const localQs = useMemo(
    () =>
      kab && historyJenis
        ? analisisSearch({
            jenis: historyJenis,
            kabupaten: kab,
            from,
            to,
          })
        : "",
    [kab, historyJenis, from, to]
  );
  const { data: localHistory } = useQuery({
    queryKey: qk.kejadianAnalisis({
      history: "local",
      jenis: historyJenis,
      kabupaten: kab,
      from,
      to,
    }),
    queryFn: () => fetchAnalisis(localQs),
    enabled: Boolean(localQs),
    staleTime: 30_000,
  });

  const provincialQs = useMemo(
    () =>
      historyJenis
        ? analisisSearch({ jenis: historyJenis, from, to })
        : "",
    [historyJenis, from, to]
  );
  const { data: provincialHistory } = useQuery({
    queryKey: qk.kejadianAnalisis({
      history: "provinsi",
      jenis: historyJenis,
      from,
      to,
    }),
    queryFn: () => fetchAnalisis(provincialQs),
    enabled: Boolean(provincialQs && kab && ancaman),
    staleTime: 30_000,
  });

  const historyPending = Boolean(localQs) && !localHistory;
  const analogPending =
    Boolean(kab && ancaman && historyJenis) && (!localHistory || !provincialHistory);

  const result = useMemo(() => {
    if (!irbi || !krb) return null;
    return buildAncamanRiwayat({
      kab,
      ancaman,
      irbi: irbi.kabupaten_kota,
      krb,
      history: {
        jumlahKejadian: localHistory?.total ?? 0,
        kejadianTerakhir: localHistory?.latestDate ?? localHistory?.sample[0]?.hari_tanggal ?? null,
        localImpacts: localHistory?.rumahImpacts ?? [],
        provincialImpacts: provincialHistory?.rumahImpacts ?? [],
      },
    });
  }, [irbi, krb, kab, ancaman, localHistory, provincialHistory]);

  const hazardKey = `hazard_${ancaman}` as
    | "hazard_banjir"
    | "hazard_gempabumi"
    | "hazard_tsunami"
    | "hazard_likuefaksi"
    | "hazard_tanah_longsor"
    | "hazard_kebakaran_hutan_lahan"
    | "hazard_cuaca_ekstrem"
    | "hazard_kekeringan"
    | "hazard_banjir_bandang"
    | "hazard_gelombang_ekstrim_abrasi"
    | "hazard_letusan_gunung_api";
  const irbiHazardKeys = new Set([
    "hazard_banjir",
    "hazard_gempabumi",
    "hazard_tsunami",
    "hazard_likuefaksi",
    "hazard_tanah_longsor",
    "hazard_kebakaran_hutan_lahan",
    "hazard_cuaca_ekstrem",
    "hazard_kekeringan",
    "hazard_banjir_bandang",
    "hazard_gelombang_ekstrim_abrasi",
    "hazard_letusan_gunung_api",
  ]);
  const ancamanLabel = ancaman
    ? irbiHazardKeys.has(hazardKey)
      ? ti(hazardKey)
      : krb?.jenis_bahaya.find((row) => row.kode === ancaman)?.label_id ?? ancaman
    : "";

  return (
    <GlassPanel className="p-4 md:p-5" data-analisis-ancaman="panel">
      <div className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
        {t("ancamanTitle")}
      </div>
      <h3 className="mt-1 text-lg font-semibold">{t("ancamanTitle")}</h3>
      <p className="mt-1 text-sm text-[var(--text-dim)]">{t("ancamanLead")}</p>

      {!result?.ready ? (
        <p className="mt-4 text-sm text-[var(--text-dim)]">{t("ancamanNeedBoth")}</p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-[var(--glass-border)] px-3 py-3">
            <div className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
              {ancamanLabel || ancaman}
              {kab ? ` · ${kab}` : ""}
            </div>
            {result.kodeKabupaten ? (
              <div className="mt-2 text-sm tabular-nums" data-analisis-ancaman="kode-kab">
                {t("kodeKabupaten", { kode: result.kodeKabupaten })}
              </div>
            ) : null}
            {result.irbi ? (
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span>{t("irbiKelas")}</span>
                  <span data-analisis-ancaman="irbi-kelas">
                    <KelasChip kelas={result.irbi.kelas} />
                  </span>
                </div>
                {result.irbi.skor != null ? (
                  <div>
                    {t("irbiSkor")}:{" "}
                    <span
                      className="font-semibold tabular-nums"
                      data-analisis-ancaman="irbi-skor"
                    >
                      {result.irbi.skor.toLocaleString(loc, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                ) : null}
                {result.irbi.irbKab != null ? (
                  <div>
                    {t("irbiKab")}:{" "}
                    <span className="tabular-nums">
                      {result.irbi.irbKab.toLocaleString(loc, {
                        maximumFractionDigits: 2,
                      })}
                    </span>
                    {result.irbi.kelasKab ? ` · ${result.irbi.kelasKab}` : ""}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--text-dim)]">{t("krbMissing")}</p>
            )}
            {result.krb ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span>{t("krbKelas")}</span>
                <span data-analisis-ancaman="krb-kelas">
                  <KelasChip kelas={result.krb.kelas} />
                </span>
                {result.krb.skor != null ? (
                  <span className="tabular-nums">
                    {result.krb.skor.toLocaleString(loc, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                ) : null}
              </div>
            ) : null}
            {result.kawasan.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm">
                <li className="text-[var(--text-dim)]">{t("kawasanTitle")}</li>
                {result.kawasan.map((row) => (
                  <li key={row.id}>
                    {row.nama}
                    <span className="text-[var(--text-dim)]">{` · ${row.zona}`}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-3 text-sm">
              <Link
                href={{
                  pathname: "/peta",
                  query: { area: "irbi2025", krbJenis: ancaman },
                }}
                className="text-[var(--primary)] hover:underline"
              >
                {t("openIrbiMap")}
              </Link>
            </p>
          </div>

          <div className="rounded-xl border border-[var(--glass-border)] px-3 py-3">
            <div className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
              {t("historyTitle")}
            </div>
            {historyPending ? (
              <p className="mt-2 text-sm text-[var(--text-dim)]">{t("loading")}</p>
            ) : (
              <>
            <div className="mt-2 text-sm font-semibold" data-analisis-ancaman="history">
              {result.history.punyaRiwayat ? t("historyYes") : t("historyNo")}
            </div>
            <div className="mt-1 text-sm tabular-nums">
              {t("historyCount", {
                count: result.history.jumlahKejadian,
              })}
            </div>
            {result.history.kejadianTerakhir ? (
              <div className="mt-1 text-sm text-[var(--text-dim)]">
                {t("historyLast", { date: result.history.kejadianTerakhir })}
              </div>
            ) : null}
            <p className="mt-2 text-xs text-[var(--text-dim)]">{t("historyNote")}</p>
              </>
            )}
            {historyJenis ? (
              <p className="mt-3 text-sm">
                <Link
                  href={{
                    pathname: "/data-bencana",
                    query: {
                      ...(kab ? { kabupaten: kab } : {}),
                      jenis: historyJenis,
                      ...(from ? { from } : {}),
                      ...(to ? { to } : {}),
                    },
                  }}
                  className="text-[var(--primary)] hover:underline"
                >
                  {t("openHistoryTable")}
                </Link>
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-[var(--glass-border)] px-3 py-3">
            <div className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
              {t("analogTitle")}
            </div>
            {analogPending ? (
              <p className="mt-2 text-sm text-[var(--text-dim)]">{t("loading")}</p>
            ) : result.analog.grain === "none" ? (
              <>
                <p className="mt-2 text-sm text-[var(--text-dim)]">{t("analogNone")}</p>
                <div className="mt-1 text-sm tabular-nums">
                  {t("analogN", { count: result.analog.n })}
                </div>
              </>
            ) : (
              <div className="mt-2 space-y-1">
                <div className="text-sm font-medium">
                  {result.analog.grain === "kabupaten"
                    ? t("analogLocal")
                    : t("analogProvince")}
                </div>
                <div className="text-sm tabular-nums">
                  {t("analogN", { count: result.analog.n })}
                </div>
                <AnalogLine label={t("analogRr")} range={result.analog.rr} />
                <AnalogLine label={t("analogRs")} range={result.analog.rs} />
                <AnalogLine label={t("analogRb")} range={result.analog.rb} />
              </div>
            )}
            <p
              className="mt-2 text-xs text-[var(--text-dim)]"
              data-analisis-ancaman="analog-disclaimer"
            >
              {t("analogDisclaimer")}
            </p>
          </div>
        </div>
      )}
      <p className="mt-4 text-xs text-[var(--text-dim)]">{t("sourceIrbiKrb")}</p>
    </GlassPanel>
  );
}

export function irbiKabOptions(rows: IrbiRow[] | undefined): string[] {
  if (!rows) return [];
  return rows
    .map((row) => String(row.kabupaten_kota ?? "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "id"));
}
