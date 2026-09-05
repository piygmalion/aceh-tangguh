/**
 * Clip InaRISK Faults (Sumatera + Megathrust) to Aceh bbox.
 * Same MapServer Ruang Kita loads in fault-layer.js.
 *
 *   node scripts/fetch-inarisk-faults.mjs
 */
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  FALLBACK_SOURCE_URLS,
  clipFeatureCollectionToBbox,
  inariskFaultQueryUrl,
} from "./lib/overlay-etl.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public/fixtures/overlays");
const UA =
  "AcehTangguh/0.1 (+https://github.com/piygmalion/aceh-tangguh; fetch:inarisk-faults)";

const LAYERS = [
  { id: 6, file: "sumatera-fault-aceh.geojson", layer: "inariskSumateraFault" },
  { id: 0, file: "megathrust-aceh.geojson", layer: "inariskMegathrust" },
];

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: "application/json,application/geo+json", "User-Agent": UA },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.json();
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const base = FALLBACK_SOURCE_URLS.faults;
  const prepared = [];
  for (const spec of LAYERS) {
    const url = inariskFaultQueryUrl(base, spec.id);
    const fc = await fetchJson(url);
    const features = Array.isArray(fc.features) ? fc.features : [];
    const tagged = {
      type: "FeatureCollection",
      source: url,
      features: features.map((f) => ({
        ...f,
        properties: {
          ...f.properties,
          layer: spec.layer,
          title: f.properties?.Name ?? f.properties?.Segment ?? spec.layer,
        },
      })),
    };
    const clipped = clipFeatureCollectionToBbox(tagged);
    prepared.push({ spec, clipped });
  }
  const empty = prepared.filter((item) => item.clipped.features.length === 0);
  if (empty.length > 0) {
    const names = empty.map((item) => item.spec.layer).join(", ");
    console.error(`clip produced 0 features for: ${names}; refusing to overwrite fixtures`);
    process.exit(1);
  }
  const counts = {};
  for (const { spec, clipped } of prepared) {
    await writeFile(path.join(outDir, spec.file), `${JSON.stringify(clipped)}\n`, "utf8");
    counts[spec.layer] = clipped.features.length;
  }
  console.log(JSON.stringify(counts, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
