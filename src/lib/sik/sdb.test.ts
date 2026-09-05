import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  filterKatalogUntukStaf,
  parseJadwalPatch,
  parseJadwalPost,
  parseKatalogPatch,
  parseKelasAksesQuery,
  parseValidasiPost,
  statusJadwalUntukRespons,
  tandaiJadwalTerlambat,
  todayJakarta,
} from "./sdb";

const ROOT = process.cwd();

function readRoute(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

describe("SDB filter katalog staf", () => {
  const rows = [
    { kunci: "a", kelas_akses: "terbuka" },
    { kunci: "b", kelas_akses: "terbatas" },
    { kunci: "c", kelas_akses: "rahasia" },
    { kunci: "d", kelas_akses: "sangat_rahasia" },
  ];

  it("membuang sangat_rahasia meski tidak ada query", () => {
    const items = filterKatalogUntukStaf(rows, null);
    assert.deepEqual(
      items.map((row) => row.kunci),
      ["a", "b", "c"]
    );
  });

  it("memfilter tiga kelas staf dan tetap membuang sangat_rahasia", () => {
    assert.deepEqual(
      filterKatalogUntukStaf(rows, "terbuka").map((row) => row.kunci),
      ["a"]
    );
    assert.deepEqual(
      filterKatalogUntukStaf(rows, "terbatas").map((row) => row.kunci),
      ["b"]
    );
    assert.deepEqual(
      filterKatalogUntukStaf([{ kunci: "x", kelas_akses: "sangat_rahasia" }], "rahasia"),
      []
    );
  });

  it("query kelas_akses hanya terbuka|terbatas|rahasia", () => {
    assert.deepEqual(parseKelasAksesQuery(null), { ok: true, value: null });
    assert.equal(parseKelasAksesQuery("terbuka").ok, true);
    const secret = parseKelasAksesQuery("sangat_rahasia");
    assert.equal(secret.ok, false);
    if (!secret.ok) assert.equal(secret.status, 400);
  });
});

describe("SDB jadwal terlambat", () => {
  it("menandai terbuka yang jatuh_tempo < today Asia/Jakarta", () => {
    const today = "2026-09-04";
    assert.equal(
      statusJadwalUntukRespons({ jatuh_tempo: "2026-09-03", status: "terbuka" }, today),
      "terlambat"
    );
    assert.equal(
      statusJadwalUntukRespons({ jatuh_tempo: "2026-09-04", status: "terbuka" }, today),
      "terbuka"
    );
    assert.equal(
      statusJadwalUntukRespons({ jatuh_tempo: "2026-09-01", status: "terkirim" }, today),
      "terkirim"
    );
  });

  it("todayJakarta memakai kalender Asia/Jakarta", () => {
    const utcLate = new Date("2026-09-04T17:00:00.000Z");
    assert.equal(todayJakarta(utcLate), "2026-09-05");
    const utcEarly = new Date("2026-09-04T16:59:00.000Z");
    assert.equal(todayJakarta(utcEarly), "2026-09-04");
  });

  it("tandaiJadwalTerlambat tidak mengubah terkirim", () => {
    const marked = tandaiJadwalTerlambat(
      [
        { id: "1", jatuh_tempo: "2026-01-01", status: "terbuka" },
        { id: "2", jatuh_tempo: "2026-01-01", status: "terkirim" },
      ],
      "2026-09-04"
    );
    assert.equal(marked[0]?.status, "terlambat");
    assert.equal(marked[1]?.status, "terkirim");
  });
});

describe("SDB parser body", () => {
  it("PATCH katalog menolak field di luar allowlist", () => {
    const denied = parseKatalogPatch({ kelas_akses: "terbuka" });
    assert.equal(denied.ok, false);
    if (!denied.ok) {
      assert.equal(denied.status, 400);
      assert.equal(denied.error, "kelas_akses");
    }
    const ok = parseKatalogPatch({ judul: "Kejadian operasi", periode_kirim: "harian" });
    assert.equal(ok.ok, true);
    const badPeriod = parseKatalogPatch({ periode_kirim: "mingguan" });
    assert.equal(badPeriod.ok, false);
  });

  it("POST validasi diterima = 400", () => {
    const denied = parseValidasiPost({ status: "diterima" });
    assert.equal(denied.ok, false);
    if (!denied.ok) {
      assert.equal(denied.status, 400);
      assert.equal(denied.error, "diterima");
    }
  });

  it("POST validasi dikembalikan wajib catatan", () => {
    const empty = parseValidasiPost({ status: "dikembalikan" });
    assert.equal(empty.ok, false);
    const ok = parseValidasiPost({ status: "dikembalikan", catatan: "lengkapi dampak" });
    assert.equal(ok.ok, true);
  });

  it("POST jadwal hanya kunci, periode_label, jatuh_tempo", () => {
    const extra = parseJadwalPost({
      kunci: "irbi",
      periode_label: "2026",
      jatuh_tempo: "2026-12-31",
      status: "terkirim",
    });
    assert.equal(extra.ok, false);
    const ok = parseJadwalPost({
      kunci: "irbi",
      periode_label: "2026",
      jatuh_tempo: "2026-12-31",
    });
    assert.equal(ok.ok, true);
  });

  it("PATCH jadwal hanya status=terkirim", () => {
    assert.equal(parseJadwalPatch({ status: "terlambat" }).ok, false);
    assert.equal(parseJadwalPatch({ jatuh_tempo: "2026-01-01" }).ok, false);
    assert.equal(parseJadwalPatch({ status: "terkirim" }).ok, true);
  });
});

describe("BE-9 gerbang rute", () => {
  const katalogGet = readRoute("src/app/api/sik/sdb/katalog/route.ts");
  const katalogPatch = readRoute("src/app/api/sik/sdb/katalog/[kunci]/route.ts");
  const jadwal = readRoute("src/app/api/sik/sdb/jadwal/route.ts");
  const jadwalPatch = readRoute("src/app/api/sik/sdb/jadwal/[id]/route.ts");
  const validasi = readRoute("src/app/api/sik/kejadian/[id]/validasi/route.ts");

  it("GET katalog memakai requireStaffApi, bukan requireOpsApi atau canLockStatis", () => {
    assert.match(katalogGet, /export async function GET/);
    assert.match(katalogGet, /requireStaffApi/);
    assert.doesNotMatch(katalogGet, /requireOpsApi/);
    assert.doesNotMatch(katalogGet, /canLockStatis/);
    assert.match(katalogGet, /sangat_rahasia/);
    assert.match(katalogGet, /filterKatalogUntukStaf/);
  });

  it("PATCH katalog memakai canLockStatis + rejectCrossOrigin", () => {
    assert.match(katalogPatch, /export async function PATCH/);
    assert.match(katalogPatch, /canLockStatis/);
    assert.match(katalogPatch, /rejectCrossOrigin/);
    assert.match(katalogPatch, /parseKatalogPatch/);
  });

  it("GET/POST jadwal memakai canLockStatis; tulis memakai rejectCrossOrigin", () => {
    assert.match(jadwal, /export async function GET/);
    assert.match(jadwal, /export async function POST/);
    assert.match(jadwal, /canLockStatis/);
    assert.match(jadwal, /rejectCrossOrigin/);
    assert.match(jadwal, /tandaiJadwalTerlambat/);
    assert.match(jadwal, /status:\s*"terbuka"/);
    assert.doesNotMatch(jadwal, /fase_data/);
    assert.doesNotMatch(jadwal, /requireOpsApi/);
  });

  it("PATCH jadwal hanya terkirim dan tidak mengunci fase", () => {
    assert.match(jadwalPatch, /canLockStatis/);
    assert.match(jadwalPatch, /rejectCrossOrigin/);
    assert.match(jadwalPatch, /parseJadwalPatch/);
    assert.doesNotMatch(jadwalPatch, /fase_data/);
    assert.doesNotMatch(jadwalPatch, /kejadian_operasi/);
  });

  it("GET/POST validasi memakai requireOpsApi + matchesKabScope", () => {
    assert.match(validasi, /requireOpsApi/);
    assert.match(validasi, /matchesKabScope/);
    assert.match(validasi, /rejectCrossOrigin/);
    assert.match(validasi, /parseValidasiPost/);
    assert.match(validasi, /fase_data !== "diajukan"/);
    assert.match(validasi, /canLockStatis/);
    assert.doesNotMatch(validasi, /\.update\(/);
    assert.doesNotMatch(validasi, /fase_data:/);
  });

  it("POST validasi diterima = 400 lewat parser", () => {
    assert.match(validasi, /parseValidasiPost/);
    const denied = parseValidasiPost({ status: "diterima", catatan: "ok" });
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.status, 400);
  });
});
