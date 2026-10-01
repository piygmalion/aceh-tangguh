import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import React, { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as { React?: typeof React }).React = React;
import { composeGuideAnswer } from "../panduan/answers";
import { contextToChunks } from "../panduan/retrieve";
import type { GuideContext, GuideMatch } from "../panduan/types";
import { fetchPublicApi } from "../preview/public-api";
import { DestanaPublicView } from "@/components/sik/DestanaPublicList";
import {
  DESTANA_UNAVAILABLE_EN,
  DESTANA_UNAVAILABLE_ID,
  loadDestanaPublic,
  parseDestanaPublicQuery,
  sumDestanaLevelCounts,
  type DestanaLevelCounts,
  type DestanaPublicPayload,
} from "./destana-public";

type Filter = { op: string; column: string; value: unknown };

type RecordedCall = {
  head?: boolean;
  count?: "exact";
  filters: Filter[];
  range?: [number, number];
  limit?: number;
};

type LevelCounts = DestanaLevelCounts & { lain?: number };

function mockProfilDesa(levels: LevelCounts, listTotal = sumDestanaLevelCounts(levels)) {
  const calls: RecordedCall[] = [];
  const total = sumDestanaLevelCounts(levels);

  function countFor(call: RecordedCall): number {
    const levelFilter = call.filters.find(
      (filter) => filter.column === "destana_level" && (filter.op === "eq" || filter.op === "is"),
    );
    const nameFilter = call.filters.some((filter) => filter.op === "ilike" && filter.column === "nama");
    if (nameFilter && !levelFilter) return listTotal;
    if (levelFilter?.op === "is") return levels.belum;
    if (levelFilter?.op === "eq") {
      const key = String(levelFilter.value);
      if (key === "pratama" || key === "madya" || key === "utama") return levels[key];
      return 0;
    }
    return total;
  }

  const client = {
    from(table: string) {
      if (table !== "profil_desa") throw new Error(`unexpected table ${table}`);
      return {
        select(columns: string, options?: { count?: "exact"; head?: boolean }) {
          void columns;
          const call: RecordedCall = {
            head: options?.head,
            count: options?.count,
            filters: [],
          };
          calls.push(call);
          const builder = {
            eq(column: string, value: string) {
              call.filters.push({ op: "eq", column, value });
              return builder;
            },
            is(column: string, value: null) {
              call.filters.push({ op: "is", column, value });
              return builder;
            },
            ilike(column: string, value: string) {
              call.filters.push({ op: "ilike", column, value });
              return builder;
            },
            order() {
              return builder;
            },
            range(from: number, to: number) {
              call.range = [from, to];
              return builder;
            },
            limit(n: number) {
              call.limit = n;
              return builder;
            },
            then<TResult1 = unknown, TResult2 = never>(
              onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
              onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
            ) {
              const result = call.head
                ? { count: countFor(call), data: null, error: null }
                : {
                    count: null,
                    error: null,
                    data: rowsFor(call, listTotal),
                  };
              return Promise.resolve(result).then(onfulfilled, onrejected);
            },
          };
          return builder;
        },
      };
    },
  };

  return { client, calls, total };
}

function rowsFor(call: RecordedCall, listTotal: number) {
  const from = call.range?.[0] ?? 0;
  const requested = call.range ? call.range[1] - call.range[0] + 1 : (call.limit ?? 1000);
  const capped = Math.min(requested, 1000, Math.max(0, listTotal - from));
  return Array.from({ length: capped }, (_, index) => ({
    id: `desa-${from + index}`,
    nama: `Desa ${from + index}`,
    kabupaten: "Aceh Besar",
    kecamatan: "Kuta Baro",
    kode_desa_kelurahan: null,
    destana_level: "utama",
    destana_indeks: 90,
    destana_tahun: 2024,
  }));
}

const COPY = {
  unavailable: DESTANA_UNAVAILABLE_ID,
  loadError: "Gagal memuat status Destana.",
  partial: "Menampilkan sebagian desa. Angka status di atas mencakup seluruh baris.",
  prev: "Sebelumnya",
  next: "Berikutnya",
  colDesa: "Desa",
  colKabupaten: "Kabupaten",
  colStatus: "Status",
  colIndeks: "Indeks",
};

function renderView(payload: DestanaPublicPayload | null, error = false) {
  return renderToStaticMarkup(
    createElement(DestanaPublicView, {
      pending: false,
      error,
      payload,
      copy: COPY,
      onPage: () => undefined,
    }),
  );
}

describe("destana public counts", () => {
  it("sums exact level counts to the full row total when PostgREST would cap rows at 1000", async () => {
    const levels: LevelCounts = { belum: 6503, pratama: 0, madya: 0, utama: 0 };
    const { client, calls } = mockProfilDesa(levels);
    const payload = await loadDestanaPublic(client as never, {
      kabupaten: "",
      q: "",
      page: 1,
      pageSize: 200,
    });

    assert.equal(payload.total, 6503);
    assert.equal(sumDestanaLevelCounts(payload.counts), payload.total);
    assert.equal(payload.counts.belum, 6503);
    assert.equal(payload.counts.utama, 0);
    assert.equal(payload.assessed, false);
    assert.equal(payload.items.length, 200);
    assert.equal(payload.partial, true);
    assert.ok(calls.some((call) => call.head === true && call.count === "exact"));
    assert.equal(
      calls.some((call) => call.limit != null),
      false,
    );
    assert.ok(
      calls.some(
        (call) => call.head === true && call.filters.some((filter) => filter.op === "is" && filter.value === null),
      ),
    );
  });

  it("keeps assessed counts exact when scored rows exceed 1000 and returned items disagree", async () => {
    const levels: LevelCounts = { belum: 200, pratama: 500, madya: 400, utama: 600 };
    const { client } = mockProfilDesa(levels);
    const payload = await loadDestanaPublic(client as never, {
      kabupaten: "Aceh Besar",
      q: "",
      page: 1,
      pageSize: 200,
    });

    assert.equal(payload.total, 1700);
    assert.equal(sumDestanaLevelCounts(payload.counts), 1700);
    assert.equal(payload.assessed, true);
    assert.equal(payload.counts.pratama, 500);
    assert.equal(payload.items.length, 200);
    assert.equal(payload.partial, true);
    assert.ok(payload.items.every((item) => item.destana_level === "utama"));
  });

  it("folds unknown levels into the total so the sum still matches", async () => {
    const levels: LevelCounts = { belum: 10, pratama: 0, madya: 0, utama: 0, lain: 4 };
    const { client } = mockProfilDesa(levels);
    const payload = await loadDestanaPublic(client as never, {
      kabupaten: "",
      q: "",
      page: 1,
      pageSize: 200,
    });
    assert.equal(payload.total, 14);
    assert.equal(payload.counts.lain, 4);
    assert.equal(sumDestanaLevelCounts(payload.counts), payload.total);
    assert.equal(payload.assessed, true);
  });

  it("filters the item page without changing level totals and marks a complete page", async () => {
    const levels: LevelCounts = { belum: 6503, pratama: 0, madya: 0, utama: 0 };
    const { client, calls } = mockProfilDesa(levels, 1);
    const payload = await loadDestanaPublic(client as never, {
      kabupaten: "Pidie",
      q: "Pande",
      page: 1,
      pageSize: 200,
    });

    assert.equal(payload.total, 6503);
    assert.equal(payload.counts.belum, 6503);
    assert.equal(payload.listTotal, 1);
    assert.equal(payload.items.length, 1);
    assert.equal(payload.partial, false);
    assert.equal(payload.assessed, false);
    const levelCounts = calls.filter((call) => call.head && call.filters.some((filter) => filter.column === "destana_level"));
    assert.ok(levelCounts.every((call) => call.filters.some((filter) => filter.op === "eq" && filter.column === "kabupaten")));
    assert.ok(levelCounts.every((call) => !call.filters.some((filter) => filter.op === "ilike")));
    assert.ok(calls.some((call) => !call.head && call.filters.some((filter) => filter.op === "ilike" && filter.column === "nama")));
  });

  it("clamps page size under the PostgREST max-rows cap", () => {
    const parsed = parseDestanaPublicQuery(
      new URLSearchParams({ page: "0", pageSize: "5000", kabupaten: "  Pidie  ", q: "Pande" }),
    );
    assert.equal(parsed.page, 1);
    assert.equal(parsed.pageSize, 200);
    assert.equal(parsed.kabupaten, "Pidie");
    assert.equal(parsed.q, "Pande");
  });
});

describe("destana public empty state", () => {
  it("renders the unavailable copy and hides belum-dinilai figures when nothing is assessed", () => {
    const payload: DestanaPublicPayload = {
      items: [
        {
          id: "1",
          nama: "Desa Contoh",
          kabupaten: "Aceh Besar",
          kecamatan: null,
          kode_desa_kelurahan: null,
          destana_level: null,
          destana_indeks: null,
          destana_tahun: null,
        },
      ],
      counts: { belum: 6503, pratama: 0, madya: 0, utama: 0 },
      total: 6503,
      listTotal: 6503,
      assessed: false,
      partial: true,
      page: 1,
      pageSize: 200,
    };
    const html = renderView(payload);
    assert.match(html, /Penilaian Destana belum tersedia/);
    assert.match(html, /data-testid="destana-public-empty"/);
    assert.doesNotMatch(html, /6503/);
    assert.doesNotMatch(html, /Belum dinilai/);
    assert.doesNotMatch(html, /Desa Contoh/);
  });

  it("renders assessed level counts and a partial-list notice", () => {
    const payload: DestanaPublicPayload = {
      items: [
        {
          id: "1",
          nama: "Desa Contoh",
          kabupaten: "Aceh Besar",
          kecamatan: null,
          kode_desa_kelurahan: null,
          destana_level: "pratama",
          destana_indeks: 50,
          destana_tahun: 2024,
        },
      ],
      counts: { belum: 200, pratama: 500, madya: 400, utama: 600 },
      total: 1700,
      listTotal: 1700,
      assessed: true,
      partial: true,
      page: 1,
      pageSize: 200,
    };
    const html = renderView(payload);
    assert.match(html, /500/);
    assert.match(html, /Desa Contoh/);
    assert.match(html, /Menampilkan sebagian desa/);
    assert.doesNotMatch(html, /Penilaian Destana belum tersedia/);
  });

  it("ships the Indonesian empty copy and an English equivalent", () => {
    const id = JSON.parse(readFileSync(join(process.cwd(), "messages/id.json"), "utf8")) as {
      destanaPublic: Record<string, string>;
    };
    const en = JSON.parse(readFileSync(join(process.cwd(), "messages/en.json"), "utf8")) as {
      destanaPublic: Record<string, string>;
    };
    assert.equal(id.destanaPublic.unavailable, DESTANA_UNAVAILABLE_ID);
    assert.equal(en.destanaPublic.unavailable, DESTANA_UNAVAILABLE_EN);
    assert.notEqual(en.destanaPublic.unavailable, id.destanaPublic.unavailable);
  });
});

describe("destana consumers", () => {
  it("does not quote a belum-dinilai total in the guide when assessed is false", () => {
    const match: GuideMatch = { intent: "destana", query: "destana" };
    const ctx: GuideContext = {
      failed: [],
      destana: {
        counts: { belum: 6503, pratama: 0, madya: 0, utama: 0 },
        assessed: false,
      },
    };
    const id = composeGuideAnswer(match, ctx, "id");
    const en = composeGuideAnswer(match, ctx, "en");
    assert.match(id.body, /Penilaian Destana belum tersedia/);
    assert.match(en.body, /Destana assessment is not available yet/);
    assert.doesNotMatch(id.body, /6503/);
    assert.doesNotMatch(en.body, /6503/);
    const chunk = contextToChunks(ctx, "id").find((row) => row.sourceId === "live:destana");
    assert.ok(chunk);
    assert.match(chunk.text, /Penilaian Destana belum tersedia/);
    assert.doesNotMatch(chunk.text, /6503/);
  });

  it("serves a static fixture with assessed false instead of a truncated count", async () => {
    const prev = process.env.STATIC_EXPORT;
    process.env.STATIC_EXPORT = "1";
    try {
      const res = await fetchPublicApi("/api/sik/public?kind=destana");
      assert.equal(res.status, 200);
      const body = (await res.json()) as DestanaPublicPayload & { source?: string };
      assert.equal(body.assessed, false);
      assert.equal(body.source, "fixture");
      assert.equal(sumDestanaLevelCounts(body.counts), body.total);
      assert.equal(body.partial, false);
    } finally {
      if (prev === undefined) delete process.env.STATIC_EXPORT;
      else process.env.STATIC_EXPORT = prev;
    }
  });

  it("stops counting destana rows in the public route", () => {
    const src = readFileSync(join(process.cwd(), "src/app/api/sik/public/route.ts"), "utf8");
    assert.match(src, /loadDestanaPublic/);
    assert.doesNotMatch(src, /limit\(2000\)/);
    assert.doesNotMatch(src, /counts\[level\]/);
  });
});
