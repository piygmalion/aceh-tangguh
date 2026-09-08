import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import {
  applyListPatch,
  kejadianListStateToParams,
  opsKejadianListStateToParams,
  parseKejadianListSearchParams,
  parseOpsKejadianListSearchParams,
} from "./list-url";

describe("list URL state (FE-54)", () => {
  it("parses public list keys and drops empty, noise, bad dates, and default page", () => {
    const state = parseKejadianListSearchParams(
      new URLSearchParams(
        "q=banjir&jenis=Banjir&kabupaten=Aceh%20Besar&kecamatan=Lhoong&status=selesai&from=2024-01-01&to=2025-12-31&page=2&pageSize=25&kab=Pidie&noise=1"
      )
    );
    assert.deepEqual(state, {
      q: "banjir",
      jenis: "Banjir",
      kabupaten: "Aceh Besar",
      kecamatan: "Lhoong",
      status: "selesai",
      from: "2024-01-01",
      to: "2025-12-31",
      page: 2,
      pageSize: 25,
    });
    assert.equal(state.q.includes("Pidie"), false);
  });

  it("rejects invented pageSize and non-ISO dates; caps q at 80", () => {
    const state = parseKejadianListSearchParams(
      new URLSearchParams(`q=${"x".repeat(90)}&page=0&pageSize=100&from=01-01-2024&to=2024/01/01`)
    );
    assert.equal(state.q.length, 80);
    assert.equal(state.page, 1);
    assert.equal(state.pageSize, 10);
    assert.equal(state.from, "");
    assert.equal(state.to, "");
  });

  it("serializes only set public keys using kabupaten not kab", () => {
    const params = kejadianListStateToParams({
      q: "  longsor  ",
      jenis: "Longsor",
      kabupaten: "Pidie",
      kecamatan: "",
      status: "",
      from: "",
      to: "",
      page: 1,
      pageSize: 10,
    });
    assert.equal(params.get("q"), "longsor");
    assert.equal(params.get("jenis"), "Longsor");
    assert.equal(params.get("kabupaten"), "Pidie");
    assert.equal(params.has("kab"), false);
    assert.equal(params.has("page"), false);
    assert.equal(params.has("pageSize"), false);
    assert.equal(params.has("kecamatan"), false);
  });

  it("parses ops status allowlist and drops invented status", () => {
    const ok = parseOpsKejadianListSearchParams(
      new URLSearchParams("q=kib&status=aktif&page=3")
    );
    assert.deepEqual(ok, { q: "kib", status: "aktif", page: 3 });
    const bad = parseOpsKejadianListSearchParams(
      new URLSearchParams("status=zona3&page=-1")
    );
    assert.equal(bad.status, "");
    assert.equal(bad.page, 1);
  });

  it("serializes ops without pageSize", () => {
    const params = opsKejadianListStateToParams({
      q: "aceh",
      status: "draft",
      page: 2,
    });
    assert.equal(params.get("q"), "aceh");
    assert.equal(params.get("status"), "draft");
    assert.equal(params.get("page"), "2");
    assert.equal(params.has("pageSize"), false);
  });

  it("applyListPatch resets page when a facet changes without an explicit page", () => {
    const next = applyListPatch(
      {
        q: "",
        jenis: "",
        kabupaten: "Pidie",
        kecamatan: "Muara Tiga",
        status: "",
        from: "",
        to: "",
        page: 4,
        pageSize: 25,
      },
      { kabupaten: "Bireuen" },
      ["jenis", "kabupaten", "kecamatan", "status", "from", "to", "q"]
    );
    assert.equal(next.kabupaten, "Bireuen");
    assert.equal(next.page, 1);
    const paged = applyListPatch(
      { q: "a", status: "aktif", page: 4 },
      { page: 5 },
      ["q", "status"]
    );
    assert.equal(paged.page, 5);
  });

  it("KejadianTable and KejadianOpsList wire the parsers and reload on q", () => {
    const root = process.cwd();
    const table = readFileSync(
      path.join(root, "src/components/kejadian/KejadianTable.tsx"),
      "utf8"
    );
    const ops = readFileSync(
      path.join(root, "src/components/sik/KejadianOpsList.tsx"),
      "utf8"
    );
    const hook = readFileSync(
      path.join(root, "src/hooks/useListUrlState.ts"),
      "utf8"
    );
    assert.match(table, /useListUrlState/);
    assert.match(table, /parseKejadianListSearchParams/);
    assert.match(table, /kejadianListStateToParams/);
    assert.doesNotMatch(table, /from "nuqs"/);
    assert.match(ops, /parseOpsKejadianListSearchParams/);
    assert.match(ops, /\[state\.page, state\.status, state\.q/);
    assert.match(hook, /router\.replace/);
    assert.match(hook, /scroll: false/);
    assert.doesNotMatch(ops, /from "nuqs"/);
  });
});
