import type { AdminProfile } from "@/lib/auth/types";
import { isDesaRole, isKabScoped, normalizedRole, scopeDesa, scopeKabupaten } from "@/lib/sik/roles";

export const INSTRUMEN_PKD = "perka-1-2012" as const;
export const INSTRUMEN_PROGRAM = "perban-7-2025" as const;

export const DESTANA_AKTIVITAS_KODE = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "m",
  "n",
  "o",
  "p",
  "q",
] as const;

export type DestanaAktivitasKode = (typeof DESTANA_AKTIVITAS_KODE)[number];
export type DestanaAktivitasStatus = "belum" | "berjalan" | "selesai";

export const DESTANA_AKTIVITAS_STATUS = ["belum", "berjalan", "selesai"] as const;

/** Pasal 8 huruf a–q. Teks operasional, bukan skor. */
export const PASAL_8_AKTIVITAS: Record<DestanaAktivitasKode, string> = {
  a: "Pengintegrasian layanan dasar sektor pembangunan dengan pengelolaan risiko bencana",
  b: "Penyusunan peraturan dan kebijakan PB tingkat desa/kelurahan",
  c: "Pengembangan tata kelola lokal pada pelaku lokal",
  d: "Pengembangan kapasitas masyarakat",
  e: "Penilaian Ketangguhan Desa dan Kelurahan",
  f: "Identifikasi jenis dan karakteristik ancaman",
  g: "Identifikasi kerentanan dan kapasitas aset berisiko",
  h: "Pembentukan FPRB desa/kelurahan",
  i: "Pembentukan Tim Relawan Penanggulangan Bencana",
  j: "Identifikasi sumber daya dan pengetahuan lokal",
  k: "Penilaian risiko bencana",
  l: "Membangun jejaring kemitraan",
  m: "Perencanaan PB berbasis masyarakat",
  n: "Pelaksanaan rencana PB berbasis masyarakat",
  o: "Pengintegrasian rencana PB dalam perencanaan pembangunan lokal",
  p: "Perencanaan penanggulangan kedaruratan berbasis masyarakat",
  q: "Peningkatan kapasitas akses sumber daya, pembiayaan, teknologi, dan informasi",
};

/** Indikator PKD 1–32 → huruf Pasal 8. Bukan bobot. */
export const PKD_KE_PASAL_8: Record<number, readonly DestanaAktivitasKode[]> = {
  1: ["a"],
  2: ["a"],
  3: ["a"],
  4: ["a"],
  5: ["a"],
  6: ["a", "q"],
  7: ["a", "q"],
  8: ["a"],
  9: ["a", "f"],
  10: ["a", "j"],
  11: ["a", "j"],
  12: ["a"],
  13: ["a", "d"],
  14: ["a", "d"],
  15: ["e", "f", "g", "k"],
  16: ["b", "m", "o"],
  17: ["d"],
  18: ["c", "h", "i"],
  19: ["l", "q"],
  20: ["f", "n"],
  21: ["g", "n"],
  22: ["d"],
  23: ["p"],
  24: ["p"],
  25: ["p"],
  26: ["p"],
  27: ["p"],
  28: ["d", "p"],
  29: ["e", "n"],
  30: ["n"],
  31: ["n", "q"],
  32: ["n", "o"],
};

const NIK_ONLY = /^\d{16}$/;
const KODE_DESA_ACEH = /^11\d{8}$/;
const KODE_KAB_NUMERIK = /^\d{2,6}$/;

export function isDestanaAktivitasKode(value: string): value is DestanaAktivitasKode {
  return (DESTANA_AKTIVITAS_KODE as readonly string[]).includes(value);
}

export function isDestanaAktivitasStatus(value: string): value is DestanaAktivitasStatus {
  return (DESTANA_AKTIVITAS_STATUS as readonly string[]).includes(value);
}

export function parseKodeDesaAceh(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const kode = value.trim();
  return KODE_DESA_ACEH.test(kode) ? kode : null;
}

export function looksLikeNik(value: string): boolean {
  return NIK_ONLY.test(value.trim());
}

export function parseDestanaTeksBebas(value: unknown): { ok: true; value: string } | { ok: false; error: string } {
  if (typeof value !== "string") return { ok: false, error: "teks wajib" };
  const trimmed = value.trim();
  if (looksLikeNik(trimmed)) return { ok: false, error: "nik_dilarang" };
  return { ok: true, value: trimmed };
}

export function penilaianBerikutnya(tahunTugasPkd: number | null | undefined): number | null {
  if (tahunTugasPkd == null || !Number.isInteger(tahunTugasPkd) || tahunTugasPkd < 2000) return null;
  return tahunTugasPkd + 3;
}

export function canWriteDestanaProgram(profile: AdminProfile | null): boolean {
  return isDesaRole(profile) || normalizedRole(profile?.role) === "super_admin";
}

export function authorizeDestanaProgramRead(
  profile: AdminProfile | null,
  kodeDesa: string
): { ok: true } | { ok: false; status: 403; error: string } {
  const desa = scopeDesa(profile);
  if (desa) {
    return desa === kodeDesa ? { ok: true } : { ok: false, status: 403, error: "scope_desa" };
  }
  if (isKabScoped(profile)) {
    const kab = scopeKabupaten(profile);
    if (kab && KODE_KAB_NUMERIK.test(kab) && !kodeDesa.startsWith(kab)) {
      return { ok: false, status: 403, error: "scope_kabupaten" };
    }
    return { ok: true };
  }
  return { ok: true };
}

export function authorizeDestanaProgramWrite(
  profile: AdminProfile | null,
  kodeDesa: string
): { ok: true } | { ok: false; status: 403; error: string } {
  if (!canWriteDestanaProgram(profile)) {
    return { ok: false, status: 403, error: "forbidden" };
  }
  if (isDesaRole(profile)) {
    const desa = scopeDesa(profile);
    if (!desa || desa !== kodeDesa) return { ok: false, status: 403, error: "scope_desa" };
  }
  return { ok: true };
}

export function emptyAktivitasSlots(): Array<{
  kode_aktivitas: DestanaAktivitasKode;
  label: string;
  status: DestanaAktivitasStatus;
  catatan: string | null;
}> {
  return DESTANA_AKTIVITAS_KODE.map((kode) => ({
    kode_aktivitas: kode,
    label: PASAL_8_AKTIVITAS[kode],
    status: "belum",
    catatan: null,
  }));
}
