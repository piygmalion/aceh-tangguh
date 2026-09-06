import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import {
  ACEH_OSM_PMTILES_FILENAME,
  ACEH_OSM_PMTILES_LOCAL_PATH,
  ACEH_OSM_REQUIRED_LAYERS,
  OVERLAY_PMTILES_FILES,
  configuredAcehOsmPmtilesUrl,
  overlayPmtilesFilename,
  overlayPmtilesUrl,
  publicTilesBaseUrl,
  toMapLibreVectorSourceUrl,
} from "./tiles-url";

const ENV_KEYS = ["NEXT_PUBLIC_TILES_BASE_URL", "NEXT_PUBLIC_ACEH_OSM_PMTILES"] as const;
const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};

function setEnv(key: (typeof ENV_KEYS)[number], value: string | undefined) {
  if (!(key in saved)) saved[key] = process.env[key];
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (!(key in saved)) continue;
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
    delete saved[key];
  }
});

describe("overlay PMTiles URLs", () => {
  it("defaults to /tiles/<file> when NEXT_PUBLIC_TILES_BASE_URL is unset", () => {
    setEnv("NEXT_PUBLIC_TILES_BASE_URL", undefined);
    assert.equal(publicTilesBaseUrl(), "");
    assert.equal(overlayPmtilesUrl("kecamatan-r3p.pmtiles"), "/tiles/kecamatan-r3p.pmtiles");
    assert.equal(overlayPmtilesUrl("/tiles/village-r3p.pmtiles"), "/tiles/village-r3p.pmtiles");
    assert.equal(overlayPmtilesUrl(OVERLAY_PMTILES_FILES.kecamatan), "/tiles/kecamatan-r3p.pmtiles");
    assert.equal(overlayPmtilesUrl(OVERLAY_PMTILES_FILES.village), "/tiles/village-r3p.pmtiles");
    assert.equal(overlayPmtilesUrl(OVERLAY_PMTILES_FILES.irbi), "/tiles/irbi-2025.pmtiles");
    assert.equal(overlayPmtilesFilename("/tiles/kecamatan-r3p.pmtiles"), "kecamatan-r3p.pmtiles");
    assert.equal("kab" in OVERLAY_PMTILES_FILES, false);
  });

  it("prefixes overlay archives with NEXT_PUBLIC_TILES_BASE_URL when set", () => {
    setEnv("NEXT_PUBLIC_TILES_BASE_URL", "https://tiles.example.com/aceh/");
    assert.equal(publicTilesBaseUrl(), "https://tiles.example.com/aceh");
    assert.equal(
      overlayPmtilesUrl("kecamatan-r3p.pmtiles"),
      "https://tiles.example.com/aceh/kecamatan-r3p.pmtiles"
    );
    assert.equal(
      overlayPmtilesUrl("/tiles/kecamatan-r3p.pmtiles"),
      "https://tiles.example.com/aceh/kecamatan-r3p.pmtiles"
    );
    assert.equal(
      overlayPmtilesUrl(ACEH_OSM_PMTILES_FILENAME),
      "https://tiles.example.com/aceh/aceh-osm.pmtiles"
    );
  });
});

describe("Aceh OSM brand tiles URL", () => {
  it("reads NEXT_PUBLIC_ACEH_OSM_PMTILES and leaves local path as a conventional default", () => {
    setEnv("NEXT_PUBLIC_ACEH_OSM_PMTILES", undefined);
    assert.equal(configuredAcehOsmPmtilesUrl(), null);
    assert.equal(ACEH_OSM_PMTILES_LOCAL_PATH, "/tiles/aceh-osm.pmtiles");

    setEnv("NEXT_PUBLIC_ACEH_OSM_PMTILES", "/tiles/aceh-osm.pmtiles");
    assert.equal(configuredAcehOsmPmtilesUrl(), "/tiles/aceh-osm.pmtiles");

    setEnv("NEXT_PUBLIC_ACEH_OSM_PMTILES", "https://cdn.example.com/aceh-osm.pmtiles");
    assert.equal(configuredAcehOsmPmtilesUrl(), "https://cdn.example.com/aceh-osm.pmtiles");
  });

  it("wraps PMTiles archives in pmtiles:// and leaves TileJSON URLs alone", () => {
    assert.equal(
      toMapLibreVectorSourceUrl("/tiles/aceh-osm.pmtiles"),
      "pmtiles:///tiles/aceh-osm.pmtiles"
    );
    assert.equal(
      toMapLibreVectorSourceUrl("https://cdn.example.com/aceh-osm.pmtiles?v=1"),
      "pmtiles://https://cdn.example.com/aceh-osm.pmtiles?v=1"
    );
    assert.equal(
      toMapLibreVectorSourceUrl("pmtiles://https://cdn.example.com/aceh-osm.pmtiles"),
      "pmtiles://https://cdn.example.com/aceh-osm.pmtiles"
    );
    assert.equal(
      toMapLibreVectorSourceUrl("https://tiles.openfreemap.org/planet"),
      "https://tiles.openfreemap.org/planet"
    );
  });

  it("lists the OpenMapTiles layers brand presets paint", () => {
    for (const layer of [
      "landcover",
      "water",
      "waterway",
      "building",
      "transportation",
      "boundary",
      "place",
      "water_name",
      "transportation_name",
    ]) {
      assert.ok(
        (ACEH_OSM_REQUIRED_LAYERS as readonly string[]).includes(layer),
        `missing ${layer}`
      );
    }
  });
});
