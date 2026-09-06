#!/usr/bin/env node
/**
 * Opt-in public CDN check for overlay PMTiles (+ optional Aceh OSM extract).
 *
 * Reads NEXT_PUBLIC_TILES_BASE_URL. If unset, exits 0:
 *   skip — local /tiles default
 *
 * When set: HEAD {base}/{file} for each OVERLAY_PMTILES_FILES entry (need 2xx),
 * then GET with Range: bytes=0-16383 (accept 206 or 200).
 *
 * NEXT_PUBLIC_ACEH_OSM_PMTILES: HEAD when it is an absolute http(s) URL.
 * Local `/tiles/aceh-osm.pmtiles` is skipped unless TILES_BASE_URL is set
 * (then HEAD {base}/aceh-osm.pmtiles).
 *
 * No AWS credentials. Public URL only.
 *
 *   npm run verify:tiles-cdn
 *   node scripts/verify-tiles-cdn.mjs
 */
import { runVerifyTilesCdn } from "./lib/verify-tiles-cdn.mjs";

const { exitCode } = await runVerifyTilesCdn();
process.exit(exitCode);
