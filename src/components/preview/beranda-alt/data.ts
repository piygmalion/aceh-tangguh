"use client";

import { useQuery } from "@tanstack/react-query";
import type { DibiAcehResponse } from "@/lib/dibi-types";
import type { PeringatanDiniResponse } from "@/lib/peringatan-dini-types";
import type { PrrpkaSummaryResponse } from "@/lib/prrpka-types";
import type { WeatherApiResponse } from "@/lib/weather-types";
import { fetchPublicApi } from "@/lib/preview/public-api";

/**
 * IRBI ships as `Record<string, unknown>` in `@/lib/irbi`. The preview only reads
 * a handful of fields, so it narrows them here rather than widening the shared type.
 */
export type IrbiKabView = {
  kabupaten_kota: string;
  irb_2025: number;
  kelas_risiko: string;
  ancaman_tertinggi: string;
  skor_ancaman_tertinggi: number;
  kelas_ancaman_tertinggi: string;
};

export type IrbiView = {
  nilai_irb_provinsi: number;
  kelas_risiko_provinsi: string;
  jumlah_penduduk_2025: number;
  total_kabupaten_kota: number;
  luas_wilayah_km2: number;
  tahun: number;
  kabupaten: IrbiKabView[];
};

export type AnggaranView = {
  tahun: number;
  sumber: string;
  totalRp: number;
  totalKegiatan: number;
  perFase: { fase: string; kegiatan: number; rp: number }[];
  perubahanPct: number;
};

const QUERY = {
  staleTime: 5 * 60_000,
  gcTime: 30 * 60_000,
  retry: 1,
} as const;

async function ambil<T>(path: string, label: string): Promise<T> {
  const res = await fetchPublicApi(path);
  if (!res.ok) throw new Error(`Gagal memuat ${label} (${res.status})`);
  return (await res.json()) as T;
}

function nomor(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function teks(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function usePeringatan() {
  return useQuery({
    queryKey: ["beranda-alt", "peringatan-dini"],
    queryFn: () =>
      ambil<PeringatanDiniResponse>("/api/peringatan-dini", "peringatan dini"),
    refetchInterval: 10 * 60_000,
    ...QUERY,
  });
}

export function useCuaca() {
  return useQuery({
    queryKey: ["beranda-alt", "weather"],
    queryFn: () => ambil<WeatherApiResponse>("/api/weather", "cuaca kabupaten"),
    refetchInterval: 15 * 60_000,
    ...QUERY,
  });
}

export function useDibi() {
  return useQuery({
    queryKey: ["beranda-alt", "dibi"],
    queryFn: () => ambil<DibiAcehResponse>("/api/dibi/aceh", "DIBI Aceh"),
    ...QUERY,
  });
}

export function usePrrpka() {
  return useQuery({
    queryKey: ["beranda-alt", "prrpka"],
    queryFn: () =>
      ambil<PrrpkaSummaryResponse>("/api/prrpka/summary", "ringkasan PRRPKA"),
    ...QUERY,
  });
}

export function useIrbi() {
  return useQuery({
    queryKey: ["beranda-alt", "irbi"],
    queryFn: async (): Promise<IrbiView> => {
      const raw = await ambil<{
        metadata?: Record<string, unknown>;
        kabupaten_kota?: Record<string, unknown>[];
      }>("/api/irbi", "IRBI 2025");
      const meta = raw.metadata ?? {};
      const kabupaten = (raw.kabupaten_kota ?? [])
        .map((row) => ({
          kabupaten_kota: teks(row.kabupaten_kota, "Tanpa nama"),
          irb_2025: nomor(row.irb_2025),
          kelas_risiko: teks(row.kelas_risiko, "TIDAK DIKETAHUI"),
          ancaman_tertinggi: teks(row.ancaman_tertinggi, "tidak tercatat"),
          skor_ancaman_tertinggi: nomor(row.skor_ancaman_tertinggi),
          kelas_ancaman_tertinggi: teks(row.kelas_ancaman_tertinggi, ""),
        }))
        .sort((a, b) => b.irb_2025 - a.irb_2025);

      return {
        nilai_irb_provinsi: nomor(meta.nilai_irb_provinsi),
        kelas_risiko_provinsi: teks(meta.kelas_risiko_provinsi, "TIDAK DIKETAHUI"),
        jumlah_penduduk_2025: nomor(meta.jumlah_penduduk_2025),
        total_kabupaten_kota: nomor(meta.total_kabupaten_kota) || kabupaten.length,
        luas_wilayah_km2: nomor(meta.luas_wilayah_km2),
        tahun: nomor(meta.tahun) || 2025,
        kabupaten,
      };
    },
    ...QUERY,
  });
}

const FASE_LABEL: Record<string, string> = {
  tanggap_darurat: "Tanggap darurat",
  mitigasi: "Mitigasi",
  penanganan: "Penanganan",
  kesiapsiagaan: "Kesiapsiagaan",
  rehabilitasi: "Rehabilitasi",
};

export function useAnggaran() {
  return useQuery({
    queryKey: ["beranda-alt", "anggaran"],
    queryFn: async (): Promise<AnggaranView> => {
      const raw = await ambil<{
        analisis?: {
          metadata?: Record<string, unknown>;
          per_fase?: Record<string, { kegiatan?: number; anggaran_rp?: number }>;
          perbandingan_2025_2026?: Record<string, unknown>;
        };
      }>("/api/anggaran", "anggaran APBA");

      const analisis = raw.analisis ?? {};
      const meta = analisis.metadata ?? {};
      const perFase = Object.entries(analisis.per_fase ?? {})
        .map(([key, value]) => ({
          fase: FASE_LABEL[key] ?? teks(key),
          kegiatan: nomor(value?.kegiatan),
          rp: nomor(value?.anggaran_rp),
        }))
        .sort((a, b) => b.rp - a.rp);

      return {
        tahun: nomor(meta.tahun_anggaran) || 2026,
        sumber: teks(meta.sumber, "APBA"),
        totalRp: nomor(meta.total_anggaran_rp),
        totalKegiatan: nomor(meta.total_kegiatan),
        perFase,
        perubahanPct: nomor(analisis.perbandingan_2025_2026?.persentase_perubahan),
      };
    },
    ...QUERY,
  });
}
