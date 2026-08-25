#!/usr/bin/env node
/**
 * Overlay PMTiles per-tile size enforcer (stage 1).
 *
 * Checks Mapbox vector tiles *inside* committed archives under public/tiles/.
 * Per-tile limit: 500 KB (Mapbox vector tile payload). Archive size is not that
 * limit — village-r3p.pmtiles ~2.9 MB is fine. Second gate: that archive < 4 MB.
 * Known overlays must keep MapViewport source-layers: r3p, village, irbi.
 * Carto raster remains the default basemap. Geometry stays on disk, not PostGIS.
 *
 * Usage:
 *   node scripts/check-tiles.mjs
 *   node scripts/check-tiles.mjs public/tiles/village-r3p.pmtiles
 *   node scripts/check-tiles.mjs --limit=512000
 */
import { open, readdir, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PMTiles, TileType, tileIdToZxy } from "pmtiles";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const DEFAULT_DIR = join(ROOT, "public", "tiles");
const DEFAULT_LIMIT_BYTES = 500 * 1024;

/** @type {Record<string, { sourceLayer: string, maxArchiveBytes?: number }>} */
const EXPECTED_OVERLAYS = {
  "r3p-kab.pmtiles": { sourceLayer: "r3p" },
  "village-r3p.pmtiles": {
    sourceLayer: "village",
    maxArchiveBytes: 4 * 1024 * 1024,
  },
  "irbi-2025.pmtiles": { sourceLayer: "irbi" },
};

class NodeFileSource {
  /**
   * @param {import("node:fs/promises").FileHandle} handle
   * @param {string} key
   */
  constructor(handle, key) {
    this.handle = handle;
    this.key = key;
  }

  getKey() {
    return this.key;
  }

  /**
   * @param {number} offset
   * @param {number} length
   */
  async getBytes(offset, length) {
    const buf = Buffer.alloc(length);
    const { bytesRead } = await this.handle.read(buf, 0, length, offset);
    return {
      data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + bytesRead),
    };
  }
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * @param {unknown} metadata
 */
function vectorLayerIds(metadata) {
  if (!metadata || typeof metadata !== "object") return [];
  const layers = /** @type {{ vector_layers?: { id?: string }[] }} */ (metadata)
    .vector_layers;
  if (!Array.isArray(layers)) return [];
  return layers.map((layer) => layer?.id).filter((id) => typeof id === "string");
}

function tileTypeLabel(type) {
  switch (type) {
    case TileType.Mvt:
      return "mvt";
    case TileType.Png:
      return "png";
    case TileType.Jpeg:
      return "jpeg";
    case TileType.Webp:
      return "webp";
    case TileType.Avif:
      return "avif";
    default:
      return `type:${type}`;
  }
}

/**
 * Walk PMTiles directories and collect stored (usually gzip-compressed) tile sizes.
 * `entry.length` is the payload MapLibre downloads — not the archive file size.
 *
 * @param {PMTiles} archive
 * @param {import("pmtiles").Header} header
 */
async function collectTiles(archive, header) {
  /** @type {{ z: number, x: number, y: number, bytes: number }[]} */
  const tiles = [];

  /**
   * @param {number} offset
   * @param {number} length
   */
  async function walk(offset, length) {
    const entries = await archive.cache.getDirectory(
      archive.source,
      offset,
      length,
      header,
    );
    for (const entry of entries) {
      if (entry.runLength === 0) {
        await walk(header.leafDirectoryOffset + entry.offset, entry.length);
        continue;
      }
      for (let i = 0; i < entry.runLength; i += 1) {
        const [z, x, y] = tileIdToZxy(entry.tileId + i);
        tiles.push({ z, x, y, bytes: entry.length });
      }
    }
  }

  await walk(header.rootDirectoryOffset, header.rootDirectoryLength);
  return tiles;
}

/**
 * @param {string} filePath
 */
async function inspectArchive(filePath) {
  const handle = await open(filePath, "r");
  try {
    const archive = new PMTiles(new NodeFileSource(handle, filePath));
    const header = await archive.getHeader();
    const [tiles, metadata] = await Promise.all([
      collectTiles(archive, header),
      archive.getMetadata(),
    ]);
    const fileBytes = (await stat(filePath)).size;
    return { header, tiles, fileBytes, metadata };
  } finally {
    await handle.close();
  }
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  let limitBytes = DEFAULT_LIMIT_BYTES;
  const paths = [];
  for (const arg of argv) {
    if (arg.startsWith("--limit=")) {
      const n = Number(arg.slice("--limit=".length));
      if (!Number.isFinite(n) || n <= 0) {
        console.error(`Invalid --limit (bytes): ${arg}`);
        process.exit(2);
      }
      limitBytes = n;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      console.log("Usage: node scripts/check-tiles.mjs [--limit=512000] [file.pmtiles ...]");
      process.exit(0);
    }
    if (arg.startsWith("-")) {
      console.error(`Unknown flag: ${arg}`);
      process.exit(2);
    }
    paths.push(arg);
  }
  return { limitBytes, paths, warnBytes: Math.floor(limitBytes * 0.8) };
}

/**
 * @param {string[]} paths
 */
async function resolveTargets(paths) {
  if (paths.length > 0) {
    return paths.map((p) => resolve(process.cwd(), p));
  }
  let names = [];
  try {
    names = await readdir(DEFAULT_DIR);
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? err.code : "";
    if (code === "ENOENT") {
      console.error(`No tiles directory: ${relative(ROOT, DEFAULT_DIR) || "public/tiles"}`);
      process.exit(1);
    }
    throw err;
  }
  return names
    .filter((name) => name.endsWith(".pmtiles"))
    .sort()
    .map((name) => join(DEFAULT_DIR, name));
}

const { limitBytes: LIMIT_BYTES, warnBytes: WARN_BYTES, paths: cliPaths } = parseArgs(
  process.argv.slice(2),
);
const files = await resolveTargets(cliPaths);
if (files.length === 0) {
  console.error("No .pmtiles archives to check (expected public/tiles/*.pmtiles).");
  process.exit(1);
}

console.log(
  `Overlay PMTiles per-tile check — limit ${formatBytes(LIMIT_BYTES)} (archive size is not the limit)\n`,
);

let failed = 0;
let warned = 0;

for (const filePath of files) {
  const label = relative(process.cwd(), filePath);
  let header;
  let tiles;
  let fileBytes;
  let metadata;
  try {
    ({ header, tiles, fileBytes, metadata } = await inspectArchive(filePath));
  } catch (err) {
    failed += 1;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`==> ${label}`);
    console.log(`    FAIL  ${msg}\n`);
    continue;
  }
  const basename = filePath.split(/[\\/]/).pop() ?? "";
  const expected = EXPECTED_OVERLAYS[basename];
  let archiveFailed = false;
  const max = tiles.reduce(
    (best, tile) => (tile.bytes > best.bytes ? tile : best),
    { z: 0, x: 0, y: 0, bytes: 0 },
  );
  const over = tiles.filter((t) => t.bytes > LIMIT_BYTES).sort((a, b) => b.bytes - a.bytes);
  const near = tiles
    .filter((t) => t.bytes > WARN_BYTES && t.bytes <= LIMIT_BYTES)
    .sort((a, b) => b.bytes - a.bytes);

  console.log(`==> ${label}`);
  console.log(`    archive: ${formatBytes(fileBytes)}  (file size, not per-tile)`);
  console.log(
    `    type: ${tileTypeLabel(header.tileType)}  zooms: ${header.minZoom}–${header.maxZoom}  tiles: ${tiles.length}`,
  );
  if (tiles.length === 0) {
    console.log("    warn  archive has no tile entries");
    warned += 1;
  } else {
    console.log(
      `    max tile: ${formatBytes(max.bytes)}  z${max.z}/${max.x}/${max.y}`,
    );
  }

  if (header.tileType !== TileType.Mvt && header.tileType !== TileType.Unknown) {
    console.log(`    warn  expected Mapbox vector tiles, found ${tileTypeLabel(header.tileType)}`);
    warned += 1;
  }

  if (expected?.sourceLayer) {
    const ids = vectorLayerIds(metadata);
    if (!ids.includes(expected.sourceLayer)) {
      archiveFailed = true;
      console.log(
        `    FAIL  expected source-layer "${expected.sourceLayer}" (MapViewport), found ${ids.join(", ") || "(none)"}`,
      );
    } else {
      console.log(`    source-layer: ${expected.sourceLayer}`);
    }
  }

  if (expected?.maxArchiveBytes) {
    if (fileBytes > expected.maxArchiveBytes) {
      archiveFailed = true;
      console.log(
        `    FAIL  archive ${formatBytes(fileBytes)} exceeds ${formatBytes(expected.maxArchiveBytes)} budget`,
      );
    } else {
      console.log(
        `    archive budget: ${formatBytes(fileBytes)} / ${formatBytes(expected.maxArchiveBytes)}`,
      );
    }
  }

  if (near.length) {
    warned += 1;
    console.log(`    warn  ${near.length} tile(s) > ${formatBytes(WARN_BYTES)}`);
    for (const t of near.slice(0, 8)) {
      console.log(`      z${t.z}/${t.x}/${t.y}  ${formatBytes(t.bytes)}`);
    }
  }

  if (over.length) {
    archiveFailed = true;
    console.log(`    FAIL  ${over.length} tile(s) > ${formatBytes(LIMIT_BYTES)}`);
    for (const t of over.slice(0, 12)) {
      console.log(`      z${t.z}/${t.x}/${t.y}  ${formatBytes(t.bytes)}`);
    }
  } else {
    console.log(`    ok   all tiles ≤ ${formatBytes(LIMIT_BYTES)}`);
  }
  if (archiveFailed) failed += 1;
  console.log("");
}

if (failed) {
  console.error(`${failed} archive(s) failed the overlay tile check`);
  process.exit(1);
}
console.log(
  `All overlay PMTiles passed (per-tile ≤ ${formatBytes(LIMIT_BYTES)}; village archive budget and source-layers ok).`,
);
if (warned) {
  console.log(`${warned} warning(s) — see above.`);
}
