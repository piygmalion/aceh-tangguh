import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseFirmsCsv } from "./firms";
import { emptyFirmsResponse, firmsHttpStatus } from "./types";

const SAMPLE = `latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
5.55,95.32,330,0.4,0.4,2026-09-08,0630,N,VIIRS,nominal,2.0NRT,290,4.2,D
1.0,10.0,330,0.4,0.4,2026-09-08,0630,N,VIIRS,nominal,2.0NRT,290,1.0,D
`;

describe("FIRMS CSV parse (AN-57)", () => {
  it("keeps Aceh bbox points and drops others", () => {
    const fc = parseFirmsCsv(SAMPLE, "2026-09-08T12:00:00.000Z");
    assert.equal(fc.metadata.official, false);
    assert.equal(fc.metadata.validation, "unofficial_nrt");
    assert.equal(fc.metadata.status, "ok");
    assert.equal(fc.features.length, 1);
    assert.deepEqual(fc.features[0].geometry.coordinates, [95.32, 5.55]);
    assert.equal(fc.features[0].properties.acq_date, "2026-09-08");
    assert.equal(firmsHttpStatus(fc), 200);
  });

  it("maps unconfigured and upstream to 503 with empty features", () => {
    const missing = emptyFirmsResponse("unconfigured");
    const up = emptyFirmsResponse("upstream");
    assert.equal(firmsHttpStatus(missing), 503);
    assert.equal(firmsHttpStatus(up), 503);
    assert.deepEqual(missing.features, []);
    assert.equal(missing.metadata.official, false);
  });

  it("rejects error payloads instead of inventing points", () => {
    assert.throws(() => parseFirmsCsv("Invalid MAP_KEY", "2026-09-08T00:00:00.000Z"));
  });

  it("treats header-only CSV as empty-ok", () => {
    const fc = parseFirmsCsv(
      "latitude,longitude,acq_date,acq_time,confidence,frp,satellite,daynight\n",
      "2026-09-08T12:00:00.000Z",
    );
    assert.equal(fc.features.length, 0);
    assert.equal(fc.metadata.status, "ok");
    assert.equal(firmsHttpStatus(fc), 200);
  });
});
