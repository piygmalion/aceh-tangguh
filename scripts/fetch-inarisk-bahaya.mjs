/**
 * Fetch InaRISK bahaya ImageServer (Aceh envelope), polygonize sedang/tinggi.
 *
 *   node scripts/fetch-inarisk-bahaya.mjs
 */
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import {
  INARISK_BAHAYA_LAYERS,
  INARISK_BAHAYA_MAX_PNG_BYTES,
  assertBahayaPngSize,
  bahayaEmptyLayerKeys,
  inariskBahayaExportUrl,
  prepareBahayaLayer,
} from "./lib/overlay-etl.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public/fixtures/overlays");
const UA =
  "AcehTangguh/0.1 (+https://github.com/piygmalion/aceh-tangguh; fetch:inarisk-bahaya)";

async function fetchPng(url) {
  const res = await fetch(url, {
    headers: { Accept: "image/png", "User-Agent": UA },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  const declared = Number(res.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > INARISK_BAHAYA_MAX_PNG_BYTES) {
    throw new Error(`${url} content-length ${declared} exceeds ${INARISK_BAHAYA_MAX_PNG_BYTES}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  assertBahayaPngSize(buf);
  const type = res.headers.get("content-type") ?? "";
  if (!type.startsWith("image/") && buf.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error(`${url} not a PNG (${type || "unknown type"})`);
  }
  return buf;
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const prepared = [];
  for (const spec of INARISK_BAHAYA_LAYERS) {
    const url = inariskBahayaExportUrl(spec.service);
    const png = await fetchPng(url);
    const clipped = prepareBahayaLayer(png, spec);
    prepared.push({ spec, clipped, url });
  }
  const empty = bahayaEmptyLayerKeys(prepared);
  if (empty.length > 0) {
    console.error(`polygonize produced 0 features for: ${empty.join(", ")}; refusing to overwrite fixtures`);
    process.exit(1);
  }
  const counts = {};
  for (const { spec, clipped, url } of prepared) {
    const body = {
      ...clipped,
      source: url,
    };
    await writeFile(path.join(outDir, spec.file), `${JSON.stringify(body)}\n`, "utf8");
    counts[spec.key] = clipped.features.length;
  }
  console.log(JSON.stringify(counts, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
