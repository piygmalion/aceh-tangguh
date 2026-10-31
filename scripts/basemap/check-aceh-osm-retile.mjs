#!/usr/bin/env node
// Gate for the monthly Aceh OSM re-tile: archive < 50 MB, zoom 0–14, no tile > 500 KB.
// Usage: node scripts/basemap/check-aceh-osm-retile.mjs public/tiles/aceh-osm.pmtiles
import { open, stat } from "node:fs/promises";
import { PMTiles } from "pmtiles";

const path = process.argv[2] ?? "public/tiles/aceh-osm.pmtiles";
const MAX_ARCHIVE = 50 * 1024 * 1024;
const MAX_TILE = 500 * 1024;

const fh = await open(path, "r");
const source = {
  getKey: () => path,
  async getBytes(offset, length) {
    const buf = Buffer.alloc(length);
    const { bytesRead } = await fh.read(buf, 0, length, offset);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + bytesRead);
    return { data: ab };
  },
};
const p = new PMTiles(source);
const h = await p.getHeader();
const size = (await stat(path)).size;

// Walk directories to find the largest tile entry.
let maxLen = 0, count = 0, over = 0;
async function walk(offset, length) {
  const entries = await p.cache.getDirectory(source, offset, length, h);
  for (const e of entries) {
    if (e.runLength === 0) await walk(h.leafDirectoryOffset + e.offset, e.length);
    else { count += e.runLength; if (e.length > maxLen) maxLen = e.length; if (e.length > MAX_TILE) over++; }
  }
}
await walk(h.rootDirectoryOffset, h.rootDirectoryLength);
await fh.close();

const fail = [];
if (size >= MAX_ARCHIVE) fail.push(`archive ${size} B >= 50 MB`);
if (h.minZoom !== 0 || h.maxZoom !== 14) fail.push(`zoom ${h.minZoom}-${h.maxZoom}, expected 0-14`);
if (over > 0) fail.push(`${over} tiles > 500 KB`);
console.log(`size=${size} zoom=${h.minZoom}-${h.maxZoom} tiles=${count} maxTile=${maxLen} over500KB=${over}`);
if (fail.length) { console.error("FAIL: " + fail.join("; ")); process.exit(1); }
console.log("OK");
