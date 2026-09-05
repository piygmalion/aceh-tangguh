import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  countStoredDecimalDigits,
  evaluateKunciStatis,
  lacksDampakPadaTanggal,
  todayJakartaYmd,
  type KunciStatisKejadian,
} from "./kunci-statis";

const root = join(process.cwd());

function kejadian(over: Partial<KunciStatisKejadian> = {}): KunciStatisKejadian {
  return {
    kode_jenis: 107,
    kode_kabupaten: "1101",
    kode_kabupaten_kib: null,
    kib_sumber: "lokasi",
    kode_kecamatan: "110101",
    kode_desa_kelurahan: "1101012001",
    kib_catatan: null,
    latitude: 3.123456,
    longitude: 97.123456,
    kib: "1101107202609041",
    ...over,
  };
}

const dampak = [{ id: "d1" }];

describe("evaluateKunciStatis — delapan butir AN-8", () => {
  it("butir 1: gagal tanpa kejadian_dampak", () => {
    const r = evaluateKunciStatis(kejadian(), []);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes("kejadian_dampak")));
  });

  it("butir 2: gagal jika kode_jenis null atau di luar katalog", () => {
    const kosong = evaluateKunciStatis(kejadian({ kode_jenis: null }), dampak);
    assert.equal(kosong.ok, false);
    assert.ok(kosong.errors.some((e) => e.includes("kode_jenis")));

    const asing = evaluateKunciStatis(kejadian({ kode_jenis: 999 }), dampak);
    assert.equal(asing.ok, false);
    assert.ok(asing.errors.some((e) => e.includes("kode_jenis")));
  });

  it("butir 2: lolos jika findJenisByKode menemukan kode wizard", () => {
    const r = evaluateKunciStatis(kejadian({ kode_jenis: 101 }), dampak);
    assert.equal(r.errors.some((e) => e.includes("kode_jenis")), false);
  });

  it("butir 3: gagal jika kabupaten tidak lolos dan bukan jalur kib", () => {
    const r = evaluateKunciStatis(
      kejadian({ kode_kabupaten: "9999", kode_kabupaten_kib: null, kib_sumber: "lokasi" }),
      dampak
    );
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes("findKabupaten")));
  });

  it("butir 3: episentrum lolos lewat kode_kabupaten_kib meski kode_kabupaten kosong", () => {
    const r = evaluateKunciStatis(
      kejadian({
        kib_sumber: "episentrum",
        kode_kabupaten: null,
        kode_kabupaten_kib: "1101",
        kode_kecamatan: null,
        kode_desa_kelurahan: null,
        kib_catatan: "episentrum lepas pantai",
      }),
      dampak
    );
    assert.equal(r.errors.some((e) => e.includes("findKabupaten")), false);
    assert.equal(r.ok, true);
  });

  it("butir 4: lokasi gagal tanpa kode desa", () => {
    const r = evaluateKunciStatis(kejadian({ kode_desa_kelurahan: null }), dampak);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes("kode_desa_kelurahan")));
  });

  it("butir 4: lokasi gagal jika kecamatan bukan 6 digit berawalan kabupaten", () => {
    const r = evaluateKunciStatis(
      kejadian({ kode_kecamatan: "1102", kode_desa_kelurahan: "1102012001" }),
      dampak
    );
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes("kode_kecamatan")));
  });

  it("butir 5: episentrum tanpa desa lolos jika kib_catatan ada", () => {
    const r = evaluateKunciStatis(
      kejadian({
        kib_sumber: "episentrum",
        kode_kecamatan: null,
        kode_desa_kelurahan: null,
        kib_catatan: "BMKG M6.2",
      }),
      dampak
    );
    assert.equal(r.ok, true);
  });

  it("butir 5: laut gagal jika kib_catatan kosong; langkah 4 tidak wajib", () => {
    const r = evaluateKunciStatis(
      kejadian({
        kib_sumber: "laut",
        kode_kabupaten: null,
        kode_kabupaten_kib: "1171",
        kode_kecamatan: null,
        kode_desa_kelurahan: null,
        kib_catatan: "   ",
      }),
      dampak
    );
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes("kib_catatan")));
    assert.equal(r.errors.some((e) => e.includes("kode_desa_kelurahan")), false);
  });

  it("butir 6: gagal pada 5.12345 dan string yang sama; jangan mengarang desimal", () => {
    const angka = evaluateKunciStatis(kejadian({ latitude: 5.12345 }), dampak);
    assert.equal(angka.ok, false);
    assert.ok(angka.errors.some((e) => e.includes("latitude")));

    const teks = evaluateKunciStatis(kejadian({ latitude: "5.12345" }), dampak);
    assert.equal(teks.ok, false);

    assert.equal(countStoredDecimalDigits(5.12345), 5);
    assert.equal(countStoredDecimalDigits("5.12345"), 5);
    assert.equal(countStoredDecimalDigits(3.123456), 6);
    assert.ok((countStoredDecimalDigits(3.123456) ?? 0) >= 6);
  });

  it("butir 6: gagal jika latitude atau longitude null", () => {
    const r = evaluateKunciStatis(kejadian({ longitude: null }), dampak);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.includes("longitude") || e.includes("latitude")));
  });

  it("butir 7: gagal jika kib bukan 16 digit", () => {
    const pendek = evaluateKunciStatis(kejadian({ kib: "110110720260904" }), dampak);
    assert.equal(pendek.ok, false);
    assert.ok(pendek.errors.some((e) => e.includes("kib")));

    const huruf = evaluateKunciStatis(kejadian({ kib: "110110720260904A" }), dampak);
    assert.equal(huruf.ok, false);
  });

  it("lolos lokasi lengkap tanpa syarat korban", () => {
    const r = evaluateKunciStatis(kejadian(), dampak);
    assert.deepEqual(r.errors, []);
    assert.equal(r.ok, true);
  });
});

describe("evaluateKunciStatis — butir 8 dan peringatan", () => {
  it("butir 8: helper tidak membaca korban, SK, atau KRB", () => {
    const src = readFileSync(join(root, "src/lib/sik/kunci-statis.ts"), "utf8");
    assert.doesNotMatch(src, /korban|meninggal|nomor_sk|krb/i);
  });

  it("todayJakartaYmd memakai kalender Asia/Jakarta", () => {
    const ymd = todayJakartaYmd(new Date("2026-09-04T17:00:00.000Z"));
    assert.match(ymd, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(ymd, "2026-09-05");
  });

  it("lacksDampakPadaTanggal benar jika tidak ada tanggal hari ini", () => {
    assert.equal(lacksDampakPadaTanggal(["2026-09-03"], "2026-09-04"), true);
    assert.equal(lacksDampakPadaTanggal(["2026-09-04T00:00:00Z"], "2026-09-04"), false);
  });
});

describe("BE-10 sumber rute", () => {
  it("POST fase menjalankan checklist sebelum update dan 400 sebelum diterima", () => {
    const fase = readFileSync(join(root, "src/app/api/sik/kejadian/[id]/fase/route.ts"), "utf8");
    const evalAt = fase.indexOf("evaluateKunciStatis(item");
    const updateAt = fase.indexOf(".update(patch)");
    const acceptedAt = fase.indexOf('status: "diterima",');
    const checklist400At = fase.indexOf("checklist kunci statis gagal");
    assert.ok(evalAt > 0 && updateAt > evalAt, "checklist sebelum update");
    assert.ok(checklist400At > evalAt && checklist400At < updateAt, "400 sebelum update");
    assert.ok(acceptedAt > updateAt, "diterima hanya setelah update");
    assert.match(fase, /dikembalikan/);
    assert.match(fase, /dibuka dari statis/);
    assert.match(fase, /sdb_validasi/);
    assert.match(fase, /canLockStatis/);
    assert.match(fase, /rejectCrossOrigin/);
    assert.doesNotMatch(fase, /notifikasi_wa/);
  });

  it("GET peringatan-dinamis memakai requireOpsApi, scope, dan hari Jakarta", () => {
    const src = readFileSync(
      join(root, "src/app/api/sik/kejadian/peringatan-dinamis/route.ts"),
      "utf8"
    );
    assert.match(src, /requireOpsApi/);
    assert.match(src, /matchesKabScope/);
    assert.match(src, /todayJakartaYmd|Asia\/Jakarta/);
    assert.match(src, /count/);
    assert.doesNotMatch(src, /notifikasi_wa/);
    assert.doesNotMatch(src, /WhatsApp/i);
  });

  it("PATCH kejadian dinamis tidak memuat checklist kunci", () => {
    const patch = readFileSync(join(root, "src/app/api/sik/kejadian/[id]/route.ts"), "utf8");
    assert.doesNotMatch(patch, /evaluateKunciStatis/);
  });
});
