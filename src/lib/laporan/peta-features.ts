import type { Feature, FeatureCollection, Point } from "geojson";
import { getPetaKejadianPublik, getPetaPenangananPublik } from "./service";

/**
 * Live map overlays from `laporan_kejadian` / `laporan_penanganan`.
 *
 * There is no sync into `marker_features`. Approving a row and setting
 * `tampil_di_peta = true` is enough — the next `/api/layers/markers` fetch
 * queries the laporan tables directly.
 *
 * Public rows never include `jawaban_json` (PII / free-text dump).
 */

type KejadianRow = Awaited<ReturnType<typeof getPetaKejadianPublik>>[number];
type PenangananRow = Awaited<ReturnType<typeof getPetaPenangananPublik>>[number];

export function kejadianRowToFeature(row: KejadianRow): Feature<Point> {
  return {
    type: "Feature",
    id: `laporan-kejadian-${row.id}`,
    geometry: {
      type: "Point",
      coordinates: [row.longitude, row.latitude],
    },
    properties: {
      layer: "laporanKejadian",
      title: row.nomor_laporan,
      status: "approved",
      kabupaten: row.kabupaten_kota,
      kecamatan: row.kecamatan ?? undefined,
      desa: row.desa ?? undefined,
      jenis_bencana: row.jenis_bencana,
      skor_urgensi: row.skor_urgensi,
      nomor_laporan: row.nomor_laporan,
      laporan_tipe: "kejadian",
      source: "laporan_kejadian",
      submitted_at: row.submitted_at,
    },
  };
}

export function penangananRowToFeature(row: PenangananRow): Feature<Point> {
  const title =
    typeof row.deskripsi_penanganan === "string" && row.deskripsi_penanganan.trim()
      ? row.deskripsi_penanganan.slice(0, 80)
      : row.nomor_laporan;
  return {
    type: "Feature",
    id: `laporan-penanganan-${row.id}`,
    geometry: {
      type: "Point",
      coordinates: [row.longitude, row.latitude],
    },
    properties: {
      layer: "laporanPenanganan",
      title,
      status: "approved",
      kabupaten: row.kabupaten_kota,
      kecamatan: row.kecamatan ?? undefined,
      desa: row.desa ?? undefined,
      jenis_bencana: row.jenis_bencana,
      tipe_laporan: row.tipe_laporan,
      fase_penanganan: row.fase_penanganan ?? undefined,
      status_kebutuhan_sisa: row.status_kebutuhan_sisa ?? undefined,
      tanggal_penanganan: row.tanggal_penanganan,
      nomor_laporan: row.nomor_laporan,
      laporan_tipe: "penanganan",
      source: "laporan_penanganan",
      submitted_at: row.submitted_at,
    },
  };
}

export async function laporanKejadianToFeatures(): Promise<Feature<Point>[]> {
  const items = await getPetaKejadianPublik();
  return items.map(kejadianRowToFeature);
}

export async function laporanPenangananToFeatures(): Promise<Feature<Point>[]> {
  const items = await getPetaPenangananPublik();
  return items.map(penangananRowToFeature);
}

export async function laporanPublikToFeatures(): Promise<Feature<Point>[]> {
  const [kejadian, penanganan] = await Promise.all([
    laporanKejadianToFeatures(),
    laporanPenangananToFeatures(),
  ]);
  return [...kejadian, ...penanganan];
}

export async function mergeLaporanOverlays<T extends FeatureCollection>(
  fc: T
): Promise<T> {
  const laporanFeatures = await laporanPublikToFeatures();
  const withoutRetiredCitizen = fc.features.filter(
    (f) => String(f.properties?.layer ?? "") !== "citizenReports"
  );
  if (laporanFeatures.length === 0) {
    return { ...fc, features: withoutRetiredCitizen };
  }

  const existingIds = new Set(withoutRetiredCitizen.map((f) => String(f.id ?? "")));
  const merged = laporanFeatures.filter((f) => !existingIds.has(String(f.id)));
  return {
    ...fc,
    features: [...withoutRetiredCitizen, ...merged],
  };
}
