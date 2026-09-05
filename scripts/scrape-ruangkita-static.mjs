/**
 * One-shot ETL: discover static GeoJSON URLs from ruangkita.net JS,
 * fetch those payloads (BMKG / InaTEWS), filter to Aceh, write fixtures.
 *
 * Not used at map runtime.
 *
 *   node scripts/scrape-ruangkita-static.mjs
 */
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  FALLBACK_SOURCE_URLS,
  RUANGKITA_ORIGIN,
  assessOverlayFeatureCounts,
  filterAcehPorts,
  filterAcehSensors,
  filterAcehWaters,
  overlayLayerStats,
  parseDiscoveredUrls,
  portsToStaticRows,
  previousOverlayCounts,
} from "./lib/overlay-etl.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public/fixtures/overlays");
const UA =
  "AcehTangguh/0.1 (+https://github.com/piygmalion/aceh-tangguh; scrape:ruangkita-static)";

const JS_PAGES = [
  `${RUANGKITA_ORIGIN}/assets/js/cuaca-maritim-layer.js`,
  `${RUANGKITA_ORIGIN}/assets/js/sensor-seismic.js`,
  `${RUANGKITA_ORIGIN}/assets/js/fault-layer.js`,
];

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { Accept: "*/*", "User-Agent": UA },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.text();
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json,application/geo+json,*/*",
      "User-Agent": UA,
    },
    signal: AbortSignal.timeout(90_000),
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

async function discoverUrls() {
  const merged = { ...FALLBACK_SOURCE_URLS };
  const notes = [];
  for (const url of JS_PAGES) {
    try {
      const js = await fetchText(url);
      const found = parseDiscoveredUrls(js);
      notes.push({ url, found });
      if (found.pelabuhan) merged.pelabuhan = found.pelabuhan;
      if (found.perairanIndex) merged.perairanIndex = found.perairanIndex;
      if (found.sensors) merged.sensors = found.sensors;
      if (found.faults) merged.faults = found.faults;
    } catch (err) {
      notes.push({ url, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return { urls: merged, notes };
}

async function writeFc(name, fc, extra = {}) {
  const body = {
    type: "FeatureCollection",
    ...extra,
    features: fc.features ?? [],
  };
  await writeFile(path.join(outDir, name), `${JSON.stringify(body)}\n`, "utf8");
  return body.features.length;
}

async function readPreviousManifest() {
  try {
    return JSON.parse(await readFile(path.join(outDir, "manifest.json"), "utf8"));
  } catch {
    return null;
  }
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const previous = await readPreviousManifest();
  const { urls, notes } = await discoverUrls();

  const [portsRaw, watersRaw, sensorsRaw] = await Promise.all([
    fetchJson(urls.pelabuhan),
    fetchJson(urls.wilmetos),
    fetchJson(urls.sensors),
  ]);

  const ports = filterAcehPorts(portsRaw);
  ports.features = ports.features.map((f) => {
    const props = f.properties ?? {};
    const code = String(props.code ?? "");
    return {
      ...f,
      id: code || undefined,
      properties: {
        ...props,
        layer: "maritimePorts",
        title: props.name,
        kode_bmkg: code,
      },
    };
  });

  const waters = filterAcehWaters(watersRaw);
  const sensors = filterAcehSensors(sensorsRaw);
  const staticRows = portsToStaticRows(ports, urls.pelabuhan);

  const layers = {
    maritimePorts: overlayLayerStats(ports),
    maritimeWaters: overlayLayerStats(waters),
    seismicSensors: overlayLayerStats(sensors),
  };
  const counts = {
    maritimePorts: layers.maritimePorts.featureCount,
    maritimeWaters: layers.maritimeWaters.featureCount,
    seismicSensors: layers.seismicSensors.featureCount,
  };
  const assessment = assessOverlayFeatureCounts(
    counts,
    previousOverlayCounts(previous),
    { force: process.env.FORCE_OVERLAY_ETL === "1" },
  );
  if (!assessment.ok) {
    console.error(assessment.errors.join("\n"));
    process.exit(1);
  }

  const portCount = await writeFc("pelabuhan-aceh.geojson", ports, {
    source: urls.pelabuhan,
    discovered_via: "ruangkita.net/assets/js/cuaca-maritim-layer.js",
  });
  const waterCount = await writeFc("perairan-aceh.geojson", waters, {
    source: urls.wilmetos,
    codes: waters.features.map((f) => f.properties?.kode),
  });
  const sensorCount = await writeFc("sensor-seismic-aceh.geojson", sensors, {
    source: urls.sensors,
    discovered_via: "ruangkita.net/assets/js/sensor-seismic.js",
  });

  await writeFile(
    path.join(outDir, "overlay-static-rows.json"),
    `${JSON.stringify({ generated_at: new Date().toISOString(), rows: staticRows }, null, 2)}\n`,
    "utf8",
  );

  const manifest = {
    generated_at: new Date().toISOString(),
    ruangkita: RUANGKITA_ORIGIN,
    discovered: notes,
    urls,
    counts: {
      maritimePorts: portCount,
      maritimeWaters: waterCount,
      seismicSensors: sensorCount,
    },
    layers,
  };
  await writeFile(
    path.join(outDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  console.log(JSON.stringify(manifest.counts, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
