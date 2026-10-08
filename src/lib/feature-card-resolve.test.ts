import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Feature, Point } from "geojson";
import { toFeatureCard } from "./feature-card";
import { withEventSumber } from "./feature-card-resolve";
import { loadKejadianFixture } from "./kejadian";
import type { TypedSupabaseClient } from "./supabase/server";

type Call = {
  table: string;
  select?: string;
  eq?: [string, string];
  inn?: [string, readonly string[]];
};

type Result = {
  data: { sumber_data?: unknown; id?: string } | null;
  error: { message: string } | null;
};

function point(id: string, layer: string, properties: Record<string, unknown> = {}): Feature<Point> {
  return {
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates: [96.7, 5.5] },
    properties: { layer, ...properties },
  };
}

function fakeClient(handler: (call: Call) => Result | Promise<Result>) {
  const calls: Call[] = [];
  const client = {
    from(table: string) {
      const call: Call = { table };
      calls.push(call);
      const chain = {
        select(columns: string) {
          call.select = columns;
          return chain;
        },
        eq(column: string, value: string) {
          call.eq = [column, value];
          return chain;
        },
        in(column: string, values: readonly string[]) {
          call.inn = [column, values];
          return chain;
        },
        maybeSingle() {
          return Promise.resolve(handler(call));
        },
      };
      return chain;
    },
  };
  return { client: client as unknown as TypedSupabaseClient, calls };
}

describe("disasterEvents sumber lookup", () => {
  it("reads one kejadian_bencana payload sumber_data by public id", async () => {
    const live = ["https://bpba.acehprov.go.id/rekap.pdf", "sik_aceh.db"];
    let fixtureReads = 0;
    const { client, calls } = fakeClient(() => ({ data: { sumber_data: live }, error: null }));
    const feature = point("ACEH-2023-0372", "disasterEvents", { title: "Kebakaran" });

    const next = await withEventSumber(feature, {
      client,
      readFixtureSumber: async () => {
        fixtureReads += 1;
        return ["fixture-should-not-win"];
      },
    });

    assert.equal(fixtureReads, 0);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.table, "kejadian_bencana");
    assert.equal(calls[0]?.select, "sumber_data:payload->sumber_data");
    assert.deepEqual(calls[0]?.eq, ["id", "ACEH-2023-0372"]);
    assert.equal(calls[0]?.inn, undefined);
    assert.equal(next.properties?.sumber_data, live);
    assert.equal(feature.properties?.sumber_data, undefined);
    assert.equal((next.properties?.sumber_data as string[])[1], "sik_aceh.db");
  });

  it("falls back to the fixture when the live id has no row", async () => {
    const fixture = await loadKejadianFixture();
    const row = fixture.kejadian.find((item) => Array.isArray(item.sumber_data) && item.sumber_data.length > 0);
    assert.ok(row);
    const { client, calls } = fakeClient(() => ({ data: null, error: null }));
    const feature = point(row.id, "disasterEvents");

    const next = await withEventSumber(feature, { client });

    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.table, "kejadian_bencana");
    assert.equal(calls[0]?.select, "sumber_data:payload->sumber_data");
    assert.deepEqual(calls[0]?.eq, ["id", row.id]);
    assert.deepEqual(next.properties?.sumber_data, row.sumber_data);
    assert.notEqual(next.properties?.sumber_data, undefined);
  });

  it("falls back to the fixture when Supabase errors", async () => {
    const fixtureSumber = ["from-fixture", "sik_aceh.db"];
    const { client, calls } = fakeClient(() => ({ data: null, error: { message: "permission denied" } }));
    const next = await withEventSumber(point("ACEH-ERR", "disasterEvents"), {
      client,
      readFixtureSumber: async () => fixtureSumber,
    });
    assert.equal(calls.length, 1);
    assert.deepEqual(next.properties?.sumber_data, fixtureSumber);
  });

  it("falls back to the fixture when the Supabase query throws", async () => {
    const calls: string[] = [];
    const client = {
      from(table: string) {
        calls.push(table);
        return {
          select: () => {
            throw new Error("network down");
          },
        };
      },
    };
    const next = await withEventSumber(point("ACEH-THROW", "disasterEvents"), {
      client: client as unknown as TypedSupabaseClient,
      readFixtureSumber: async () => ["thrown-fallback"],
    });
    assert.deepEqual(calls, ["kejadian_bencana"]);
    assert.deepEqual(next.properties?.sumber_data, ["thrown-fallback"]);
  });

  it("falls back to the fixture when Supabase is unconfigured and does not query", async () => {
    let fixtureReads = 0;
    const next = await withEventSumber(point("ACEH-2023-0001", "disasterEvents"), {
      client: null,
      readFixtureSumber: async (id) => {
        fixtureReads += 1;
        assert.equal(id, "ACEH-2023-0001");
        return ["unconfigured-fixture"];
      },
    });
    assert.equal(fixtureReads, 1);
    assert.deepEqual(next.properties?.sumber_data, ["unconfigured-fixture"]);
  });

  it("leaves a feature that already carries sumber_data unchanged", async () => {
    const existing = ["already-here", "sik_aceh.db"];
    const feature = point("ACEH-KEEP", "disasterEvents", { sumber_data: existing });
    let fixtureReads = 0;
    const { client, calls } = fakeClient(() => ({ data: { sumber_data: ["live"] }, error: null }));
    const next = await withEventSumber(feature, {
      client,
      readFixtureSumber: async () => {
        fixtureReads += 1;
        return ["fixture"];
      },
    });
    assert.equal(next, feature);
    assert.equal(next.properties?.sumber_data, existing);
    assert.equal(calls.length, 0);
    assert.equal(fixtureReads, 0);
  });

  it("shows no Sumber block when live and fixture both have nothing", async () => {
    const { client } = fakeClient(() => ({ data: { sumber_data: [] }, error: null }));
    const feature = point("ACEH-EMPTY", "disasterEvents", { title: "Tanpa sumber" });
    const next = await withEventSumber(feature, {
      client,
      readFixtureSumber: async () => null,
    });
    assert.equal(next.properties?.sumber_data, undefined);
    const card = toFeatureCard(next);
    assert.equal(card.sources, undefined);
  });

  it("reads one public kejadian_operasi row and does not invent a source on a miss", async () => {
    const { client, calls } = fakeClient(() => ({ data: { id: "uuid-1" }, error: null }));
    const hit = await withEventSumber(point("ops-uuid-1", "disasterEvents"), {
      client,
      readFixtureSumber: async () => {
        throw new Error("fixture should not run");
      },
    });
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.table, "kejadian_operasi");
    assert.equal(calls[0]?.select, "id");
    assert.deepEqual(calls[0]?.eq, ["id", "uuid-1"]);
    assert.deepEqual(calls[0]?.inn, ["status", ["aktif", "selesai"]]);
    assert.deepEqual(hit.properties?.sumber_data, ["SIK operasional"]);

    const miss = fakeClient(() => ({ data: null, error: null }));
    const missed = await withEventSumber(point("ops-missing", "disasterEvents"), {
      client: miss.client,
      readFixtureSumber: async () => null,
    });
    assert.equal(miss.calls[0]?.table, "kejadian_operasi");
    assert.equal(missed.properties?.sumber_data, undefined);
    assert.equal(toFeatureCard(missed).sources, undefined);
  });
});
