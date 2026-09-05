"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Map } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { Link } from "@/i18n/routing";
import { fetchKrb, parseKrbJenis } from "@/lib/krb-by-kab";
import { qk } from "@/lib/qk";
import { KELAS_FILL } from "@/lib/chart-colors";
import { TYPE_FLOOR_CLASS, TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

const KELAS_COLOR: Record<string, string> = {
  TINGGI: KELAS_FILL.TINGGI,
  SEDANG: KELAS_FILL.SEDANG,
  RENDAH: KELAS_FILL.RENDAH,
};

export function KrbHeroPanel() {
  const t = useTranslations("krb");
  const [jenis, setJenis] = useState("");
  const [kelas, setKelas] = useState("");
  const [kabupaten, setKabupaten] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: qk.krb,
    queryFn: () => fetchKrb(),
    staleTime: 60_000,
  });

  const kabOptions = data?.kabupaten ?? [];

  const sortedWilayah = useMemo(() => {
    if (!data?.wilayah) return [];
    let rows = data.wilayah;
    if (jenis) rows = rows.filter((row) => row.jenis_bahaya === jenis);
    if (kelas) rows = rows.filter((row) => row.kelas_ancaman === kelas);
    if (kabupaten) {
      rows = rows.filter((row) => row.kode_kabupaten === kabupaten);
    }
    return [...rows].sort((a, b) => (b.skor_irbi ?? 0) - (a.skor_irbi ?? 0));
  }, [data, jenis, kelas, kabupaten]);

  const filteredKawasan = useMemo(() => {
    let rows = data?.kawasan ?? [];
    if (jenis) rows = rows.filter((row) => row.jenis_bahaya === jenis);
    if (kabupaten) {
      rows = rows.filter((row) => (row.kode_kabupaten ?? []).includes(kabupaten));
    }
    return rows;
  }, [data, jenis, kabupaten]);

  const petaDokumen = useMemo(
    () =>
      (data?.dokumen ?? []).filter(
        (doc) => doc.jenis === "peta_krb_gunungapi" || /pvmbg|inarisk/i.test(doc.penerbit ?? "")
      ),
    [data]
  );

  const irbi = data?.metadata.irbi_2025 as
    | { nilai_irb_provinsi?: number; kelas_risiko_provinsi?: string }
    | undefined;
  const mapJenis = parseKrbJenis(jenis) ?? "tsunami";

  if (isLoading) {
    return (
      <p className="py-16 text-center text-sm text-white/60">{t("loading")}</p>
    );
  }
  if (isError || !data) {
    return (
      <p className="py-16 text-center text-sm text-white/60">{t("error")}</p>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-4">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          {t("heading")}
        </h2>
        <p className="mt-3 max-w-3xl text-sm text-white/70 sm:text-base">
          {t("lead")}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {irbi?.nilai_irb_provinsi != null ? (
          <Chip tone="glass" className="text-[0.9rem]">
            {t("chipIrb")}: {irbi.nilai_irb_provinsi}
          </Chip>
        ) : null}
        {irbi?.kelas_risiko_provinsi ? (
          <Chip tone="glass" className="text-[0.9rem]">
            {t("chipKelas")}: {irbi.kelas_risiko_provinsi}
          </Chip>
        ) : null}
        <Chip tone="glass" className="text-[0.9rem]">
          {data.kabupaten.length} {t("chipKab")}
        </Chip>
        <Chip tone="glass" className="text-[0.9rem]">
          {data.wilayah.length} {t("chipWilayah")}
        </Chip>
      </div>

      <p className={cn("max-w-3xl text-white/50", TYPE_FLOOR_CLASS)}>{t("disclaimer")}</p>

      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className={cn("text-white/55", TYPE_KICKER_CLASS)}>{t("filterJenis")}</span>
          <select
            value={jenis}
            onChange={(e) => setJenis(e.target.value)}
            className="rounded-full border border-white/20 bg-black/30 px-3 py-2 text-white outline-none"
          >
            <option value="">{t("allJenis")}</option>
            {data.jenis_bahaya.map((row) => (
              <option key={row.kode} value={row.kode}>
                {row.label_id}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className={cn("text-white/55", TYPE_KICKER_CLASS)}>{t("filterKelas")}</span>
          <select
            value={kelas}
            onChange={(e) => setKelas(e.target.value)}
            className="rounded-full border border-white/20 bg-black/30 px-3 py-2 text-white outline-none"
          >
            <option value="">{t("allKelas")}</option>
            <option value="TINGGI">TINGGI</option>
            <option value="SEDANG">SEDANG</option>
            <option value="RENDAH">RENDAH</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className={cn("text-white/55", TYPE_KICKER_CLASS)}>{t("filterKab")}</span>
          <select
            value={kabupaten}
            onChange={(e) => setKabupaten(e.target.value)}
            className="rounded-full border border-white/20 bg-black/30 px-3 py-2 text-white outline-none"
          >
            <option value="">{t("allKab")}</option>
            {kabOptions.map((row) => (
              <option key={row.kode_kabupaten} value={row.kode_kabupaten}>
                {row.kabupaten}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {sortedWilayah.slice(0, 12).map((row) => (
          <li
            key={row.id}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-md"
          >
            <div className={cn("text-white/45", TYPE_KICKER_CLASS)}>
              {row.jenis_bahaya.replace(/_/g, " ")}
            </div>
            <div className="mt-1 text-sm font-semibold text-white">{row.kabupaten}</div>
            <div
              className="mt-1 text-lg font-semibold tabular-nums"
              style={{ color: KELAS_COLOR[row.kelas_ancaman] ?? "#fff" }}
            >
              {row.skor_irbi?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? "—"}
            </div>
            <div className={cn("mt-1 text-white/55", TYPE_FLOOR_CLASS)}>
              {row.kelas_ancaman}
            </div>
          </li>
        ))}
      </ul>

      {petaDokumen.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-white/90">{t("docsTitle")}</h3>
          <ul className="space-y-1.5 text-sm">
            {petaDokumen.map((doc) => (
              <li key={doc.id}>
                {doc.url ? (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-white/80 underline decoration-white/30 underline-offset-2 hover:text-white"
                  >
                    {doc.judul}
                  </a>
                ) : (
                  <span className="text-white/70">{doc.judul}</span>
                )}
                <span className={cn("ml-2 text-white/40", TYPE_FLOOR_CLASS)}>
                  {doc.penerbit}
                  {doc.tahun_mulai ? ` · ${doc.tahun_mulai}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {filteredKawasan.length > 0 ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-white/90">{t("kawasanTitle")}</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {filteredKawasan.map((row) => (
              <li
                key={row.id}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-3"
              >
                <div className="text-sm font-semibold text-white">{row.nama}</div>
                <div className={cn("mt-1 text-white/55", TYPE_FLOOR_CLASS)}>
                  {row.zona} · {(row.kabupaten ?? []).join(", ")}
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Link
          href={{
            pathname: "/peta",
            query: { area: "irbi2025", basemap: "positron", krbJenis: mapJenis },
          }}
        >
          <button
            type="button"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--primary-fg)] shadow-lg transition hover:bg-[var(--primary-hover)]"
          >
            <Map size={16} />
            {t("seeMap")}
          </button>
        </Link>
        <p className={cn("text-white/40", TYPE_FLOOR_CLASS)}>{t("sourceNote")}</p>
      </div>
    </div>
  );
}
