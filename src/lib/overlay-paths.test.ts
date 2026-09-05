import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { overlayVectorApiPath } from "./overlay-paths";

const ROOT = process.cwd();

describe("AN-19 overlay vector paths", () => {
  it("maps live, maritime waters, ports, and static faults", () => {
    assert.equal(overlayVectorApiPath("bmkgQuakes"), "/api/overlay/bmkgQuakes");
    assert.equal(overlayVectorApiPath("magmaQuakes"), "/api/overlay/magmaQuakes");
    assert.equal(overlayVectorApiPath("magmaVolcanoes"), "/api/overlay/magmaVolcanoes");
    assert.equal(overlayVectorApiPath("sipongiHotspots"), "/api/overlay/sipongiHotspots");
    assert.equal(overlayVectorApiPath("tatonasStations"), "/api/overlay/tatonasStations");
    assert.equal(overlayVectorApiPath("maritimeWaters"), "/api/overlay/maritime/perairan");
    assert.equal(overlayVectorApiPath("maritimePorts"), "/api/overlay/static/maritimePorts");
    assert.equal(overlayVectorApiPath("seismicSensors"), "/api/overlay/static/seismicSensors");
    assert.equal(
      overlayVectorApiPath("inariskSumateraFault"),
      "/api/overlay/static/inariskSumateraFault",
    );
    assert.equal(
      overlayVectorApiPath("inariskMegathrust"),
      "/api/overlay/static/inariskMegathrust",
    );
  });

  it("fetchOverlayGeojson memakai overlayVectorApiPath", () => {
    const hook = readFileSync(join(ROOT, "src/hooks/useOverlayGeojson.ts"), "utf8");
    assert.match(hook, /overlayVectorApiPath/);
    assert.doesNotMatch(hook, /fetchPublicApi\(`\/api\/overlay\/\$\{key\}`\)/);
  });

  it("rejects raster bahaya keys", () => {
    assert.throws(() => overlayVectorApiPath("inariskBahayaGempa"));
  });

  it("404 /api/overlay/{static-key} hints the AN-19 path", () => {
    const src = readFileSync(join(ROOT, "src/app/api/overlay/[key]/route.ts"), "utf8");
    assert.match(src, /overlayVectorApiPath/);
    assert.match(src, /hint/);
  });

  it("weather cron aliases re-export the existing handlers", () => {
    const weather = readFileSync(join(ROOT, "src/app/api/cron/weather/route.ts"), "utf8");
    const inovasi = readFileSync(
      join(ROOT, "src/app/api/cron/weather-inovasi/route.ts"),
      "utf8",
    );
    assert.match(weather, /api\/weather\/refresh\/route/);
    assert.match(inovasi, /api\/weather\/inovasi\/refresh\/route/);
  });

  it("POST cron overlay memanggil refresh maritim tanpa nilai secret", () => {
    const cron = readFileSync(join(ROOT, "src/app/api/cron/overlay-live/route.ts"), "utf8");
    assert.match(cron, /refreshMaritimeForecasts/);
    assert.match(cron, /maritime:/);
    assert.match(cron, /OVERLAY_CRON_SECRET/);
    assert.doesNotMatch(cron, /OVERLAY_CRON_SECRET:\s*[0-9a-fA-F]{16,}/);
    assert.doesNotMatch(cron, /WEATHER_CRON_SECRET/);
  });
});
