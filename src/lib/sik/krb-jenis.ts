import type { KrbJenisKode } from "@/lib/krb-by-kab";

/**
 * Map Juklak BNPB jenis (101–109) onto krb_jenis_bahaya codes.
 * Non-alam / sosial (201–301) have no IRBI class — return null.
 * Do not invent a mapping when the jenis is outside the IRBI catalog.
 */
export function juklakToKrbJenis(input: {
  kodeJenis?: number | null;
  namaKejadian?: string | null;
}): KrbJenisKode | null {
  const kode = input.kodeJenis;
  if (kode == null) return null;
  const nama = input.namaKejadian ?? "";
  if (kode === 101) {
    if (/bandang/i.test(nama)) return "banjir_bandang";
    return "banjir";
  }
  if (kode === 102) return "tanah_longsor";
  if (kode === 103) return "gelombang_ekstrim_abrasi";
  if (kode === 104) return "cuaca_ekstrem";
  if (kode === 105) return "kekeringan";
  if (kode === 106) return "kebakaran_hutan_lahan";
  if (kode === 107) return "gempabumi";
  if (kode === 108) return "tsunami";
  if (kode === 109) return "letusan_gunung_api";
  return null;
}
