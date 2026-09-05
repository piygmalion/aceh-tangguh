import type { Feature, FeatureCollection, Point } from "geojson";
import { fetchAllRows } from "@/lib/supabase/fallback";
import { createServerClient, type TypedSupabaseClient } from "@/lib/supabase/server";
import type { KejadianDampakRow, KejadianOperasiRow } from "@/lib/sik/db-tables";
import { toDisasterJenisLabel } from "@/lib/sik/jenis-bencana";
import { opsToKejadianRow } from "@/lib/sik/map-kejadian";
import type { KejadianRow } from "@/lib/kejadian-types";

async function loadLatestDampak(
  client: TypedSupabaseClient,
  ids: string[]
): Promise<Map<string, KejadianDampakRow>> {
  const map = new Map<string, KejadianDampakRow>();
  if (ids.length === 0) return map;
  const { data } = await client
    .from("kejadian_dampak")
    .select("*")
    .in("kejadian_id", ids)
    .order("tanggal", { ascending: false });
  for (const row of (data ?? []) as KejadianDampakRow[]) {
    if (!map.has(row.kejadian_id)) map.set(row.kejadian_id, row);
  }
  return map;
}

export async function loadKejadianOperasiPublik(): Promise<KejadianOperasiRow[]> {
  const client = createServerClient();
  if (!client) return [];
  try {
    const rows = await fetchAllRows<KejadianOperasiRow>((from, to) =>
      client
        .from("kejadian_operasi")
        .select("*")
        .in("status", ["aktif", "selesai"])
        .order("waktu_kejadian", { ascending: false })
        .range(from, to)
    );
    return rows;
  } catch {
    return [];
  }
}

export async function loadKejadianOperasiAsRows(): Promise<KejadianRow[]> {
  const client = createServerClient();
  if (!client) return [];
  const ops = await loadKejadianOperasiPublik();
  if (ops.length === 0) return [];
  const latest = await loadLatestDampak(client, ops.map((r) => r.id));
  return ops.map((row) => opsToKejadianRow(row, latest.get(row.id) ?? null));
}

export async function loadOperasiMarkerFeatures(): Promise<Feature<Point>[]> {
  const ops = await loadKejadianOperasiPublik();
  return ops
    .filter((row) => row.latitude != null && row.longitude != null)
    .map((row) => {
      const jenis = toDisasterJenisLabel({
        kodeJenis: row.kode_jenis,
        jenis: row.jenis_bencana,
        namaKejadian: row.nama_kejadian,
      });
      return {
        type: "Feature" as const,
        id: `ops-${row.id}`,
        geometry: {
          type: "Point" as const,
          coordinates: [row.longitude as number, row.latitude as number],
        },
        properties: {
          layer: "disasterEvents",
          title: row.nama_kejadian,
          status: row.status,
          kabupaten: row.kabupaten ?? undefined,
          kecamatan: row.kecamatan ?? undefined,
          desa: row.desa_ringkas ?? undefined,
          jenis_bencana: jenis,
          nomor: row.nomor,
          source: "kejadian_operasi",
          waktu_kejadian: row.waktu_kejadian,
        },
      };
    });
}

export async function mergeOperasiDisasterEvents<T extends FeatureCollection>(
  fc: T
): Promise<T> {
  const extras = await loadOperasiMarkerFeatures();
  if (extras.length === 0) return fc;
  const existingIds = new Set(fc.features.map((f) => String(f.id ?? "")));
  const merged = extras.filter((f) => !existingIds.has(String(f.id)));
  return { ...fc, features: [...merged, ...fc.features] };
}

export async function loadPengungsianFeatures(): Promise<Feature<Point>[]> {
  const client = createServerClient();
  if (!client) return [];
  try {
    const { data } = await client
      .from("tempat_pengungsian")
      .select("id, nama, kabupaten, kecamatan, desa, latitude, longitude, kapasitas")
      .not("latitude", "is", null)
      .not("longitude", "is", null);
    return (data ?? [])
      .filter((row) => row.latitude != null && row.longitude != null)
      .map((row) => ({
        type: "Feature" as const,
        id: `pengungsian-${row.id}`,
        geometry: {
          type: "Point" as const,
          coordinates: [Number(row.longitude), Number(row.latitude)],
        },
        properties: {
          layer: "tendPoints",
          title: row.nama,
          kabupaten: row.kabupaten ?? undefined,
          kecamatan: row.kecamatan ?? undefined,
          desa: row.desa ?? undefined,
          kapasitas: row.kapasitas ?? undefined,
          source: "tempat_pengungsian",
        },
      }));
  } catch {
    return [];
  }
}

export async function mergePengungsianOverlays<T extends FeatureCollection>(
  fc: T
): Promise<T> {
  const extras = await loadPengungsianFeatures();
  if (extras.length === 0) return fc;
  const withoutRetired = fc.features.filter(
    (f) => String(f.properties?.layer ?? "") !== "tendPoints" || extras.length === 0
  );
  const existingIds = new Set(withoutRetired.map((f) => String(f.id ?? "")));
  const merged = extras.filter((f) => !existingIds.has(String(f.id)));
  return { ...fc, features: [...withoutRetired, ...merged] };
}
