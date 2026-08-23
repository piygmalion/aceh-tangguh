import { readFile } from "fs/promises";
import path from "path";

export type R3PKabRow = {
  name: string;
  desa_total: number;
  desa_rusak: number;
  rr: number;
  rs: number;
  rb: number;
  rumah: number;
  jalan_rb_m: number;
  jalan_rs_m: number;
  jalan_rr_m: number;
  jalan_total_m: number;
  drainase_rb_m: number;
  drainase_rs_m: number;
  drainase_rr_m: number;
  drainase_total_m: number;
  lahan_rr_ha: number;
  lahan_rs_ha: number;
  lahan_rb_ha: number;
  lahan_total_ha: number;
  kerbau: number;
  sapi: number;
  kambing: number;
  unggas: number;
  ternak_besar: number;
};

export type R3PSlideshow = {
  metadata: {
    judul: string;
    provinsi: string;
    sumber: string;
    sumber_url: string;
    terakhir_diperbarui: string;
    total_desa_kelurahan: number;
    desa_dengan_data_kerusakan: number;
    total_kabupaten_kota: number;
    sektor: string[];
    source_file: string;
  };
  totals: {
    wilayah: {
      total_desa_kelurahan: number;
      desa_dengan_data_kerusakan: number;
      desa_tanpa_data_kerusakan: number;
      persentase_berkerusakan: number;
      total_kabupaten_kota: number;
    };
    perumahan: {
      rumah_rusak_ringan: number;
      rumah_rusak_sedang: number;
      rumah_rusak_berat: number;
      total_rumah: number;
    };
    infrastruktur_transportasi: Record<string, number>;
    infrastruktur_pengairan: {
      drainase_rr_meter: number;
      drainase_rs_meter: number;
      drainase_rb_meter: number;
    };
    ekonomi: {
      lahan_pertanian_rr_hektar: number;
      lahan_pertanian_rs_hektar: number;
      lahan_pertanian_rb_hektar: number;
      kerbau_ekor: number;
      sapi_ekor: number;
      kambing_domba_ekor: number;
      unggas_ekor: number;
    };
  };
  per_kabupaten: R3PKabRow[];
};

export type R3PSummaryResponse = R3PSlideshow & {
  source: "fixture";
};

let cache: R3PSummaryResponse | null = null;

export async function loadR3PSummary(): Promise<R3PSummaryResponse> {
  if (cache) return cache;

  const file = path.join(
    process.cwd(),
    "public/fixtures/r3p-slideshow.json"
  );
  const raw = await readFile(file, "utf8");
  const data = JSON.parse(raw) as R3PSlideshow;

  cache = { ...data, source: "fixture" };
  return cache;
}

export function sumRecord(rec: Record<string, number>): number {
  return Object.values(rec).reduce((a, b) => a + (Number(b) || 0), 0);
}

export function metersToKm(m: number): number {
  return m / 1000;
}
