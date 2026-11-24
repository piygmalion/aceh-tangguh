/**
 * Anggaran arsip basemap Aceh yang sudah di-commit.
 * Ubin overlay ≤500 KB tetap di scripts/check-tiles.mjs (workflow Overlay tiles).
 * Berkas ini hanya membaca public/tiles/aceh-osm.pmtiles: ukuran < 50 MiB, zoom 0–14.
 */
import { open, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { PMTiles } from "pmtiles";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const ACEH_OSM_PATH = join(ROOT, "public", "tiles", "aceh-osm.pmtiles");
export const ACEH_OSM_MAX_BYTES = 50 * 1024 * 1024;

class NodeFileSource {
  /**
   * @param {import("node:fs/promises").FileHandle} handle
   */
  constructor(handle) {
    this.handle = handle;
  }

  getKey() {
    return "aceh-osm";
  }

  /**
   * @param {number} offset
   * @param {number} length
   */
  async getBytes(offset, length) {
    const buf = Buffer.alloc(length);
    const { bytesRead } = await this.handle.read(buf, 0, length, offset);
    return { data: buf.buffer.slice(buf.byteOffset, buf.byteOffset + bytesRead) };
  }
}

/**
 * @param {{ fileBytes: number, minZoom: number, maxZoom: number }} input
 * @returns {string[]}
 */
export function assessAcehOsmBudget(input) {
  /** @type {string[]} */
  const errors = [];
  if (input.fileBytes >= ACEH_OSM_MAX_BYTES) {
    errors.push(
      `arsip ${input.fileBytes} byte melewati ${ACEH_OSM_MAX_BYTES} byte (50 MiB)`,
    );
  }
  if (input.minZoom !== 0 || input.maxZoom !== 14) {
    errors.push(`zoom ${input.minZoom}–${input.maxZoom}, diharapkan 0–14`);
  }
  return errors;
}

async function main() {
  const fileBytes = (await stat(ACEH_OSM_PATH)).size;
  const handle = await open(ACEH_OSM_PATH, "r");
  try {
    const archive = new PMTiles(new NodeFileSource(handle));
    const header = await archive.getHeader();
    const errors = assessAcehOsmBudget({
      fileBytes,
      minZoom: header.minZoom,
      maxZoom: header.maxZoom,
    });
    if (errors.length > 0) {
      console.error("aceh-osm.pmtiles gagal anggaran");
      for (const error of errors) console.error(`  ${error}`);
      process.exit(1);
    }
    console.log(
      `aceh-osm.pmtiles ${fileBytes} byte, zoom ${header.minZoom}–${header.maxZoom}. Di bawah 50 MiB.`,
    );
  } finally {
    await handle.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
