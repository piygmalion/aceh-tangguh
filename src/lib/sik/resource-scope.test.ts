import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { AdminProfile } from "../auth/types";
import type { AdminRole } from "../supabase/types";
import { authorizeDestanaProgramRead } from "./destana-program";
import {
  authorizeResourceList,
  authorizeResourceRow,
  RESOURCE_SCOPE_MODE,
} from "./resource-scope";
import { matchesKabScope } from "./roles";

const KAB_A = "1101";
const KAB_B = "1171";

function staff(role: AdminRole, wilayah?: { kode?: string | null; nama?: string | null }): AdminProfile {
  return {
    userId: "u-an21",
    email: "an21@example.test",
    role,
    displayName: role,
    createdAt: "2026-01-01T00:00:00.000Z",
    kodeKabupaten: wilayah?.kode ?? null,
    kabupaten: wilayah?.nama ?? null,
    kodeKecamatan: null,
    kecamatan: null,
    kodeDesaKelurahan: role === "admin_desa" ? "1101010001" : null,
    desa: null,
  };
}

describe("AN-20 / AN-21 kab fail-closed", () => {
  it("admin_kabkota tanpa profil kab ditolak matchesKabScope", () => {
    const empty = staff("admin_kabkota", { kode: null, nama: null });
    assert.equal(matchesKabScope(empty, { kode_kabupaten: KAB_A, kabupaten: "Aceh Selatan" }), false);
    assert.equal(matchesKabScope(staff("admin_provinsi"), { kode_kabupaten: KAB_B }), true);
  });

  it("Destana baca: kab kosong 403; kode asing 403; sendiri lolos", () => {
    const empty = staff("admin_kabkota", { kode: null, nama: null });
    const deniedEmpty = authorizeDestanaProgramRead(empty, "1101010001");
    assert.equal(deniedEmpty.ok, false);
    if (!deniedEmpty.ok) assert.equal(deniedEmpty.error, "scope_kabupaten");

    const kab = staff("admin_kabkota", { kode: KAB_A });
    const foreign = authorizeDestanaProgramRead(kab, "1171010001");
    assert.equal(foreign.ok, false);
    assert.equal(authorizeDestanaProgramRead(kab, "1101010001").ok, true);
    assert.equal(authorizeDestanaProgramRead(staff("admin_provinsi"), "1171010001").ok, true);
  });

  it("list kejadian tanpa kejadian_id = 400 untuk kab; CMS provincial lolos", () => {
    const kab = staff("admin_kabkota", { kode: KAB_A });
    const missing = authorizeResourceList(kab, RESOURCE_SCOPE_MODE.korban, {
      kejadianId: null,
      kebutuhanId: null,
    });
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.status, 400);

    const cms = authorizeResourceList(kab, RESOURCE_SCOPE_MODE.nomorPenting, {
      kejadianId: null,
      kebutuhanId: null,
    });
    assert.equal(cms.ok, true);
    if (cms.ok) assert.equal(cms.applyRowKabFilter, false);
  });

  it("kab A tidak lolos baris kab B pada row_kab dan kejadian", () => {
    const kab = staff("admin_kabkota", { kode: KAB_A });
    const rowB = authorizeResourceRow(kab, "row_kab", {
      row: { kode_kabupaten: KAB_B, kabupaten: "Banda Aceh" },
    });
    assert.equal(rowB.ok, false);

    const headerB = authorizeResourceRow(kab, "kejadian", {
      kejadianId: "k-b",
      header: { kode_kabupaten: KAB_B, kabupaten: "Banda Aceh" },
    });
    assert.equal(headerB.ok, false);

    const headerA = authorizeResourceRow(kab, "kejadian", {
      kejadianId: "k-a",
      header: { kode_kabupaten: KAB_A, kabupaten: "Aceh Selatan" },
    });
    assert.equal(headerA.ok, true);
  });

  it("via_rehab: tanpa induk 400; kejadian pada induk memakai header", () => {
    const kab = staff("admin_kabkota", { kode: KAB_A });
    const missing = authorizeResourceRow(kab, "via_rehab", { kebutuhanId: null });
    assert.equal(missing.ok, false);
    if (!missing.ok) assert.equal(missing.status, 400);

    const noParent = authorizeResourceRow(kab, "via_rehab", { kebutuhanId: "rehab-1" });
    assert.equal(noParent.ok, false);
    if (!noParent.ok) assert.equal(noParent.status, 400);

    const viaB = authorizeResourceRow(kab, "via_rehab", {
      kebutuhanId: "rehab-1",
      parentRehab: { kode_kabupaten: null, kabupaten: null, kejadian_id: "k-b" },
      header: { kode_kabupaten: KAB_B, kabupaten: "Banda Aceh" },
    });
    assert.equal(viaB.ok, false);

    const viaA = authorizeResourceRow(kab, "via_rehab", {
      kebutuhanId: "rehab-1",
      parentRehab: { kode_kabupaten: null, kabupaten: null, kejadian_id: "k-a" },
      header: { kode_kabupaten: KAB_A, kabupaten: "Aceh Selatan" },
    });
    assert.equal(viaA.ok, true);

    const viaRowB = authorizeResourceRow(kab, "via_rehab", {
      kebutuhanId: "rehab-1",
      parentRehab: { kode_kabupaten: KAB_B, kabupaten: "Banda Aceh" },
    });
    assert.equal(viaRowB.ok, false);
  });

  it("rute resource memakai authorizeResourceList / authorizeResourceRow", () => {
    const src = readFileSync(join(process.cwd(), "src/app/api/sik/resource/route.ts"), "utf8");
    assert.match(src, /authorizeResourceList/);
    assert.match(src, /authorizeResourceRow/);
    assert.match(src, /RESOURCE_SCOPE_MODE/);
  });
});
