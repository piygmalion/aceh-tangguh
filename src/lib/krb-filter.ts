import type { Json } from "./supabase/types";
import type {
  KrbDokumenRow,
  KrbJenisBahayaRow,
  KrbKabupatenRow,
  KrbKawasanRow,
  KrbWilayahRow,
} from "./supabase/types";

type WithoutDbMeta<T> = Omit<T, "updated_at" | "payload"> & {
  updated_at?: string;
  payload?: Json;
};

export type KrbJenisBahaya = WithoutDbMeta<KrbJenisBahayaRow>;
export type KrbKabupaten = WithoutDbMeta<KrbKabupatenRow>;
export type KrbWilayah = WithoutDbMeta<KrbWilayahRow>;
export type KrbKawasan = WithoutDbMeta<KrbKawasanRow>;
export type KrbDokumen = WithoutDbMeta<KrbDokumenRow>;

export type KrbKelasAncaman = "RENDAH" | "SEDANG" | "TINGGI";

export type KrbPayload = {
  metadata: Record<string, unknown>;
  jenis_bahaya: KrbJenisBahaya[];
  kabupaten: KrbKabupaten[];
  wilayah: KrbWilayah[];
  kawasan: KrbKawasan[];
  dokumen: KrbDokumen[];
  source?: "supabase" | "fixture";
};

export type KrbQuery = {
  jenis?: string;
  kabupaten?: string;
  kelas?: string;
};

function matchesKabupaten(
  kode: string | null | undefined,
  nama: string | null | undefined,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (kode && kode.toLowerCase() === q) return true;
  if (nama && nama.toLowerCase() === q) return true;
  if (nama && nama.toLowerCase().includes(q)) return true;
  return false;
}

export function filterKrb(data: KrbPayload, query: KrbQuery): KrbPayload {
  const jenis = query.jenis?.trim().toLowerCase();
  const kab = query.kabupaten?.trim();
  const kelas = query.kelas?.trim().toUpperCase();

  let wilayah = data.wilayah;
  if (jenis) wilayah = wilayah.filter((row) => row.jenis_bahaya === jenis);
  if (kab) {
    wilayah = wilayah.filter((row) =>
      matchesKabupaten(row.kode_kabupaten, row.kabupaten, kab)
    );
  }
  if (kelas) wilayah = wilayah.filter((row) => row.kelas_ancaman === kelas);

  let kabupaten = data.kabupaten;
  if (kab) {
    kabupaten = kabupaten.filter((row) =>
      matchesKabupaten(row.kode_kabupaten, row.kabupaten, kab)
    );
  }

  let kawasan = data.kawasan;
  if (jenis) kawasan = kawasan.filter((row) => row.jenis_bahaya === jenis);
  if (kab) {
    kawasan = kawasan.filter((row) => {
      const codes = row.kode_kabupaten ?? [];
      const names = row.kabupaten ?? [];
      return (
        codes.some((c) => matchesKabupaten(c, null, kab)) ||
        names.some((n) => matchesKabupaten(null, n, kab))
      );
    });
  }

  return {
    ...data,
    metadata: {
      ...data.metadata,
      filter: { jenis: jenis || null, kabupaten: kab || null, kelas: kelas || null },
      jumlah_terfilter: {
        kabupaten_kota: kabupaten.length,
        wilayah: wilayah.length,
        kawasan: kawasan.length,
      },
    },
    kabupaten,
    wilayah,
    kawasan,
  };
}
