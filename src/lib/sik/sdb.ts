import type {
  SdbJadwalKirimRow,
  SdbJadwalStatus,
  SdbKatalogRow,
  SdbKelasAkses,
  SdbPeriodeKirim,
  SdbValidasiStatus,
} from "./db-tables";

export const SDB_KELAS_AKSES_STAF = ["terbuka", "terbatas", "rahasia"] as const;
export type SdbKelasAksesStaf = (typeof SDB_KELAS_AKSES_STAF)[number];

export const SDB_PERIODE_KIRIM = [
  "harian",
  "bulanan",
  "triwulan",
  "semester",
  "tahunan",
  "insidental",
] as const;

const KATALOG_PATCH_KEYS = new Set([
  "judul",
  "konsep",
  "definisi",
  "satuan",
  "periode_kirim",
]);

export type SdbParseFail = { ok: false; status: 400; error: string };
export type SdbParseOk<T> = { ok: true; value: T };

function isRecord(body: unknown): body is Record<string, unknown> {
  return Boolean(body) && typeof body === "object" && !Array.isArray(body);
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseKelasAksesQuery(
  raw: string | null
): SdbParseOk<SdbKelasAksesStaf | null> | SdbParseFail {
  if (raw == null || raw === "") return { ok: true, value: null };
  if ((SDB_KELAS_AKSES_STAF as readonly string[]).includes(raw)) {
    return { ok: true, value: raw as SdbKelasAksesStaf };
  }
  return { ok: false, status: 400, error: "kelas_akses" };
}

export function filterKatalogUntukStaf<T extends { kelas_akses: string }>(
  rows: T[],
  kelas: SdbKelasAksesStaf | null = null
): T[] {
  const visible = rows.filter((row) => row.kelas_akses !== "sangat_rahasia");
  if (!kelas) return visible;
  return visible.filter((row) => row.kelas_akses === kelas);
}

export function todayJakarta(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now);
}

export function statusJadwalUntukRespons(
  row: { jatuh_tempo: string; status: string },
  today: string
): SdbJadwalStatus | string {
  const jatuh = row.jatuh_tempo.slice(0, 10);
  if (row.status === "terbuka" && jatuh < today) return "terlambat";
  return row.status;
}

export function tandaiJadwalTerlambat<T extends { jatuh_tempo: string; status: string }>(
  rows: T[],
  today: string
): Array<Omit<T, "status"> & { status: T["status"] | "terlambat" }> {
  return rows.map((row) => ({
    ...row,
    status: statusJadwalUntukRespons(row, today) as T["status"] | "terlambat",
  }));
}

export type KatalogPatch = {
  judul?: string;
  konsep?: string;
  definisi?: string;
  satuan?: string | null;
  periode_kirim?: SdbPeriodeKirim;
};

export function parseKatalogPatch(body: unknown): SdbParseOk<KatalogPatch> | SdbParseFail {
  if (!isRecord(body)) return { ok: false, status: 400, error: "invalid" };
  const keys = Object.keys(body);
  if (keys.length === 0) return { ok: false, status: 400, error: "empty" };
  for (const key of keys) {
    if (!KATALOG_PATCH_KEYS.has(key)) return { ok: false, status: 400, error: key };
  }

  const patch: KatalogPatch = {};
  if ("judul" in body) {
    const judul = asNonEmptyString(body.judul);
    if (!judul) return { ok: false, status: 400, error: "judul" };
    patch.judul = judul;
  }
  if ("konsep" in body) {
    const konsep = asNonEmptyString(body.konsep);
    if (!konsep) return { ok: false, status: 400, error: "konsep" };
    patch.konsep = konsep;
  }
  if ("definisi" in body) {
    const definisi = asNonEmptyString(body.definisi);
    if (!definisi) return { ok: false, status: 400, error: "definisi" };
    patch.definisi = definisi;
  }
  if ("satuan" in body) {
    if (body.satuan == null) {
      patch.satuan = null;
    } else if (typeof body.satuan === "string") {
      patch.satuan = body.satuan.trim() || null;
    } else {
      return { ok: false, status: 400, error: "satuan" };
    }
  }
  if ("periode_kirim" in body) {
    if (
      typeof body.periode_kirim !== "string" ||
      !(SDB_PERIODE_KIRIM as readonly string[]).includes(body.periode_kirim)
    ) {
      return { ok: false, status: 400, error: "periode_kirim" };
    }
    patch.periode_kirim = body.periode_kirim as SdbPeriodeKirim;
  }
  return { ok: true, value: patch };
}

export type ValidasiPost = {
  status: Exclude<SdbValidasiStatus, "diterima">;
  catatan: string | null;
};

export function parseValidasiPost(body: unknown): SdbParseOk<ValidasiPost> | SdbParseFail {
  if (!isRecord(body)) return { ok: false, status: 400, error: "invalid" };
  for (const key of Object.keys(body)) {
    if (key !== "status" && key !== "catatan") {
      return { ok: false, status: 400, error: key };
    }
  }
  const status = body.status;
  if (status === "diterima") {
    return { ok: false, status: 400, error: "diterima" };
  }
  if (status !== "diajukan" && status !== "dikembalikan") {
    return { ok: false, status: 400, error: "status" };
  }
  const rawCatatan = body.catatan;
  let catatan: string | null = null;
  if (rawCatatan != null) {
    if (typeof rawCatatan !== "string") return { ok: false, status: 400, error: "catatan" };
    catatan = rawCatatan.trim() || null;
  }
  if (status === "dikembalikan" && !catatan) {
    return { ok: false, status: 400, error: "catatan" };
  }
  return { ok: true, value: { status, catatan } };
}

export type JadwalPost = {
  kunci: string;
  periode_label: string;
  jatuh_tempo: string;
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function parseJadwalPost(body: unknown): SdbParseOk<JadwalPost> | SdbParseFail {
  if (!isRecord(body)) return { ok: false, status: 400, error: "invalid" };
  for (const key of Object.keys(body)) {
    if (key !== "kunci" && key !== "periode_label" && key !== "jatuh_tempo") {
      return { ok: false, status: 400, error: key };
    }
  }
  const kunci = asNonEmptyString(body.kunci);
  const periode_label = asNonEmptyString(body.periode_label);
  const jatuh_tempo = asNonEmptyString(body.jatuh_tempo);
  if (!kunci) return { ok: false, status: 400, error: "kunci" };
  if (!periode_label) return { ok: false, status: 400, error: "periode_label" };
  if (!jatuh_tempo || !DATE_ONLY.test(jatuh_tempo)) {
    return { ok: false, status: 400, error: "jatuh_tempo" };
  }
  return { ok: true, value: { kunci, periode_label, jatuh_tempo } };
}

export function parseJadwalPatch(body: unknown): SdbParseOk<{ status: "terkirim" }> | SdbParseFail {
  if (!isRecord(body)) return { ok: false, status: 400, error: "invalid" };
  const keys = Object.keys(body);
  if (keys.length === 0) return { ok: false, status: 400, error: "empty" };
  for (const key of keys) {
    if (key !== "status") return { ok: false, status: 400, error: key };
  }
  if (body.status !== "terkirim") return { ok: false, status: 400, error: "status" };
  return { ok: true, value: { status: "terkirim" } };
}
