import { ACEH_KABUPATEN_REGISTRY, findKabupatenRegistry } from "@/lib/aceh-kabupaten";
import {
  profilDesaApiPath,
  profilKabupatenSearchParams,
  profilKecamatanSearchParams,
} from "@/lib/area-profil-ia";
import { kabupatenNamesMatch } from "@/lib/kabupaten-join";
import type { DesaListItem, KecamatanListItem } from "@/lib/profil-desa";

export type WilayahOption = {
  kode: string | null;
  nama: string;
  id?: string | null;
};

export type CascadeSelection = {
  kabupaten: WilayahOption | null;
  kecamatan: WilayahOption | null;
  desa: WilayahOption | null;
};

export type CascadeLokasiNames = {
  kabupaten_kota: string;
  kecamatan: string;
  desa: string;
};

function trimOrEmpty(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

export function kabupatenOptionsFromRegistry(): WilayahOption[] {
  return ACEH_KABUPATEN_REGISTRY.map((row) => ({
    kode: row.kode_sik,
    nama: row.nama,
  }));
}

export function resolveKabupatenOption(
  raw: string | null | undefined
): WilayahOption | null {
  const trimmed = trimOrEmpty(raw);
  if (!trimmed) return null;
  const direct = findKabupatenRegistry(trimmed);
  if (direct) return { kode: direct.kode_sik, nama: direct.nama };
  const byName = ACEH_KABUPATEN_REGISTRY.find((row) =>
    kabupatenNamesMatch(row.nama, trimmed)
  );
  if (byName) return { kode: byName.kode_sik, nama: byName.nama };
  return null;
}

export function kecamatanOptionsForKabupaten(
  rows: readonly KecamatanListItem[],
  kabKode: string
): WilayahOption[] {
  const parent = trimOrEmpty(kabKode);
  if (!parent) return [];
  const options: WilayahOption[] = [];
  for (const row of rows) {
    const nama = trimOrEmpty(row.kecamatan);
    if (!nama) continue;
    const kode = trimOrEmpty(row.kode_kecamatan) || null;
    if (kode && !kode.startsWith(parent)) continue;
    options.push({ kode, nama });
  }
  return options;
}

export function desaOptionsForKecamatan(
  rows: readonly DesaListItem[],
  kec: { kode: string; nama: string }
): WilayahOption[] {
  const kecKode = trimOrEmpty(kec.kode);
  const kecNama = trimOrEmpty(kec.nama);
  if (!kecKode && !kecNama) return [];
  const options: WilayahOption[] = [];
  for (const row of rows) {
    const nama = trimOrEmpty(row.nama);
    if (!nama) continue;
    const kode = trimOrEmpty(row.kode) || null;
    if (kode) {
      if (kecKode && kode.startsWith(kecKode)) {
        options.push({ kode, nama, id: row.id });
      }
      continue;
    }
    const rowKec = trimOrEmpty(row.kecamatan);
    if (kecNama && rowKec.toLowerCase() === kecNama.toLowerCase()) {
      options.push({ kode: null, nama, id: row.id });
    }
  }
  return options;
}

export function isKecamatanEnabled(kabKode: string | null | undefined): boolean {
  return Boolean(trimOrEmpty(kabKode));
}

export function isDesaEnabled(kec: { kode: string; nama: string }): boolean {
  return Boolean(trimOrEmpty(kec.kode) || trimOrEmpty(kec.nama));
}

export function applyKabupatenChange(
  _prev: CascadeSelection,
  nextKab: WilayahOption
): CascadeSelection {
  return { kabupaten: nextKab, kecamatan: null, desa: null };
}

export function applyKecamatanChange(
  prev: CascadeSelection,
  nextKec: WilayahOption
): CascadeSelection {
  return { kabupaten: prev.kabupaten, kecamatan: nextKec, desa: null };
}

export function applyDesaChange(
  prev: CascadeSelection,
  nextDesa: WilayahOption
): CascadeSelection {
  return { ...prev, desa: nextDesa };
}

export function clearKabupaten(): CascadeSelection {
  return { kabupaten: null, kecamatan: null, desa: null };
}

export function toLokasiNames(selection: CascadeSelection): CascadeLokasiNames {
  return {
    kabupaten_kota: selection.kabupaten?.nama ?? "",
    kecamatan: selection.kecamatan?.nama ?? "",
    desa: selection.desa?.nama ?? "",
  };
}

export function hydrateSelectionFromLokasi(
  lokasi: CascadeLokasiNames
): CascadeSelection {
  const kabupaten = resolveKabupatenOption(lokasi.kabupaten_kota);
  if (!kabupaten) return clearKabupaten();
  const kecamatanNama = trimOrEmpty(lokasi.kecamatan);
  const desaNama = trimOrEmpty(lokasi.desa);
  return {
    kabupaten,
    kecamatan: kecamatanNama ? { kode: null, nama: kecamatanNama } : null,
    desa: desaNama ? { kode: null, nama: desaNama } : null,
  };
}

export function wilayahKecamatanApiPath(kabKode: string, kabNama = ""): string {
  return profilDesaApiPath(
    "kabupaten",
    profilKabupatenSearchParams({
      name: kabNama,
      kabupaten: kabNama,
      kecamatan: "",
      kodeKabupaten: kabKode,
    })
  );
}

export function wilayahDesaApiPath(
  kecKode: string,
  kabNama = "",
  kecNama = ""
): string {
  return profilDesaApiPath(
    "kecamatan",
    profilKecamatanSearchParams({
      kabupaten: kabNama,
      kecamatan: kecNama,
      kodeKecamatan: kecKode,
    })
  );
}

export function optionSelectValue(option: WilayahOption): string {
  if (option.kode) return option.kode;
  if (option.id) return `id:${option.id}`;
  return `nama:${option.nama}`;
}

export function findOptionBySelectValue(
  options: readonly WilayahOption[],
  value: string
): WilayahOption | null {
  const trimmed = trimOrEmpty(value);
  if (!trimmed) return null;
  return options.find((row) => optionSelectValue(row) === trimmed) ?? null;
}

export function matchOptionByNama(
  options: readonly WilayahOption[],
  nama: string | null | undefined
): WilayahOption | null {
  const key = trimOrEmpty(nama).toLowerCase();
  if (!key) return null;
  return options.find((row) => row.nama.trim().toLowerCase() === key) ?? null;
}
