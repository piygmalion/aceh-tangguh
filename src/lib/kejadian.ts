import { readFile } from "fs/promises";
import path from "path";
import type {
  KejadianArahPeta,
  KejadianFixture,
  KejadianLokasi,
  KejadianRow,
} from "./kejadian-types";
import { isRekapitulasiTahunan } from "./disaster-jenis";
import {
  asRecord,
  fetchAllRows,
  readDocumentPayload,
  trySupabaseThenFixture,
  type DomainSource,
} from "./supabase/fallback";
import type { TypedSupabaseClient } from "./supabase/server";
import type { KejadianBencanaRow } from "./supabase/types";
import { loadKejadianOperasiAsRows } from "@/lib/sik/public";

export type {
  KejadianFacets,
  KejadianFixture,
  KejadianListResult,
  KejadianQuery,
  KejadianRow,
} from "./kejadian-types";
export {
  parseHariTanggal,
  buildFacets,
  filterKejadianRows,
  filterAndPaginateKejadian,
  findKejadianById,
  KEJADIAN_MAX_PAGE_SIZE,
} from "./kejadian-query";

let cache: KejadianFixture | null = null;

function normalizeKejadianFixture(parsed: KejadianFixture): KejadianFixture {
  const kejadian = (parsed.kejadian ?? []).filter(
    (r) => !isRekapitulasiTahunan(r.jenis_bencana)
  );
  return {
    ...parsed,
    kejadian,
    metadata: {
      ...(parsed.metadata ?? {}),
      total_kejadian_tercatat: kejadian.length,
    },
  };
}

function kejadianFromRow(row: KejadianBencanaRow): KejadianRow {
  const payload = asRecord(row.payload);
  const lokasi = { ...asRecord(payload.lokasi) } as KejadianLokasi;
  if (row.kabupaten) {
    lokasi.kabupaten = lokasi.kabupaten || row.kabupaten;
    lokasi.kabupaten_kota = lokasi.kabupaten_kota || row.kabupaten;
  }
  if (row.kecamatan) lokasi.kecamatan = lokasi.kecamatan || row.kecamatan;
  if (row.desa) lokasi.desa = lokasi.desa || row.desa;

  const arah = { ...asRecord(payload.arah_di_peta) } as KejadianArahPeta;
  if (row.latitude != null && arah.latitude == null) arah.latitude = row.latitude;
  if (row.longitude != null && arah.longitude == null) {
    arah.longitude = row.longitude;
  }

  const fromPayload = payload as Partial<KejadianRow>;
  return {
    ...fromPayload,
    id: row.id,
    jenis_bencana:
      (typeof fromPayload.jenis_bencana === "string" && fromPayload.jenis_bencana) ||
      row.jenis_bencana,
    hari_tanggal:
      (typeof fromPayload.hari_tanggal === "string" && fromPayload.hari_tanggal) ||
      row.hari_tanggal ||
      "",
    lokasi,
    arah_di_peta: Object.keys(arah).length ? arah : fromPayload.arah_di_peta,
  };
}

function fixtureFromDocument(payload: unknown): KejadianFixture | null {
  const rec = asRecord(payload);
  if (!Array.isArray(rec.kejadian) || rec.kejadian.length === 0) return null;
  return normalizeKejadianFixture({
    metadata: asRecord(rec.metadata),
    kejadian: rec.kejadian as KejadianRow[],
  });
}

async function loadKejadianFromSupabase(
  client: TypedSupabaseClient
): Promise<KejadianFixture | null> {
  const rows = await fetchAllRows<KejadianBencanaRow>((from, to) =>
    client.from("kejadian_bencana").select("*").range(from, to)
  );

  if (rows.length > 0) {
    const snapshot = await readDocumentPayload(client, "data_documents", [
      "kejadian-bencana",
      "kejadian_bencana",
    ]);
    const snapshotMeta = asRecord(asRecord(snapshot).metadata);
    return normalizeKejadianFixture({
      metadata: {
        ...snapshotMeta,
        total_kejadian_tercatat: rows.length,
      },
      kejadian: rows.map(kejadianFromRow),
    });
  }

  const snapshot = await readDocumentPayload(client, "data_documents", [
    "kejadian-bencana",
    "kejadian_bencana",
  ]);
  return fixtureFromDocument(snapshot);
}

export async function loadKejadianFixture(): Promise<KejadianFixture> {
  if (cache) return cache;
  const file = path.join(process.cwd(), "public/fixtures/kejadian-bencana.json");
  const raw = await readFile(file, "utf8");
  cache = normalizeKejadianFixture(JSON.parse(raw) as KejadianFixture);
  return cache;
}

export async function loadKejadian(): Promise<{
  data: KejadianFixture;
  source: DomainSource;
}> {
  const loaded = await trySupabaseThenFixture(loadKejadianFromSupabase, loadKejadianFixture, {
    label: "kejadian",
    isEmpty: (value) => value.kejadian.length === 0,
  });
  const ops = await loadKejadianOperasiAsRows().catch(() => []);
  if (ops.length === 0) return loaded;
  const existing = new Set(loaded.data.kejadian.map((r) => r.id));
  const merged = [...ops.filter((r) => !existing.has(r.id)), ...loaded.data.kejadian];
  return {
    source: loaded.source,
    data: {
      ...loaded.data,
      kejadian: merged,
      metadata: {
        ...loaded.data.metadata,
        total_kejadian_tercatat: merged.length,
      },
    },
  };
}
