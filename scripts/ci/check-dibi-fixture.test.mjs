import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  DIBI_FIXTURE_PATH,
  DIBI_METRICS,
  assessDibiFixture,
} from "./check-dibi-fixture.mjs";

function row(tahun, kejadian = 0) {
  /** @type {Record<string, number>} */
  const rec = { tahun };
  for (const key of DIBI_METRICS) rec[key] = key === "kejadian" ? kejadian : 0;
  return rec;
}

describe("fixture DIBI", () => {
  it("menerima nol dan menolak null serta tahun yang hilang", () => {
    const rows = [];
    for (let year = 2008; year <= 2026; year += 1) rows.push(row(year, year === 2008 ? 0 : 1));
    const totals = row(0, 18);
    delete totals.tahun;
    assert.equal(assessDibiFixture({ totals, by_tahun: rows }).ok, true);

    const withNull = rows.map((item) => ({ ...item }));
    withNull[0] = { ...withNull[0], meninggal: null };
    const nulled = assessDibiFixture({ totals, by_tahun: withNull });
    assert.equal(nulled.ok, false);
    assert.match(nulled.errors.join("\n"), /null/);

    const dropped = rows.slice(1);
    const missing = assessDibiFixture({ totals, by_tahun: dropped });
    assert.equal(missing.ok, false);
    assert.match(missing.errors.join("\n"), /2008/);
  });

  it("berkas fixture di repo konsisten tanpa angka acuan yang dikunci", async () => {
    const payload = JSON.parse(await readFile(DIBI_FIXTURE_PATH, "utf8"));
    const verdict = assessDibiFixture(payload);
    assert.deepEqual(verdict.errors, []);
    assert.equal(verdict.ok, true);
    assert.equal(typeof payload.totals.kejadian, "number");
    assert.equal(typeof payload.totals.meninggal, "number");
  });
});
