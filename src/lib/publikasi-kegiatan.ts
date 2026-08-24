import { readFile } from "fs/promises";
import path from "path";
import { asRecord, trySupabaseThenFixture, type DomainSource } from "./supabase/fallback";
import type { TypedSupabaseClient } from "./supabase/server";
import type { PublikasiKegiatanRow } from "./supabase/types";

export const KEGIATAN_SLIDESHOW_LIMIT = 15;
export const KEGIATAN_INTERVAL_DETIK = 10;
export const KEGIATAN_SUMBER_URL = "https://bpba.acehprov.go.id";

export type PublikasiKegiatanPhoto = {
  urutan: number;
  peran: string;
  url: string;
  url_thumbnail?: string;
};

export type PublikasiKegiatanItem = {
  id: string;
  slug: string;
  judul: string;
  ringkasan: string;
  tanggal_publikasi: string;
  penulis: string;
  kategori: string;
  jenis_kegiatan: string;
  jenis_bencana: string | null;
  fase: string | null;
  lokasi_teks: string;
  url: string;
  foto_sampul_url: string | null;
  foto_sampul_thumbnail_url: string | null;
  jumlah_foto: number;
  kabupaten: string[];
  photos: PublikasiKegiatanPhoto[];
  sumber: string;
};

export type PublikasiKegiatanMetadata = {
  judul: string;
  sumber: string;
  total: number;
  ditampilkan: number;
  interval_detik: number;
};

export type PublikasiKegiatanFixture = {
  metadata: PublikasiKegiatanMetadata;
  kegiatan: PublikasiKegiatanItem[];
  slideshow: PublikasiKegiatanItem[];
};

export type PublikasiKegiatanListResponse = {
  metadata: PublikasiKegiatanMetadata;
  kegiatan: PublikasiKegiatanItem[];
  total: number;
  source: DomainSource;
};

const FALLBACK_META: PublikasiKegiatanMetadata = {
  judul: "Publikasi Kegiatan BPBA",
  sumber: KEGIATAN_SUMBER_URL,
  total: 0,
  ditampilkan: KEGIATAN_SLIDESHOW_LIMIT,
  interval_detik: KEGIATAN_INTERVAL_DETIK,
};

let cache: PublikasiKegiatanFixture | null = null;

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNullableString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asKabupaten(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.length > 0);
}

function asPhotos(value: unknown): PublikasiKegiatanPhoto[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((raw, index) => {
      const rec = asRecord(raw);
      const url = asString(rec.url);
      if (!url) return null;
      return {
        urutan: typeof rec.urutan === "number" ? rec.urutan : index + 1,
        peran: asString(rec.peran),
        url,
        url_thumbnail: asString(rec.url_thumbnail) || undefined,
      };
    })
    .filter((photo): photo is PublikasiKegiatanPhoto => photo !== null);
}

export function compareKegiatanDesc(
  a: Pick<PublikasiKegiatanItem, "id" | "tanggal_publikasi">,
  b: Pick<PublikasiKegiatanItem, "id" | "tanggal_publikasi">,
): number {
  const dateCmp = (b.tanggal_publikasi || "").localeCompare(a.tanggal_publikasi || "");
  if (dateCmp !== 0) return dateCmp;
  return (b.id || "").localeCompare(a.id || "");
}

export function kegiatanFromRow(row: PublikasiKegiatanRow): PublikasiKegiatanItem {
  return {
    id: row.id,
    slug: row.slug ?? "",
    judul: row.judul,
    ringkasan: row.ringkasan ?? "",
    tanggal_publikasi: row.tanggal_publikasi ?? "",
    penulis: row.penulis ?? "",
    kategori: row.kategori ?? "",
    jenis_kegiatan: row.jenis_kegiatan ?? "",
    jenis_bencana: row.jenis_bencana,
    fase: row.fase,
    lokasi_teks: row.lokasi_teks ?? "",
    url: row.url ?? "",
    foto_sampul_url: row.foto_sampul_url,
    foto_sampul_thumbnail_url: row.foto_sampul_thumbnail_url,
    jumlah_foto: row.jumlah_foto ?? 0,
    kabupaten: asKabupaten(row.kabupaten),
    photos: asPhotos(row.photos),
    sumber: row.sumber ?? KEGIATAN_SUMBER_URL,
  };
}

function asKegiatanItem(value: unknown): PublikasiKegiatanItem | null {
  const rec = asRecord(value);
  const id = asString(rec.id);
  const judul = asString(rec.judul);
  if (!id || !judul) return null;
  return {
    id,
    slug: asString(rec.slug),
    judul,
    ringkasan: asString(rec.ringkasan),
    tanggal_publikasi: asString(rec.tanggal_publikasi),
    penulis: asString(rec.penulis),
    kategori: asString(rec.kategori),
    jenis_kegiatan: asString(rec.jenis_kegiatan),
    jenis_bencana: asNullableString(rec.jenis_bencana),
    fase: asNullableString(rec.fase),
    lokasi_teks: asString(rec.lokasi_teks),
    url: asString(rec.url),
    foto_sampul_url: asNullableString(rec.foto_sampul_url),
    foto_sampul_thumbnail_url: asNullableString(rec.foto_sampul_thumbnail_url),
    jumlah_foto: typeof rec.jumlah_foto === "number" ? rec.jumlah_foto : 0,
    kabupaten: asKabupaten(rec.kabupaten),
    photos: asPhotos(rec.photos),
    sumber: asString(rec.sumber, KEGIATAN_SUMBER_URL),
  };
}

function asMetadata(payload: unknown): PublikasiKegiatanMetadata {
  const rec = asRecord(payload);
  return {
    judul: asString(rec.judul, FALLBACK_META.judul),
    sumber: asString(rec.sumber, FALLBACK_META.sumber),
    total: typeof rec.total === "number" ? rec.total : FALLBACK_META.total,
    ditampilkan:
      typeof rec.ditampilkan === "number" ? rec.ditampilkan : FALLBACK_META.ditampilkan,
    interval_detik:
      typeof rec.interval_detik === "number"
        ? rec.interval_detik
        : FALLBACK_META.interval_detik,
  };
}

export function selectSlideshow(
  items: PublikasiKegiatanItem[],
  limit = KEGIATAN_SLIDESHOW_LIMIT,
): PublikasiKegiatanItem[] {
  return [...items].sort(compareKegiatanDesc).slice(0, limit);
}

async function loadKegiatanFromSupabase(
  client: TypedSupabaseClient,
): Promise<PublikasiKegiatanListResponse | null> {
  const { data, error, count } = await client
    .from("publikasi_kegiatan")
    .select("*", { count: "exact" })
    .order("tanggal_publikasi", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(KEGIATAN_SLIDESHOW_LIMIT);

  if (error) throw new Error(error.message);
  if (!data?.length) return null;

  const kegiatan = data.map(kegiatanFromRow);
  const total = count ?? kegiatan.length;

  return {
    metadata: {
      ...FALLBACK_META,
      total,
      ditampilkan: Math.min(KEGIATAN_SLIDESHOW_LIMIT, kegiatan.length),
    },
    kegiatan,
    total,
    source: "supabase",
  };
}

export async function loadPublikasiKegiatanFixture(): Promise<PublikasiKegiatanFixture> {
  if (cache) return cache;
  const file = path.join(process.cwd(), "public/fixtures/publikasi-kegiatan.json");
  const raw = await readFile(file, "utf8");
  const data = JSON.parse(raw) as Partial<PublikasiKegiatanFixture>;
  const kegiatan = Array.isArray(data.kegiatan)
    ? data.kegiatan.map(asKegiatanItem).filter((item): item is PublikasiKegiatanItem => item !== null)
    : [];
  const slideshow = Array.isArray(data.slideshow)
    ? data.slideshow
        .map(asKegiatanItem)
        .filter((item): item is PublikasiKegiatanItem => item !== null)
    : [];
  cache = {
    metadata: asMetadata(data.metadata),
    kegiatan,
    slideshow,
  };
  return cache;
}

function listFromFixture(fixture: PublikasiKegiatanFixture): PublikasiKegiatanListResponse {
  const pool = fixture.kegiatan.length > 0 ? fixture.kegiatan : fixture.slideshow;
  const kegiatan = selectSlideshow(pool);
  const total =
    fixture.kegiatan.length > 0
      ? fixture.kegiatan.length
      : fixture.metadata.total || fixture.slideshow.length;
  return {
    metadata: {
      ...fixture.metadata,
      total,
      ditampilkan: Math.min(KEGIATAN_SLIDESHOW_LIMIT, kegiatan.length || fixture.metadata.ditampilkan),
      interval_detik: fixture.metadata.interval_detik || KEGIATAN_INTERVAL_DETIK,
    },
    kegiatan,
    total,
    source: "fixture",
  };
}

export async function getPublikasiKegiatanList(): Promise<PublikasiKegiatanListResponse> {
  const loaded = await trySupabaseThenFixture(
    loadKegiatanFromSupabase,
    async () => listFromFixture(await loadPublikasiKegiatanFixture()),
    {
      label: "publikasi-kegiatan",
      isEmpty: (value) => value.kegiatan.length === 0,
    },
  );
  return { ...loaded.data, source: loaded.source };
}
