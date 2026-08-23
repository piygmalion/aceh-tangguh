import type { Feature, Point } from "geojson";
import { getPetaKejadianPublik } from "./service";

export async function laporanKejadianToFeatures(): Promise<Feature<Point>[]> {
  const items = await getPetaKejadianPublik();
  return items.map((row) => {
    const jawaban =
      typeof row.jawaban_json === "object" && row.jawaban_json !== null
        ? (row.jawaban_json as Record<string, unknown>)
        : {};
    const title =
      typeof jawaban.deskripsi_kejadian === "string"
        ? jawaban.deskripsi_kejadian.slice(0, 80)
        : row.nomor_laporan;

    return {
      type: "Feature",
      id: `laporan-kejadian-${row.id}`,
      geometry: {
        type: "Point",
        coordinates: [row.longitude, row.latitude],
      },
      properties: {
        layer: "citizenReports",
        title,
        status: "approved",
        kabupaten: row.kabupaten_kota,
        kecamatan: row.kecamatan ?? undefined,
        desa: row.desa ?? undefined,
        jenis_bencana: row.jenis_bencana,
        skor_urgensi: row.skor_urgensi,
        nomor_laporan: row.nomor_laporan,
        laporan_tipe: "kejadian",
        source: "laporan_masyarakat",
        submitted_at: row.submitted_at,
      },
    };
  });
}
