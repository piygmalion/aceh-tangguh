import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { AdminProfile } from "../auth/types";
import { destanaLevelFromIndex } from "./pkd";
import {
  authorizeDestanaProgramWrite,
  DESTANA_AKTIVITAS_KODE,
  looksLikeNik,
  parseKodeDesaAceh,
  PASAL_8_AKTIVITAS,
  penilaianBerikutnya,
  PKD_KE_PASAL_8,
} from "./destana-program";

function desa(kode = "1101010001"): AdminProfile {
  return {
    userId: "u-desa",
    email: "desa@example.test",
    role: "admin_desa",
    displayName: "desa",
    createdAt: "2026-01-01T00:00:00.000Z",
    kodeKabupaten: "1101",
    kabupaten: null,
    kodeKecamatan: null,
    kecamatan: null,
    kodeDesaKelurahan: kode,
    desa: null,
  };
}

describe("kontrak Destana AN-7 (AN-13)", () => {
  it("17 huruf Pasal 8 a–q terkunci dan 32 indikator terpetakan ke huruf itu", () => {
    assert.equal(DESTANA_AKTIVITAS_KODE.join(""), "abcdefghijklmnopq");
    assert.equal(DESTANA_AKTIVITAS_KODE.length, 17);
    const nums = Object.keys(PKD_KE_PASAL_8).map(Number).sort((a, b) => a - b);
    assert.deepEqual(nums, Array.from({ length: 32 }, (_, i) => i + 1));
    for (const letters of Object.values(PKD_KE_PASAL_8)) {
      for (const letter of letters) {
        assert.equal(DESTANA_AKTIVITAS_KODE.includes(letter), true, letter);
        assert.equal(typeof PASAL_8_AKTIVITAS[letter], "string");
      }
    }
  });

  it("ambang PKD 68,33 tetap madya — rumus tidak diganti Perban", () => {
    assert.equal(destanaLevelFromIndex(68.33), "madya");
    assert.equal(destanaLevelFromIndex(83.33), "madya");
    assert.equal(destanaLevelFromIndex(83.34), "utama");
    const pkd = readFileSync(join(process.cwd(), "src/lib/sik/pkd.ts"), "utf8");
    assert.equal(pkd.includes("perban-7-2025"), false);
  });

  it("kode desa Aceh 10 digit diawali 11; NIK 16 digit ditolak", () => {
    assert.equal(parseKodeDesaAceh("1101010001"), "1101010001");
    assert.equal(parseKodeDesaAceh("1201010001"), null);
    assert.equal(parseKodeDesaAceh("110101000"), null);
    assert.equal(looksLikeNik("1234567890123456"), true);
    assert.equal(looksLikeNik("BPBD Aceh"), false);
  });

  it("admin desa hanya menulis desanya; kab tidak menulis", () => {
    const writeOwn = authorizeDestanaProgramWrite(desa(), "1101010001");
    const writeOther = authorizeDestanaProgramWrite(desa(), "1101020001");
    const kab: AdminProfile = { ...desa(), role: "admin_kabkota", kodeDesaKelurahan: null };
    assert.equal(writeOwn.ok, true);
    assert.equal(writeOther.ok, false);
    assert.equal(authorizeDestanaProgramWrite(kab, "1101010001").ok, false);
  });

  it("penilaian berikutnya = tahun tugas + 3", () => {
    assert.equal(penilaianBerikutnya(2024), 2027);
    assert.equal(penilaianBerikutnya(null), null);
  });

  it("messages id+en memuat teks instrumen transisi AN-7", () => {
    const id = JSON.parse(readFileSync(join(process.cwd(), "messages/id.json"), "utf8")) as {
      destanaProgram?: { instrumentTransisi?: string };
    };
    const en = JSON.parse(readFileSync(join(process.cwd(), "messages/en.json"), "utf8")) as {
      destanaProgram?: { instrumentTransisi?: string };
    };
    assert.equal(id.destanaProgram?.instrumentTransisi, "Instrumen transisi Perka BNPB 1/2012");
    assert.equal(
      en.destanaProgram?.instrumentTransisi,
      "Transitional instrument: BNPB Regulation 1/2012"
    );
  });
});
