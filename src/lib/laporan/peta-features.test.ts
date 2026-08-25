import assert from "node:assert/strict";
import { test } from "node:test";
import { kejadianRowToFeature, penangananRowToFeature } from "./peta-features";
import type { PublicPetaKejadian, PublicPetaPenanganan } from "./status";

test("kejadian overlay uses laporanKejadian and omits jawaban_json", () => {
  const row: PublicPetaKejadian = {
    id: "k1",
    nomor_laporan: "KJD-20260825-0001",
    jenis_bencana: "banjir",
    latitude: 5.55,
    longitude: 95.32,
    kabupaten_kota: "Banda Aceh",
    kecamatan: null,
    desa: null,
    skor_urgensi: 4,
    submitted_at: "2026-08-25T00:00:00.000Z",
    laporan_tipe: "kejadian",
  };
  const f = kejadianRowToFeature(row);
  assert.equal(f.properties?.layer, "laporanKejadian");
  assert.equal(f.properties?.title, "KJD-20260825-0001");
  assert.equal("jawaban_json" in (f.properties ?? {}), false);
});

test("penanganan overlay uses laporanPenanganan", () => {
  const row: PublicPetaPenanganan = {
    id: "p1",
    nomor_laporan: "PNG-20260825-0001",
    jenis_bencana: "banjir",
    tipe_laporan: "bantuan_diterima",
    fase_penanganan: null,
    status_kebutuhan_sisa: null,
    tanggal_penanganan: "2026-08-24",
    deskripsi_penanganan: "Distribusi air di desa X",
    latitude: 5.5,
    longitude: 95.3,
    kabupaten_kota: "Aceh Besar",
    kecamatan: null,
    desa: null,
    submitted_at: "2026-08-25T00:00:00.000Z",
    laporan_tipe: "penanganan",
  };
  const f = penangananRowToFeature(row);
  assert.equal(f.properties?.layer, "laporanPenanganan");
  assert.equal("jawaban_json" in (f.properties ?? {}), false);
});
