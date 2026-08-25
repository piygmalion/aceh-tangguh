import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fieldNumber, metricsFromRow, type MetricBundle } from "./profil-desa";
import type { ProfilDesaRow } from "@/lib/supabase/types";

function row(partial: Partial<ProfilDesaRow>): ProfilDesaRow {
  return {
    id: "PDESA-000001",
    kode_desa_kelurahan: "1101012001",
    nama: "Keude Bakongan",
    kabupaten: "Aceh Selatan",
    kecamatan: "Bakongan",
    kode_kabupaten: "1101",
    kode_kecamatan: "110101",
    kondisi_kode: "tidak_diketahui",
    kk: 387,
    populasi: 1611,
    kk_laki_laki: null,
    kk_perempuan: null,
    bayi_0_1: null,
    balita_1_4: null,
    anak_5_12: null,
    remaja_13_17: null,
    dewasa_18_59: null,
    lansia_60_plus: null,
    penyandang_disabilitas: null,
    kk_terdampak: 0,
    populasi_terdampak: 0,
    korban_meninggal: 0,
    korban_hilang: 0,
    rumah_rr: 58,
    rumah_rs: 1,
    rumah_rb: 0,
    total_rumah_rusak: 59,
    payload: {
      demografi: {
        jumlah_kk: 387,
        jumlah_populasi: 1611,
        kk_laki_laki: 281,
        kk_perempuan: 106,
        bayi_0_1: 7,
        balita_1_4: 71,
        anak_5_12: 165,
        remaja_13_17: 106,
        dewasa_18_59: 726,
        lansia_60_plus: 149,
        penyandang_disabilitas: 5,
      },
    },
    updated_at: "2026-08-25T00:00:00.000Z",
    ...partial,
  };
}

describe("profil-desa demografi extras", () => {
  it("reads extra counts from payload.demografi when columns are null", () => {
    const sample = row({});
    assert.equal(fieldNumber(sample, "kk_laki_laki"), 281);
    assert.equal(fieldNumber(sample, "penyandang_disabilitas"), 5);
    const metrics: MetricBundle = metricsFromRow(sample);
    assert.equal(metrics.kk_perempuan, 106);
    assert.equal(metrics.lansia_60_plus, 149);
    assert.equal(metrics.rumah_rr, 58);
  });

  it("prefers first-class columns over payload", () => {
    const sample = row({ kk_laki_laki: 10 });
    assert.equal(fieldNumber(sample, "kk_laki_laki"), 10);
  });
});
