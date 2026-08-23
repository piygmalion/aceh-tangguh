import { readFile } from "fs/promises";
import path from "path";
import type {
  AnalisisAnggaran,
  AnggaranApiResponse,
  KegiatanAnggaran,
  KegiatanFixture,
} from "./anggaran-types";
import {
  asRecord,
  fetchAllRows,
  trySupabaseThenFixture,
} from "./supabase/fallback";
import type { TypedSupabaseClient } from "./supabase/server";
import type { AnggaranAnalisisRow, AnggaranKegiatanRow } from "./supabase/types";

export {
  formatRpCompact,
  formatRpFull,
  pctOf,
} from "./anggaran-format";

let cache: AnggaranApiResponse | null = null;

function asAnalisis(payload: unknown): AnalisisAnggaran | null {
  const rec = asRecord(payload);
  if (!rec.metadata && rec.total_anggaran_rp == null && !rec.per_fase) {
    return null;
  }
  return rec as unknown as AnalisisAnggaran;
}

function kegiatanFromRow(row: AnggaranKegiatanRow): KegiatanAnggaran {
  const payload = asRecord(row.payload) as Partial<KegiatanAnggaran>;
  const skpd = Array.isArray(payload.skpd)
    ? payload.skpd
    : row.skpd
      ? [row.skpd]
      : [];
  return {
    ...(payload as KegiatanAnggaran),
    id: payload.id || row.id,
    nama_kegiatan: payload.nama_kegiatan || row.nama || "",
    fase_penanganan: payload.fase_penanganan || row.fase || "",
    kategori_kegiatan: payload.kategori_kegiatan || row.kategori || "",
    program: payload.program || "",
    kegiatan_apba: payload.kegiatan_apba || "",
    penanggung_jawab: payload.penanggung_jawab ?? [],
    skpd,
    kode_rekening: payload.kode_rekening ?? [],
    uraian_anggaran: payload.uraian_anggaran ?? [],
    jumlah_anggaran_rp: payload.jumlah_anggaran_rp ?? row.total_rp ?? 0,
    jumlah_item_anggaran: payload.jumlah_item_anggaran ?? 0,
    tahun_anggaran: payload.tahun_anggaran ?? row.tahun,
  };
}

async function loadAnggaranFromSupabase(
  client: TypedSupabaseClient
): Promise<AnggaranApiResponse | null> {
  const { data: analisisRow, error: analisisError } = await client
    .from("anggaran_analisis")
    .select("*")
    .eq("tahun", 2026)
    .maybeSingle();

  if (analisisError) throw new Error(analisisError.message);
  const analisis = analisisRow
    ? asAnalisis((analisisRow as AnggaranAnalisisRow).payload)
    : null;
  if (!analisis) return null;

  const rows = await fetchAllRows<AnggaranKegiatanRow>((from, to) =>
    client
      .from("anggaran_kegiatan")
      .select("*")
      .eq("tahun", 2026)
      .range(from, to)
  );
  if (rows.length === 0) return null;

  return {
    analisis,
    kegiatan: rows.map(kegiatanFromRow),
    source: "supabase",
  };
}

export async function loadAnggaranFixtures(): Promise<AnggaranApiResponse> {
  if (cache) return cache;

  const base = path.join(process.cwd(), "public/fixtures");
  const [analisisRaw, kegiatanRaw] = await Promise.all([
    readFile(path.join(base, "analisis-anggaran-2026.json"), "utf8"),
    readFile(path.join(base, "kegiatan-penanganan-2026.json"), "utf8"),
  ]);

  const analisis = JSON.parse(analisisRaw) as AnalisisAnggaran;
  const kegiatanFile = JSON.parse(kegiatanRaw) as KegiatanFixture;

  cache = {
    analisis,
    kegiatan: kegiatanFile.kegiatan ?? [],
    source: "fixture",
  };
  return cache;
}

export async function loadAnggaran(): Promise<AnggaranApiResponse> {
  const loaded = await trySupabaseThenFixture(
    loadAnggaranFromSupabase,
    loadAnggaranFixtures,
    {
      label: "anggaran",
      isEmpty: (value) =>
        !value.analisis || !Array.isArray(value.kegiatan) || value.kegiatan.length === 0,
    }
  );
  return { ...loaded.data, source: loaded.source };
}
