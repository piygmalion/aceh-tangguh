import { findJenisByKode } from "@/lib/sik/jenis-bencana";
import { findKabupaten } from "@/lib/sik/juklak";

export type KunciStatisKejadian = {
  kode_jenis: number | null;
  kode_kabupaten: string | null;
  kode_kabupaten_kib: string | null;
  kib_sumber: string;
  kode_kecamatan: string | null;
  kode_desa_kelurahan: string | null;
  kib_catatan: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  kib: string | null;
};

export type KunciStatisResult = {
  ok: boolean;
  errors: string[];
};

const KIB_16 = /^\d{16}$/;
const KEC_6 = /^\d{6}$/;
const DESA_10 = /^\d{10}$/;

function isLepasDarat(sumber: string): boolean {
  return sumber === "episentrum" || sumber === "laut";
}

/** Digit after the decimal in the stored representation. Never pads to invent decimals. */
export function countStoredDecimalDigits(value: number | string): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    const raw = String(value);
    if (/e/i.test(raw)) {
      const sci = raw.match(/\.(\d+)e/i);
      return sci ? sci[1].length : 0;
    }
    const match = raw.match(/\.(\d+)/);
    return match ? match[1].length : 0;
  }
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (/e/i.test(trimmed)) {
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return null;
    const sci = trimmed.match(/\.(\d+)e/i);
    return sci ? sci[1].length : 0;
  }
  const match = trimmed.match(/\.(\d+)/);
  return match ? match[1].length : 0;
}

function coordHasSixDecimals(value: number | string | null | undefined): boolean {
  if (value == null || value === "") return false;
  const digits = countStoredDecimalDigits(value);
  return digits != null && digits >= 6;
}

export function evaluateKunciStatis(
  kejadian: KunciStatisKejadian,
  dampakRows: readonly unknown[]
): KunciStatisResult {
  const errors: string[] = [];
  const sumber = (kejadian.kib_sumber ?? "").trim();

  if (dampakRows.length < 1) {
    errors.push("minimal satu kejadian_dampak");
  }

  if (kejadian.kode_jenis == null || !findJenisByKode(kejadian.kode_jenis)) {
    errors.push("kode_jenis tidak ada di katalog");
  }

  const kab = findKabupaten(kejadian.kode_kabupaten);
  const kabKib = findKabupaten(kejadian.kode_kabupaten_kib);
  if (!kab && !(isLepasDarat(sumber) && kabKib)) {
    errors.push("kode_kabupaten / kode_kabupaten_kib tidak lolos findKabupaten");
  }

  if (sumber === "lokasi") {
    const kabKode = kab?.kode ?? (kejadian.kode_kabupaten ?? "").trim();
    const kec = (kejadian.kode_kecamatan ?? "").trim();
    const desa = (kejadian.kode_desa_kelurahan ?? "").trim();
    if (!KEC_6.test(kec) || !kec.startsWith(kabKode)) {
      errors.push("kode_kecamatan harus 6 digit berawalan kode_kabupaten");
    }
    if (!DESA_10.test(desa) || !desa.startsWith(kec)) {
      errors.push("kode_desa_kelurahan harus 10 digit berawalan kode_kecamatan");
    }
  }

  if (isLepasDarat(sumber) && !(kejadian.kib_catatan ?? "").trim()) {
    errors.push("kib_catatan wajib jika kib_sumber episentrum atau laut");
  }

  if (!coordHasSixDecimals(kejadian.latitude) || !coordHasSixDecimals(kejadian.longitude)) {
    errors.push("latitude/longitude harus ada dan ≥6 digit desimal");
  }

  if (!KIB_16.test((kejadian.kib ?? "").trim())) {
    errors.push("kib harus 16 digit");
  }

  return { ok: errors.length === 0, errors };
}

export function todayJakartaYmd(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function lacksDampakPadaTanggal(
  dampakTanggal: readonly (string | null | undefined)[],
  tanggal: string
): boolean {
  return !dampakTanggal.some((t) => (t ?? "").slice(0, 10) === tanggal);
}
