import type { AdminProfile } from "@/lib/auth/types";
import { findKabupaten } from "@/lib/sik/juklak";
import { isKabScoped, scopeKabupaten } from "@/lib/sik/roles";

export type LaporanKabFilter = { kode: string; nama: string };

export type LaporanListDecision =
  | { ok: true; filter: LaporanKabFilter | null }
  | { ok: false; status: 403; error: "forbidden" };

function catalogFromScope(profile: AdminProfile | null): LaporanKabFilter | null {
  if (!isKabScoped(profile)) return null;
  const scope = scopeKabupaten(profile);
  if (!scope) return null;
  const kab = findKabupaten(scope);
  if (!kab) return null;
  return { kode: kab.kode, nama: kab.nama };
}

/** List/summary GET laporan_*. Kab tanpa profil katalog → 403. */
export function authorizeLaporanList(profile: AdminProfile | null): LaporanListDecision {
  if (!isKabScoped(profile)) return { ok: true, filter: null };
  const filter = catalogFromScope(profile);
  if (!filter) return { ok: false, status: 403, error: "forbidden" };
  return { ok: true, filter };
}

/** Baris laporan lolos jika kabupaten_kota mengenai kode/nama katalog yang sama dengan scope. */
export function matchesLaporanKabScope(
  profile: AdminProfile | null,
  kabupatenKota: string | null | undefined,
): boolean {
  if (!isKabScoped(profile)) return true;
  const filter = catalogFromScope(profile);
  if (!filter) return false;
  const row = findKabupaten(kabupatenKota);
  if (!row) return false;
  return row.kode === filter.kode;
}

/** Tabel reports warisan tidak punya kolom kab — kab ditolak. */
export function authorizeLegacyReports(
  profile: AdminProfile | null,
): { ok: true } | { ok: false; status: 403; error: "forbidden" } {
  if (isKabScoped(profile)) return { ok: false, status: 403, error: "forbidden" };
  return { ok: true };
}

export function laporanKabOrFilter(filter: LaporanKabFilter): string {
  return `kabupaten_kota.eq.${filter.kode},kabupaten_kota.eq.${filter.nama}`;
}
