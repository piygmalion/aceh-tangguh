"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Field, FieldLabel } from "@/components/ui/field";
import { fetchPublicApi } from "@/lib/preview/public-api";
import {
  applyDesaChange,
  applyKabupatenChange,
  applyKecamatanChange,
  clearKabupaten,
  desaOptionsForKecamatan,
  findOptionBySelectValue,
  hydrateSelectionFromLokasi,
  isDesaEnabled,
  isKecamatanEnabled,
  kabupatenOptionsFromRegistry,
  kecamatanOptionsForKabupaten,
  matchOptionByNama,
  optionSelectValue,
  toLokasiNames,
  wilayahDesaApiPath,
  wilayahKecamatanApiPath,
} from "@/lib/laporan/wilayah-cascade";
import type {
  KabupatenProfilResponse,
  KecamatanProfilResponse,
} from "@/lib/profil-desa";
import { qk } from "@/lib/qk";
import { cn } from "@/lib/utils";

export type WilayahLokasiValue = {
  kabupaten_kota: string;
  kecamatan: string;
  desa: string;
};

type Props = {
  value: WilayahLokasiValue;
  onChange: (next: WilayahLokasiValue) => void;
};

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

export function WilayahCascadeFields({ value, onChange }: Props) {
  const t = useTranslations("laporForm");
  const kabOptions = useMemo(() => kabupatenOptionsFromRegistry(), []);
  const selection = useMemo(
    () =>
      hydrateSelectionFromLokasi({
        kabupaten_kota: value.kabupaten_kota,
        kecamatan: value.kecamatan,
        desa: value.desa,
      }),
    [value.kabupaten_kota, value.kecamatan, value.desa]
  );

  const kabKode = selection.kabupaten?.kode ?? "";
  const kabNama = selection.kabupaten?.nama ?? "";
  const kecEnabled = isKecamatanEnabled(kabKode);
  const kecKode = selection.kecamatan?.kode ?? "";
  const kecNama = selection.kecamatan?.nama ?? "";
  const kecSelected = { kode: kecKode, nama: kecNama };
  const desaEnabled = isDesaEnabled(kecSelected);

  const kecQuery = useQuery({
    queryKey: qk.profilKabupaten({
      kodeKabupaten: kabKode || undefined,
      kabupaten: kabNama || undefined,
    }),
    queryFn: async (): Promise<KabupatenProfilResponse | null> => {
      const res = await fetchPublicApi(wilayahKecamatanApiPath(kabKode, kabNama));
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("kecamatan fetch failed");
      return res.json();
    },
    enabled: kecEnabled,
  });

  const desaQuery = useQuery({
    queryKey: qk.profilKecamatan({
      kabupaten: kabNama || undefined,
      kecamatan: kecNama || undefined,
      kodeKecamatan: kecKode || undefined,
    }),
    queryFn: async (): Promise<KecamatanProfilResponse | null> => {
      const res = await fetchPublicApi(
        wilayahDesaApiPath(kecKode, kabNama, kecNama)
      );
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("desa fetch failed");
      return res.json();
    },
    enabled: desaEnabled,
  });

  const kecOptions = useMemo(() => {
    if (kecQuery.isFetching || !kecQuery.data) return [];
    const scoped = kecQuery.data.kode_kabupaten;
    if (scoped && scoped !== kabKode) return [];
    return kecamatanOptionsForKabupaten(kecQuery.data.kecamatan_list, kabKode);
  }, [kecQuery.data, kecQuery.isFetching, kabKode]);
  const desaOptions = useMemo(() => {
    if (desaQuery.isFetching || !desaQuery.data) return [];
    const scoped = desaQuery.data.kode_kecamatan;
    if (kecKode && scoped && scoped !== kecKode) return [];
    return desaOptionsForKecamatan(desaQuery.data.desa, { kode: kecKode, nama: kecNama });
  }, [desaQuery.data, desaQuery.isFetching, kecKode, kecNama]);

  useEffect(() => {
    if (!kecEnabled || kecQuery.isFetching) return;
    const current = selection.kecamatan;
    if (!current) return;
    const matched =
      (current.kode
        ? findOptionBySelectValue(kecOptions, current.kode)
        : null) ?? matchOptionByNama(kecOptions, current.nama);
    if (!matched) {
      onChange(toLokasiNames({ ...selection, kecamatan: null, desa: null }));
    }
  }, [kecEnabled, kecQuery.isFetching, kecOptions, onChange, selection]);

  useEffect(() => {
    if (!desaEnabled || desaQuery.isFetching) return;
    const current = selection.desa;
    if (!current) return;
    const matched =
      (current.kode
        ? findOptionBySelectValue(desaOptions, current.kode)
        : current.id
          ? findOptionBySelectValue(desaOptions, `id:${current.id}`)
          : null) ?? matchOptionByNama(desaOptions, current.nama);
    if (!matched) {
      onChange(toLokasiNames({ ...selection, desa: null }));
    }
  }, [desaEnabled, desaQuery.isFetching, desaOptions, onChange, selection]);

  const kabSelectValue = selection.kabupaten?.kode ?? "";
  const kecSelectValue = selection.kecamatan
    ? optionSelectValue(selection.kecamatan)
    : "";
  const desaSelectValue = selection.desa ? optionSelectValue(selection.desa) : "";

  return (
    <>
      <Field className="sm:col-span-2">
        <FieldLabel htmlFor="gps-kabupaten">{t("kabupaten")}</FieldLabel>
        <select
          id="gps-kabupaten"
          required
          value={kabSelectValue}
          onChange={(e) => {
            const next = findOptionBySelectValue(kabOptions, e.target.value);
            onChange(toLokasiNames(next ? applyKabupatenChange(selection, next) : clearKabupaten()));
          }}
          className={cn(selectClassName)}
        >
          <option value="">{t("selectKabupaten")}</option>
          {kabOptions.map((row) => (
            <option key={optionSelectValue(row)} value={optionSelectValue(row)}>
              {row.nama}
            </option>
          ))}
        </select>
      </Field>
      <Field>
        <FieldLabel htmlFor="gps-kecamatan">{t("kecamatan")}</FieldLabel>
        <select
          id="gps-kecamatan"
          value={kecEnabled ? kecSelectValue : ""}
          disabled={!kecEnabled}
          onChange={(e) => {
            const next = findOptionBySelectValue(kecOptions, e.target.value);
            onChange(
              toLokasiNames(
                next ? applyKecamatanChange(selection, next) : { ...selection, kecamatan: null, desa: null }
              )
            );
          }}
          className={cn(selectClassName)}
        >
          <option value="">
            {!kecEnabled
              ? t("kecamatanNeedKab")
              : kecQuery.isFetching
                ? t("wilayahLoading")
                : t("selectKecamatan")}
          </option>
          {kecOptions.map((row) => (
            <option key={optionSelectValue(row)} value={optionSelectValue(row)}>
              {row.nama}
            </option>
          ))}
        </select>
      </Field>
      <Field>
        <FieldLabel htmlFor="gps-desa">{t("desa")}</FieldLabel>
        <select
          id="gps-desa"
          value={desaEnabled ? desaSelectValue : ""}
          disabled={!desaEnabled}
          onChange={(e) => {
            const next = findOptionBySelectValue(desaOptions, e.target.value);
            onChange(
              toLokasiNames(next ? applyDesaChange(selection, next) : { ...selection, desa: null })
            );
          }}
          className={cn(selectClassName)}
        >
          <option value="">
            {!desaEnabled
              ? t("desaNeedKec")
              : desaQuery.isFetching
                ? t("wilayahLoading")
                : t("selectDesa")}
          </option>
          {desaOptions.map((row) => (
            <option key={optionSelectValue(row)} value={optionSelectValue(row)}>
              {row.nama}
            </option>
          ))}
        </select>
      </Field>
    </>
  );
}
