import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import type { TypedSupabaseClient } from "./supabase/server";

// Any accidental anon client would hit this closed port and fail as "error",
// never as "no-client", so the tests below catch a silent anon fallback.
process.env.NEXT_PUBLIC_SUPABASE_URL = "http://127.0.0.1:9";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

type Result = { data: unknown; error: { message: string } | null };

/** Minimal PostgREST stand-in that records which tables were read. */
function fakeClient(tables: Record<string, { single?: Result; rows?: Result }>) {
  const calls: string[] = [];
  const client = {
    from(table: string) {
      calls.push(table);
      const spec = tables[table] ?? {};
      const builder = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        maybeSingle: async () => spec.single ?? { data: null, error: null },
        range: async () => spec.rows ?? { data: [], error: null },
      };
      return builder;
    },
  };
  return { client: client as unknown as TypedSupabaseClient, calls };
}

const ANALISIS_PAYLOAD = {
  metadata: { judul: "uji", tahun_anggaran: 2026 },
  total_anggaran_rp: 42,
  per_fase: {},
};

const KEGIATAN_ROW = {
  id: "keg-1",
  tahun: 2026,
  nama: "Kegiatan uji",
  fase: "pemulihan",
  kategori: "infrastruktur",
  skpd: "BPBA",
  total_rp: 42,
  payload: {},
};

describe("BE-38 staff loaders read with the session-bound client", () => {
  it("loadAnggaran queries the passed client and reports source supabase", async () => {
    const { loadAnggaran } = await import("./anggaran");
    const { client, calls } = fakeClient({
      anggaran_analisis: { single: { data: { tahun: 2026, payload: ANALISIS_PAYLOAD }, error: null } },
      anggaran_kegiatan: { rows: { data: [KEGIATAN_ROW], error: null } },
    });
    const fallbacks: string[] = [];
    const res = await loadAnggaran(client, { onFallback: (i) => fallbacks.push(i.reason) });
    assert.deepEqual(calls, ["anggaran_analisis", "anggaran_kegiatan"]);
    assert.equal(res.source, "supabase");
    assert.equal(res.fallbackReason, undefined);
    assert.equal(res.kegiatan.length, 1);
    assert.equal(res.kegiatan[0]?.id, "keg-1");
    assert.equal(res.analisis.total_anggaran_rp, 42);
    assert.deepEqual(fallbacks, []);
  });

  it("without a session client it serves the fixture and flags no-client (no anon client)", async () => {
    const { loadAnggaran } = await import("./anggaran");
    const fallbacks: string[] = [];
    const res = await loadAnggaran(null, { onFallback: (i) => fallbacks.push(i.reason) });
    assert.equal(res.source, "fixture");
    assert.equal(res.fallbackReason, "no-client");
    assert.deepEqual(fallbacks, ["no-client"]);
    assert.ok(res.kegiatan.length > 0);
  });

  it("flags empty when RLS returns no rows for the session user", async () => {
    const { loadAnggaran } = await import("./anggaran");
    const { client, calls } = fakeClient({});
    const fallbacks: string[] = [];
    const res = await loadAnggaran(client, { onFallback: (i) => fallbacks.push(i.reason) });
    assert.deepEqual(calls, ["anggaran_analisis"]);
    assert.equal(res.source, "fixture");
    assert.equal(res.fallbackReason, "empty");
    assert.deepEqual(fallbacks, ["empty"]);
  });

  it("flags error when the session client query fails", async () => {
    const { loadAnggaran } = await import("./anggaran");
    const { client } = fakeClient({
      anggaran_analisis: { single: { data: null, error: { message: "permission denied" } } },
    });
    const seen: { reason: string; error?: unknown }[] = [];
    const res = await loadAnggaran(client, { onFallback: (i) => seen.push(i) });
    assert.equal(res.source, "fixture");
    assert.equal(res.fallbackReason, "error");
    assert.equal(seen.length, 1);
    assert.match(String((seen[0]?.error as Error)?.message), /permission denied/);
  });

  it("loadR3PSummary reads r3p_summary through the passed client", async () => {
    const { loadR3PSummary } = await import("./r3p-summary");
    const { client, calls } = fakeClient({
      r3p_summary: {
        single: {
          data: {
            payload: {
              metadata: { judul: "uji" },
              totals: {},
              per_kabupaten: [{ kabupaten: "Aceh Besar" }],
            },
          },
          error: null,
        },
      },
    });
    const res = await loadR3PSummary(client);
    assert.deepEqual(calls, ["r3p_summary"]);
    assert.equal(res.source, "supabase");
  });

  it("trySupabaseThenFixture keeps the anon default only when no client key is passed", async () => {
    const { trySupabaseThenFixture } = await import("./supabase/fallback");
    let used: unknown = "unset";
    const res = await trySupabaseThenFixture(
      async (c) => {
        used = c;
        return "db";
      },
      async () => "fixture",
      { client: null, onFallback: () => {} }
    );
    assert.equal(used, "unset");
    assert.equal(res.source, "fixture");
    assert.equal(res.fallbackReason, "no-client");
  });

  it("staff routes pass the guard's session client and never the anon or service client", () => {
    const anggaran = read("src/app/api/anggaran/route.ts");
    assert.match(anggaran, /requireStaffApi\(\)/);
    assert.match(anggaran, /loadAnggaran\(auth\.supabase\)/);
    assert.match(anggaran, /X-Data-Source/);
    for (const rel of [
      "src/app/api/anggaran/route.ts",
      "src/app/api/prrpka/summary/route.ts",
      "src/app/api/r3p/summary/route.ts",
      "src/lib/anggaran.ts",
      "src/lib/r3p-summary.ts",
      "src/lib/prrpka-summary.ts",
    ]) {
      const src = read(rel);
      assert.doesNotMatch(src, /createServiceClient|SERVICE_ROLE/, rel);
      assert.doesNotMatch(src, /createServerClient\(/, rel);
    }
  });

  it("ships the staff-only RLS migration without applying anything at runtime", () => {
    const sql = read("supabase/migrations/20261001_staff_only_anggaran_rls.sql");
    for (const t of ["anggaran_analisis", "anggaran_kegiatan", "r3p_summary"]) {
      assert.match(sql, new RegExp(`drop policy if exists ${t}_select on public\\.${t};`));
      assert.match(sql, new RegExp(`drop policy if exists ${t}_select_public on public\\.${t};`));
      assert.match(
        sql,
        new RegExp(
          `create policy ${t}_select_staff on public\\.${t}\\s+for select to authenticated using \\(public\\.is_staff\\(\\)\\);`
        )
      );
    }
    assert.match(sql, /revoke all on public\.anggaran_analisis, public\.anggaran_kegiatan, public\.r3p_summary from anon;/);
    assert.doesNotMatch(sql, /super_admin/);
    assert.match(sql, /^begin;/);
    assert.match(sql.trim(), /commit;$/);
  });
});
