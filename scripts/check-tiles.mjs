#!/usr/bin/env node
/**
 * Overlay PMTiles per-tile size enforcer (stage 1).
 *
 * Checks Mapbox vector tiles *inside* committed archives under public/tiles/.
 * The archive file size is irrelevant (village-r3p.pmtiles ~3 MB is fine).
 * Limit: 500 KB per individual tile. Carto raster remains the default basemap.
 *
 * Usage:
 *   node scripts/check-tiles.mjs
 *   node scripts/check-tiles.mjs public/tiles/village-r3p.pmtiles
 */
import { open, readdir, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PMTiles, TileType, tileIdToZxy } from "pmtiles";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
const DEFAULT_DIR = join(ROOT, "public", "tiles");
const LIMIT_BYTES = 500 * 1024;
const WARN_BYTES = 400 * 1024;

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
    const tiles = await collectTiles(archive, header);
    const fileBytes = (await stat(filePath)).size;
    return { header, tiles, fileBytes };
  } finally {
    await handle.close();
  }
}

/**
 * @param {string[]} argv
 */
async function resolveTargets(argv) {
  if (argv.length > 0) {
    return argv.map((p) => resolve(process.cwd(), p));
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

const files = await resolveTargets(process.argv.slice(2));
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
  const { header, tiles, fileBytes } = await inspectArchive(filePath);
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

  if (near.length) {
    warned += 1;
    console.log(`    warn  ${near.length} tile(s) > ${formatBytes(WARN_BYTES)}`);
    for (const t of near.slice(0, 8)) {
      console.log(`      z${t.z}/${t.x}/${t.y}  ${formatBytes(t.bytes)}`);
    }
  }

  if (over.length) {
    failed += 1;
    console.log(`    FAIL  ${over.length} tile(s) > ${formatBytes(LIMIT_BYTES)}`);
    for (const t of over.slice(0, 12)) {
      console.log(`      z${t.z}/${t.x}/${t.y}  ${formatBytes(t.bytes)}`);
    }
  } else {
    console.log(`    ok   all tiles ≤ ${formatBytes(LIMIT_BYTES)}`);
  }
  console.log("");
}

if (failed) {
  console.error(`${failed} archive(s) have tiles over ${formatBytes(LIMIT_BYTES)}`);
  process.exit(1);
}
console.log("All overlay PMTiles are within the 500 KB per-tile limit.");
if (warned) {
  console.log(`${warned} warning(s) — see above.`);
}
