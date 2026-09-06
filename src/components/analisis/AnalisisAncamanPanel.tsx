"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Link } from "@/i18n/routing";
import {
  buildAncamanRiwayat,
  krbJenisToDisasterJenis,
} from "@/lib/analisis-ancaman";
import type { ProyeksiDampak, ProyeksiRange } from "@/lib/proyeksi-dampak";
import { fetchKrb } from "@/lib/krb-by-kab";
import type { KejadianAnalisisPayload } from "@/lib/kejadian-analisis";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import { kelasFill } from "@/lib/chart-colors";
import { TYPE_FLOOR_CLASS, TYPE_KICKER_CLASS } from "@/lib/type-floor";
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
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 font-semibold text-white",
        TYPE_FLOOR_CLASS
      )}
      style={{ background: kelasFill(kelas) }}
    >
      {kelas}
    </span>
  );
}

function scenarioLabel(
  t: (key: "proyeksiScenarioParah" | "proyeksiScenarioRingan" | "proyeksiScenarioKhas") => string,
  scenario: ProyeksiDampak["scenario"]
): string {
  if (scenario === "parah") return t("proyeksiScenarioParah");
  if (scenario === "ringan") return t("proyeksiScenarioRingan");
  return t("proyeksiScenarioKhas");
}

function ProyeksiBody({ proyeksi }: { proyeksi: ProyeksiDampak }) {
  const t = useTranslations("analisisData");
  const locale = useLocale();
  const loc = locale === "id" ? "id-ID" : "en-US";
  const empty =
    proyeksi.grain === "none" &&
    !proyeksi.housing &&
    !proyeksi.jiwa &&
    proyeksi.scale.length === 0;
  return (
    <div className="flex flex-col gap-2" data-analisis-ancaman="proyeksi">
      <div className="text-sm font-medium">
        {proyeksi.grain === "kabupaten"
          ? t("analogLocal")
          : proyeksi.grain === "provinsi"
            ? t("analogProvince")
            : t("analogNone")}
      </div>
      <div className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
        {t("proyeksiScenario", { scenario: scenarioLabel(t, proyeksi.scenario) })}
      </div>
      <div className="text-sm tabular-nums">{t("analogN", { count: proyeksi.n })}</div>
      {empty ? null : (
        <>
          <AnalogLine label={t("analogRr")} range={proyeksi.housing} />
          <AnalogLine label={t("proyeksiJiwa")} range={proyeksi.jiwa} />
          <AnalogLine label={t("proyeksiKk")} range={proyeksi.kk} />
          <AnalogLine label={t("proyeksiPengungsi")} range={proyeksi.pengungsi} />
        </>
      )}
      {proyeksi.scale.length > 0 ? (
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium">{t("proyeksiScale")}</div>
          <ul className="flex flex-col gap-1 text-sm">
            {proyeksi.scale.map((peer) => (
              <li key={peer.id} className="tabular-nums">
                {t("proyeksiScalePeer", {
                  value: peer.value.toLocaleString(loc, { maximumFractionDigits: 1 }),
                  kabupaten: peer.kabupaten,
                  rumah: peer.rumah.toLocaleString(loc),
                  jiwa: peer.jiwaTerdampak.toLocaleString(loc),
                })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {proyeksi.corridors.length > 0 ? (
        <div className="flex flex-col gap-1">
          <div className="text-sm font-medium">{t("proyeksiCorridor")}</div>
          <ul className="flex flex-col gap-1 text-sm">
            {proyeksi.corridors.map((row) => (
              <li key={row.label} className="tabular-nums">
                {t("proyeksiCorridorRow", {
                  label: row.label,
                  count: row.n,
                  jiwa: row.jiwaMedian.toLocaleString(loc),
                })}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {proyeksi.replay.last ? (
        <div className="text-sm text-[var(--text-dim)]">
          {t("proyeksiReplayLast", {
            date: proyeksi.replay.last.date,
            kabupaten: proyeksi.replay.last.kabupaten,
            jiwa: proyeksi.replay.last.jiwaTerdampak.toLocaleString(loc),
          })}
        </div>
      ) : null}
      {proyeksi.replay.worst &&
      proyeksi.replay.worst.id !== proyeksi.replay.last?.id ? (
        <div className="text-sm text-[var(--text-dim)]">
          {t("proyeksiReplayWorst", {
            date: proyeksi.replay.worst.date,
            kabupaten: proyeksi.replay.worst.kabupaten,
            jiwa: proyeksi.replay.worst.jiwaTerdampak.toLocaleString(loc),
          })}
        </div>
      ) : null}
    </div>
  );
}

function AnalogLine({
  label,
  range,
}: {
  label: string;
  range: ProyeksiRange | null;
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
        p75: range.p75.toLocaleString(loc),
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
        localCards: localHistory?.impactCards ?? [],
        provincialCards: provincialHistory?.impactCards ?? [],
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
    <GlassPanel className="flex flex-col gap-4 p-4 md:p-5" data-analisis-ancaman="panel">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold">{t("ancamanTitle")}</h3>
        <p className="text-sm text-[var(--text-dim)]">{t("ancamanLead")}</p>
      </div>

      {!result?.ready ? (
        <p className="text-sm text-[var(--text-dim)]">{t("ancamanNeedBoth")}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-2 rounded-xl border border-[var(--glass-border)] px-3 py-3">
            <div className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
              {ancamanLabel || ancaman}
              {kab ? ` · ${kab}` : ""}
            </div>
            {result.kodeKabupaten ? (
              <div className="text-sm tabular-nums" data-analisis-ancaman="kode-kab">
                {t("kodeKabupaten", { kode: result.kodeKabupaten })}
              </div>
            ) : null}
            {result.irbi ? (
              <div className="flex flex-col gap-1 text-sm">
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
              <p className="text-sm text-[var(--text-dim)]">{t("krbMissing")}</p>
            )}
            {result.krb ? (
              <div className="flex flex-wrap items-center gap-2 text-sm">
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
              <ul className="flex flex-col gap-1 text-sm">
                <li className="text-[var(--text-dim)]">{t("kawasanTitle")}</li>
                {result.kawasan.map((row) => (
                  <li key={row.id}>
                    {row.nama}
                    <span className="text-[var(--text-dim)]">{` · ${row.zona}`}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="text-sm">
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

          <div className="flex flex-col gap-2 rounded-xl border border-[var(--glass-border)] px-3 py-3">
            <div className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
              {t("historyTitle")}
            </div>
            {historyPending ? (
              <p className="text-sm text-[var(--text-dim)]">{t("loading")}</p>
            ) : (
              <div className="flex flex-col gap-1">
                <div className="text-sm font-semibold" data-analisis-ancaman="history">
                  {result.history.punyaRiwayat ? t("historyYes") : t("historyNo")}
                </div>
                <div className="text-sm tabular-nums">
                  {t("historyCount", {
                    count: result.history.jumlahKejadian,
                  })}
                </div>
                {result.history.kejadianTerakhir ? (
                  <div className="text-sm text-[var(--text-dim)]">
                    {t("historyLast", { date: result.history.kejadianTerakhir })}
                  </div>
                ) : null}
                <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                  {t("historyNote")}
                </p>
              </div>
            )}
            {historyJenis ? (
              <p className="text-sm">
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

          <div className="flex flex-col gap-2 rounded-xl border border-[var(--glass-border)] px-3 py-3">
            <div className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
              {t("analogTitle")}
            </div>
            {analogPending ? (
              <p className="text-sm text-[var(--text-dim)]">{t("loading")}</p>
            ) : (
              <ProyeksiBody proyeksi={result.proyeksi} />
            )}
            <p
              className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}
              data-analisis-ancaman="analog-disclaimer"
            >
              {t("analogDisclaimer")}
            </p>
          </div>
        </div>
      )}
      <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{t("sourceIrbiKrb")}</p>
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
