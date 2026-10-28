import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import type { AdminProfile } from "@/lib/auth/types";
import type { AdminRole } from "@/lib/supabase/types";
import type { OverlayCalonKejadianRow } from "@/lib/sik/db-tables";
import {
  authorizeCalonTerima,
  authorizeCalonTolak,
  buildCalonSnapshot,
  buildKejadianInsertFromCalon,
  calonVisibleToOps,
  decideDedup,
  defaultNamaKejadian,
  nilaiKelayakan,
  resolveJenisTerima,
  resolveWaktuSinyal,
  resolveWaktuTerima,
  shouldMarkTautanPutus,
  shouldSyncCalonAfterRefresh,
  syncCalonDariOverlay,
  wilayahDariProperties,
  type OverlayLiveSignal,
} from "./overlay-calon";

const ROOT = process.cwd();

function staff(role: AdminRole, wilayah?: { kode?: string | null; nama?: string | null }): AdminProfile {
  return {
    userId: "u-be6",
    email: "be6@example.test",
    role,
    displayName: role,
    createdAt: "2026-09-04T00:00:00.000Z",
    kodeKabupaten: wilayah?.kode ?? null,
    kabupaten: wilayah?.nama ?? null,
    kodeKecamatan: null,
    kecamatan: null,
    kodeDesaKelurahan: null,
    desa: null,
  };
}

function signal(partial: Partial<OverlayLiveSignal> & Pick<OverlayLiveSignal, "layer_key" | "source">): OverlayLiveSignal {
  return {
    id: partial.id ?? "sig-1",
    source: partial.source,
    layer_key: partial.layer_key,
    external_id: partial.external_id ?? "sig-1",
    longitude: partial.longitude ?? 95.3,
    latitude: partial.latitude ?? 5.5,
    occurred_at: partial.occurred_at ?? "2026-09-04T01:00:00.000Z",
    properties: partial.properties ?? { title: "Gempa uji" },
    updated_at: partial.updated_at ?? "2026-09-04T02:00:00.000Z",
  };
}

describe("kelayakan calon overlay", () => {
  const cases: Array<{ name: string; input: OverlayLiveSignal; ok: boolean }> = [
    {
      name: "BMKG gempa tanpa potong magnitudo",
      input: signal({
        source: "bmkg",
        layer_key: "bmkgQuakes",
        properties: { title: "Gempa kecil", magnitude: "1.2" },
      }),
      ok: true,
    },
    {
      name: "MAGMA gempa",
      input: signal({ source: "magma", layer_key: "magmaQuakes" }),
      ok: true,
    },
    {
      name: "MAGMA gunung ditolak",
      input: signal({ source: "magma", layer_key: "magmaVolcanoes", properties: { title: "Seulawah" } }),
      ok: false,
    },
    {
      name: "Sipongi tanpa filter ulang confidence",
      input: signal({
        source: "sipongi",
        layer_key: "sipongiHotspots",
        properties: { title: "Hotspot", status: "low" },
      }),
      ok: true,
    },
    {
      name: "Tatonas AMAN bukan calon",
      input: signal({
        source: "tatonas",
        layer_key: "tatonasStations",
        properties: { title: "Pos A", level: "AMAN" },
      }),
      ok: false,
    },
    {
      name: "Tatonas AWAS calon meski stale",
      input: signal({
        source: "tatonas",
        layer_key: "tatonasStations",
        properties: { title: "Pos A", level: "AWAS", stale: true },
      }),
      ok: true,
    },
    {
      name: "Tatonas WASPADA calon",
      input: signal({
        source: "tatonas",
        layer_key: "tatonasStations",
        properties: { title: "Pos B", level: "WASPADA" },
      }),
      ok: true,
    },
    {
      name: "pelabuhan bukan calon",
      input: signal({ source: "bmkg", layer_key: "maritimePorts" }),
      ok: false,
    },
    {
      name: "perairan / buletin gelombang bukan calon",
      input: signal({ source: "bmkg", layer_key: "maritimeWaters" }),
      ok: false,
    },
  ];

  for (const row of cases) {
    it(row.name, () => {
      assert.equal(nilaiKelayakan(row.input).ok, row.ok);
    });
  }
});

describe("dedup calon", () => {
  const cases = [
    {
      name: "draf ada → perbarui, bukan baris kedua",
      existing: [{ id: "c1", status: "draf" as const, decided_at: null, kejadian_id: null }],
      updatedAt: "2026-09-04T03:00:00.000Z",
      action: "update_draf",
    },
    {
      name: "diterima → otomatis diam",
      existing: [{ id: "c2", status: "diterima" as const, decided_at: "2026-09-01T00:00:00.000Z", kejadian_id: "k1" }],
      updatedAt: "2026-09-04T03:00:00.000Z",
      action: "diam_diterima",
    },
    {
      name: "ditolak + updated_at lebih baru → draf baru",
      existing: [{ id: "c3", status: "ditolak" as const, decided_at: "2026-09-01T00:00:00.000Z", kejadian_id: null }],
      updatedAt: "2026-09-04T03:00:00.000Z",
      action: "insert_after_tolak",
    },
    {
      name: "ditolak + updated_at tidak lebih baru → diam",
      existing: [{ id: "c4", status: "ditolak" as const, decided_at: "2026-09-04T04:00:00.000Z", kejadian_id: null }],
      updatedAt: "2026-09-04T03:00:00.000Z",
      action: "diam",
    },
    {
      name: "belum ada → insert",
      existing: [],
      updatedAt: "2026-09-04T03:00:00.000Z",
      action: "insert",
    },
  ];

  for (const row of cases) {
    it(row.name, () => {
      assert.equal(decideDedup(row.existing, row.updatedAt).action, row.action);
    });
  }
});

describe("tautan putus vs 503", () => {
  it("tidak menandai putus jika refresh layer gagal", () => {
    assert.equal(shouldMarkTautanPutus({ layerRefreshOk: false, overlayHasExternalId: false }), false);
  });

  it("menandai putus hanya setelah fetch sukses dan id hilang", () => {
    assert.equal(shouldMarkTautanPutus({ layerRefreshOk: true, overlayHasExternalId: false }), true);
    assert.equal(shouldMarkTautanPutus({ layerRefreshOk: true, overlayHasExternalId: true }), false);
  });

  it("magmaVolcanoes tidak disinkronkan", async () => {
    const result = await syncCalonDariOverlay("magmaVolcanoes");
    assert.equal(result.skipped, true);
    assert.equal(result.created, 0);
  });
});

describe("sync setelah persist refresh", () => {
  it("hanya layer diizinkan + persist ok + refresh ok", () => {
    assert.equal(shouldSyncCalonAfterRefresh("bmkgQuakes", true, true), true);
    assert.equal(shouldSyncCalonAfterRefresh("tatonasStations", true, true), true);
    assert.equal(shouldSyncCalonAfterRefresh("magmaVolcanoes", true, true), false);
    assert.equal(shouldSyncCalonAfterRefresh("bmkgQuakes", false, true), false);
    assert.equal(shouldSyncCalonAfterRefresh("bmkgQuakes", true, false), false);
  });
});

describe("cuplikan dan waktu", () => {
  it("tidak mengurai title menjadi kabupaten", () => {
    assert.deepEqual(wilayahDariProperties({ title: "Pidie Jaya" }), {
      kabupaten: null,
      kode_kabupaten: null,
    });
    assert.deepEqual(wilayahDariProperties({ kabkota: "Pidie Jaya" }), {
      kabupaten: "Pidie Jaya",
      kode_kabupaten: "1118",
    });
    assert.deepEqual(wilayahDariProperties({ kabupaten: "Kabupaten Aceh Tamiang" }), {
      kabupaten: "Aceh Tamiang",
      kode_kabupaten: "1116",
    });
    assert.deepEqual(wilayahDariProperties({ kabkota: "Aceh Jaya" }), {
      kabupaten: "Aceh Jaya",
      kode_kabupaten: "1114",
    });
    assert.deepEqual(wilayahDariProperties({ kabupaten: "Kota Langsa" }), {
      kabupaten: "Langsa",
      kode_kabupaten: "1174",
    });
    assert.deepEqual(wilayahDariProperties({ kabkota: "Lhokseumawe" }), {
      kabupaten: "Lhokseumawe",
      kode_kabupaten: "1173",
    });
  });

  it("urutan waktu: occurred_at lalu waktu, tanggal, time_local WIB", () => {
    assert.equal(
      resolveWaktuSinyal({
        occurred_at: "2026-09-04T01:00:00.000Z",
        properties: { waktu: "2026-01-01T00:00:00.000Z" },
      }),
      "2026-09-04T01:00:00.000Z",
    );
    assert.equal(
      resolveWaktuSinyal({
        occurred_at: null,
        properties: { time_local: "2026-09-03 11:30:00" },
      }),
      "2026-09-03T04:30:00.000Z",
    );
    assert.equal(resolveWaktuSinyal({ occurred_at: null, properties: {} }), null);
  });

  it("terima menolak waktu kosong dan tidak memakai now()", () => {
    assert.equal(resolveWaktuTerima(null, null), null);
    assert.equal(resolveWaktuTerima("2026-09-04T01:00:00.000Z", null), "2026-09-04T01:00:00.000Z");
    const before = Date.now();
    const resolved = resolveWaktuTerima(null, null);
    const after = Date.now();
    assert.equal(resolved, null);
    assert.ok(after >= before);
  });

  it("nama dari title overlay tidak mengisi slug katalog", () => {
    const named = defaultNamaKejadian("bmkgQuakes", { title: "Gempa Aceh Utara" });
    assert.equal(named.fromTitle, true);
    assert.equal(named.nama, "Gempa Aceh Utara");
  });

  it("Tatonas wajib kode_jenis di body terima", () => {
    const calon = {
      layer_key: "tatonasStations",
      usulan_kode_jenis: null,
      usulan_jenis_bencana: null,
    };
    assert.equal(resolveJenisTerima(calon, null).ok, false);
    const ok = resolveJenisTerima(calon, 101);
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.jenis, "Banjir");
  });
});

describe("wilayah admin_kabkota", () => {
  const kab = staff("admin_kabkota", { kode: "1101", nama: "Aceh Selatan" });

  it("melihat scope sendiri, bukan belum terikat atau kabupaten lain", () => {
    assert.equal(calonVisibleToOps(kab, { kode_kabupaten: "1101", kabupaten: "Aceh Selatan" }), true);
    assert.equal(calonVisibleToOps(kab, { kode_kabupaten: null, kabupaten: null }), false);
    assert.equal(calonVisibleToOps(kab, { kode_kabupaten: "1171", kabupaten: "Banda Aceh" }), false);
    assert.equal(calonVisibleToOps(staff("admin_provinsi"), { kode_kabupaten: "1171" }), true);
  });

  it("terima calon belum terikat wajib kabupaten scope", () => {
    const empty = authorizeCalonTerima(kab, { kode_kabupaten: null, kabupaten: null }, {});
    assert.equal(empty.ok, false);
    if (!empty.ok) assert.equal(empty.status, 400);

    const wrong = authorizeCalonTerima(
      kab,
      { kode_kabupaten: null, kabupaten: null },
      { kode_kabupaten: "1171" },
    );
    assert.equal(wrong.ok, false);
    if (!wrong.ok) assert.equal(wrong.status, 403);

    const own = authorizeCalonTerima(
      kab,
      { kode_kabupaten: null, kabupaten: null },
      { kode_kabupaten: "1101" },
    );
    assert.equal(own.ok, true);
    if (own.ok) assert.equal(own.kode_kabupaten, "1101");
  });

  it("tolak calon kabupaten lain ditolak", () => {
    const denied = authorizeCalonTolak(kab, { kode_kabupaten: "1171", kabupaten: "Banda Aceh" });
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.equal(denied.status, 403);
    assert.equal(authorizeCalonTolak(kab, { kode_kabupaten: null, kabupaten: null }).ok, false);
  });
});

describe("insert kejadian saat terima", () => {
  it("mengisi draft+dinamis+is_bencana false tanpa now() sebagai waktu", () => {
    const calon = {
      id: "c1",
      source: "bmkg",
      layer_key: "bmkgQuakes",
      external_id: "bmkg-1",
      overlay_feature_id: "bmkg-1",
      status: "draf",
      tautan_status: "utuh",
      kejadian_id: null,
      nama_sinyal: "Gempa uji",
      waktu_sinyal: "2026-09-04T01:00:00.000Z",
      kabupaten: null,
      kode_kabupaten: null,
      latitude: 5.5,
      longitude: 95.3,
      usulan_kode_jenis: 107,
      usulan_jenis_bencana: "Gempa bumi",
      sumber_label: "BMKG TEWS",
      penyebab_ringkas: "5.1 10 km",
      properties_snapshot: { title: "Gempa uji", href: "https://www.bmkg.go.id/" },
      asal_buat: "otomatis",
      created_by: null,
      decided_by: null,
      decided_at: null,
      ditolak_alasan: null,
      created_at: "2026-09-04T00:00:00.000Z",
      updated_at: "2026-09-04T00:00:00.000Z",
    } as OverlayCalonKejadianRow;

    const insert = buildKejadianInsertFromCalon({
      calon,
      jenis_bencana: "Gempa bumi",
      kode_jenis: 107,
      nama_kejadian: "Gempa uji",
      slug_nama: null,
      waktu_kejadian: "2026-09-04T01:00:00.000Z",
      tarikh: "2026-09-04",
      kabupaten: null,
      kode_kabupaten: null,
      created_by: "u-ops",
      kib: null,
      kib_index: null,
    });

    assert.equal(insert.status, "draft");
    assert.equal(insert.fase_data, "dinamis");
    assert.equal(insert.is_bencana, false);
    assert.equal(insert.status_darurat, false);
    assert.equal(insert.nomor_sk, null);
    assert.equal(insert.himbauan, null);
    assert.equal(insert.kib_sumber, "episentrum");
    assert.equal(insert.waktu_kejadian, "2026-09-04T01:00:00.000Z");
    assert.equal(insert.sumber_informasi, "BMKG TEWS + https://www.bmkg.go.id/");
    assert.ok(!("meninggal" in insert));
  });

  it("membangun cuplikan Tatonas tanpa memetakan loggerKind", () => {
    const snap = buildCalonSnapshot(
      signal({
        source: "tatonas",
        layer_key: "tatonasStations",
        properties: { title: "Pos Krueng", level: "AWAS" },
      }),
    );
    assert.equal(snap.usulan_kode_jenis, null);
    assert.equal(snap.usulan_jenis_bencana, null);
    assert.equal(snap.penyebab_ringkas, "Level AWAS Pos Krueng");
  });
});

describe("sumber BE-6", () => {
  it("migrasi baru persis kolom/check/indeks/RLS is_ops", (t) => {
    const sqlPath = path.join(ROOT, "supabase/migrations/20260915_overlay_calon_kejadian.sql");
    if (!existsSync(sqlPath)) {
      t.skip("20260915 belum di pohon git G14");
      return;
    }
    const sql = readFileSync(sqlPath, "utf8");
    assert.match(sql, /create table if not exists public\.overlay_calon_kejadian/);
    assert.match(sql, /check \(source in \('bmkg', 'magma', 'sipongi', 'tatonas'\)\)/);
    assert.match(sql, /check \(status in \('draf', 'ditolak', 'diterima'\)\)/);
    assert.match(sql, /check \(tautan_status in \('utuh', 'putus'\)\)/);
    assert.match(sql, /check \(asal_buat in \('otomatis', 'manual'\)\)/);
    assert.match(sql, /unique index[\s\S]*\(source, external_id\)[\s\S]*where status = 'draf'/i);
    assert.match(sql, /\(status, created_at desc\)/);
    assert.match(sql, /\(kode_kabupaten\)/);
    assert.match(sql, /\(layer_key\)/);
    assert.match(sql, /enable row level security/);
    assert.match(sql, /for select to authenticated[\s\S]*using \(public\.is_ops\(\)\)/);
    assert.match(sql, /for insert to authenticated[\s\S]*with check \(public\.is_ops\(\)\)/);
    assert.match(sql, /for update to authenticated[\s\S]*using \(public\.is_ops\(\)\)/);
    assert.match(sql, /revoke all on table public\.overlay_calon_kejadian from anon/);
    assert.doesNotMatch(sql, /create or replace function public\.is_ops/i);
    assert.doesNotMatch(sql, /for select to anon/);
  });

  it("migrasi 20261028 hanya menukar empat pasangan lama di overlay_calon_kejadian", () => {
    const sql = readFileSync(
      path.join(ROOT, "supabase/migrations/20261028_overlay_calon_kode_kemendagri.sql"),
      "utf8",
    );
    const live = sql.replace(/--[^\n]*/g, "");
    assert.equal((live.match(/\bupdate\b/gi) ?? []).length, 1);
    assert.match(live, /update public\.overlay_calon_kejadian/);
    assert.doesNotMatch(live, /update public\.(?!overlay_calon_kejadian)/);
    assert.match(live, /\('aceh tamiang', '1114'\)/);
    assert.match(live, /\('aceh jaya', '1116'\)/);
    assert.match(live, /\('langsa', '1173'\)/);
    assert.match(live, /\('lhokseumawe', '1174'\)/);
    assert.match(live, /then '11\.16'/);
    assert.match(live, /else '1116'/);
  });

  it("rute API memakai requireOpsApi dan rejectCrossOrigin pada tulis", (t) => {
    const listPath = path.join(ROOT, "src/app/api/sik/calon-kejadian/route.ts");
    if (!existsSync(listPath)) {
      t.skip("rute calon bukan berkas G14");
      return;
    }
    const list = readFileSync(listPath, "utf8");
    const terima = readFileSync(
      path.join(ROOT, "src/app/api/sik/calon-kejadian/[id]/terima/route.ts"),
      "utf8",
    );
    const tolak = readFileSync(
      path.join(ROOT, "src/app/api/sik/calon-kejadian/[id]/tolak/route.ts"),
      "utf8",
    );
    assert.match(list, /requireOpsApi/);
    assert.match(list, /rejectCrossOrigin/);
    assert.match(list, /status.*=.*"draf"|\"draf\"/);
    assert.match(terima, /requireOpsApi/);
    assert.match(terima, /rejectCrossOrigin/);
    assert.match(terima, /allocateKib/);
    assert.match(terima, /resolveWaktuTerima/);
    assert.match(terima, /buildKejadianInsertFromCalon/);
    assert.doesNotMatch(terima, /kejadian_dampak/);
    assert.doesNotMatch(terima, /status:\s*"aktif"/);
    assert.doesNotMatch(terima, /Date\.now\(\)/);
    assert.match(tolak, /requireOpsApi/);
    assert.match(tolak, /rejectCrossOrigin/);
    assert.doesNotMatch(tolak, /kejadian_operasi/);
  });

  it("overlay-live memanggil sync hanya di refresh setelah persist, bukan GET", () => {
    const src = readFileSync(path.join(ROOT, "src/lib/overlay-live.ts"), "utf8");
    const loadStart = src.indexOf("export async function loadOverlayLive");
    const loadEnd = src.indexOf("export async function loadOverlayVector");
    const loadBody = src.slice(loadStart, loadEnd);
    assert.doesNotMatch(loadBody, /syncCalonDariOverlay|shouldSyncCalonAfterRefresh/);

    const refreshStart = src.indexOf("export async function refreshOverlayLive");
    const refreshEnd = src.indexOf("async function purgeExpiredOverlayRows");
    const refreshBody = src.slice(refreshStart, refreshEnd);
    assert.match(refreshBody, /persistLive/);
    assert.match(refreshBody, /shouldSyncCalonAfterRefresh/);
    assert.match(refreshBody, /syncCalonDariOverlay/);

    const calon = readFileSync(path.join(ROOT, "src/lib/overlay-calon.ts"), "utf8");
    assert.doesNotMatch(calon, /loggerKind|kd_hardware/);
    assert.doesNotMatch(calon, /fetchBmkgTews|fetchMagma|fetchSipongi|fetchTatonasDtData/);
  });
});
