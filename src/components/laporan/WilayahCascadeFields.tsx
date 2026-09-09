"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  optionSelectValue,
  resolveOptionFromList,
  toLokasiNames,
  wilayahDesaApiPath,
  wilayahKecamatanApiPath,
  type CascadeSelection,
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

function namesEqual(a: WilayahLokasiValue, b: WilayahLokasiValue): boolean {
  return (
    a.kabupaten_kota === b.kabupaten_kota &&
    a.kecamatan === b.kecamatan &&
    a.desa === b.desa
  );
}

export function WilayahCascadeFields({ value, onChange }: Props) {
  const t = useTranslations("laporForm");
  const kabOptions = useMemo(() => kabupatenOptionsFromRegistry(), []);
  const [picked, setPicked] = useState<CascadeSelection>(() =>
    hydrateSelectionFromLokasi(value)
  );
  const lastNames = useRef(toLokasiNames(hydrateSelectionFromLokasi(value)));

  const commit = useCallback((next: CascadeSelection) => {
    const names = toLokasiNames(next);
    lastNames.current = names;
    setPicked(next);
    onChange(names);
  }, [onChange]);

  useEffect(() => {
    if (namesEqual(lastNames.current, value)) return;
    const next = hydrateSelectionFromLokasi(value);
    lastNames.current = toLokasiNames(next);
    setPicked(next);
  }, [value]);

  const kabKode = picked.kabupaten?.kode ?? "";
  const kabNama = picked.kabupaten?.nama ?? "";
  const kecEnabled = isKecamatanEnabled(kabKode);
  const kecKode = picked.kecamatan?.kode ?? "";
  const kecNama = picked.kecamatan?.nama ?? "";
  const desaEnabled = isDesaEnabled({ kode: kecKode, nama: kecNama });

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
      const res = await fetchPublicApi(wilayahDesaApiPath(kecKode, kabNama, kecNama));
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
    return desaOptionsForKecamatan(desaQuery.data.desa, {
      kode: kecKode,
      nama: kecNama,
    });
  }, [desaQuery.data, desaQuery.isFetching, kecKode, kecNama]);

  useEffect(() => {
    if (!kecEnabled || kecQuery.isFetching) return;
    const current = picked.kecamatan;
    if (!current) return;
    const matched = resolveOptionFromList(current, kecOptions);
    if (!matched) {
      commit({ ...picked, kecamatan: null, desa: null });
      return;
    }
    if (optionSelectValue(matched) !== optionSelectValue(current)) {
      setPicked((prev) => ({ ...prev, kecamatan: matched }));
    }
  }, [kecEnabled, kecQuery.isFetching, kecOptions, picked, commit]);

  useEffect(() => {
    if (!desaEnabled || desaQuery.isFetching) return;
    const current = picked.desa;
    if (!current) return;
    const matched = resolveOptionFromList(current, desaOptions);
    if (!matched) {
      commit({ ...picked, desa: null });
      return;
    }
    if (optionSelectValue(matched) !== optionSelectValue(current)) {
      setPicked((prev) => ({ ...prev, desa: matched }));
    }
  }, [desaEnabled, desaQuery.isFetching, desaOptions, picked, commit]);

  const kabSelectValue = picked.kabupaten?.kode ?? "";
  const kecSelectValue = picked.kecamatan ? optionSelectValue(picked.kecamatan) : "";
  const desaSelectValue = picked.desa ? optionSelectValue(picked.desa) : "";

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
            commit(next ? applyKabupatenChange(picked, next) : clearKabupaten());
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
            commit(
              next
                ? applyKecamatanChange(picked, next)
                : { ...picked, kecamatan: null, desa: null }
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
            commit(next ? applyDesaChange(picked, next) : { ...picked, desa: null });
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
