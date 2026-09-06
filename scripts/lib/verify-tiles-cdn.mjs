/**
 * Pure helpers for opt-in public-tile CDN verify.
 * No AWS credentials — NEXT_PUBLIC_TILES_BASE_URL / ACEH_OSM URL only.
 * Keep OVERLAY_PMTILES_FILES in sync with src/lib/tiles-url.ts.
 */

/** Same filenames as `OVERLAY_PMTILES_FILES` in `src/lib/tiles-url.ts`. */
export const OVERLAY_PMTILES_FILES = [
  "r3p-kab.pmtiles",
  "kecamatan-r3p.pmtiles",
  "village-r3p.pmtiles",
  "irbi-2025.pmtiles",
];

export const ACEH_OSM_PMTILES_FILENAME = "aceh-osm.pmtiles";
export const ACEH_OSM_PMTILES_LOCAL_PATH = "/tiles/aceh-osm.pmtiles";

/** PMTiles header + first directory chunk. `bytes=0-1` is also accepted by the CLI. */
export const DEFAULT_RANGE_HEADER = "bytes=0-16383";

export const SKIP_LOCAL_TILES_MESSAGE = "skip — local /tiles default";

export const EXPECTED_CORS = [
  "Expected CORS: allow GET/HEAD/Range from the app origin.",
  "  Access-Control-Allow-Origin: <app origin> (or *)",
  "  Access-Control-Allow-Methods: GET, HEAD",
  "  Access-Control-Allow-Headers: Range",
  "  Access-Control-Expose-Headers: Content-Range, Accept-Ranges, Content-Length",
  "  Do not strip Range — 206 Partial Content preferred; HTTP 200 full body is accepted.",
].join("\n");

/** @param {string | undefined | null} base */
export function normalizePublicTilesBase(base) {
  return String(base ?? "").trim().replace(/\/+$/, "");
}

/** @param {string} pathOrName */
export function overlayFilename(pathOrName) {
  return String(pathOrName ?? "")
    .replace(/^\/tiles\//, "")
    .replace(/^\//, "");
}

/**
 * Stable `{base}/{filename}` join. Empty base → `/tiles/<file>` (local default).
 * @param {string | undefined | null} base
 * @param {string} pathOrName
 */
export function joinPublicTilesUrl(base, pathOrName) {
  const name = overlayFilename(pathOrName);
  const clean = normalizePublicTilesBase(base);
  if (!clean) return `/tiles/${name}`;
  return `${clean}/${name}`;
}

/** @param {string | undefined | null} value */
export function isAbsoluteHttpUrl(value) {
  return /^https?:\/\//i.test(String(value ?? "").trim());
}

/** @param {string | undefined | null} tilesBaseUrl */
export function resolveOverlayCdnTargets(tilesBaseUrl) {
  const base = normalizePublicTilesBase(tilesBaseUrl);
  if (!base) {
    return { action: "skip", reason: SKIP_LOCAL_TILES_MESSAGE, targets: [] };
  }
  return {
    action: "verify",
    reason: null,
    targets: OVERLAY_PMTILES_FILES.map((file) => ({
      file,
      url: joinPublicTilesUrl(base, file),
    })),
  };
}

/**
 * Aceh OSM is optional brand extract — never the default basemap.
 * @param {{ acehOsmUrl?: string | null, tilesBaseUrl?: string | null }} opts
 */
export function resolveAcehOsmCdnTarget({ acehOsmUrl, tilesBaseUrl } = {}) {
  const osm = String(acehOsmUrl ?? "").trim();
  const base = normalizePublicTilesBase(tilesBaseUrl);
  if (!osm) {
    return {
      action: "skip",
      reason: "NEXT_PUBLIC_ACEH_OSM_PMTILES unset (optional brand extract)",
      url: null,
    };
  }
  if (isAbsoluteHttpUrl(osm)) {
    return { action: "verify", reason: null, url: osm };
  }
  if (base) {
    return {
      action: "verify",
      reason: null,
      url: joinPublicTilesUrl(base, ACEH_OSM_PMTILES_FILENAME),
    };
  }
  return {
    action: "skip",
    reason: "local /tiles/aceh-osm.pmtiles — skip remote unless NEXT_PUBLIC_TILES_BASE_URL set",
    url: null,
  };
}

/** @param {number} status */
export function isHttp2xx(status) {
  return Number(status) >= 200 && Number(status) < 300;
}

/** Range probe: 206 Partial Content or 200 (CDN ignored Range). */
export function isRangeAccepted(status) {
  return status === 206 || status === 200;
}

/** @param {unknown} err */
export function isOpaqueCorsOrRangeError(err) {
  if (!err) return false;
  const msg = String(/** @type {{ message?: string }} */ (err).message ?? err).toLowerCase();
  return (
    msg.includes("cors") ||
    msg.includes("failed to fetch") ||
    msg.includes("opaque") ||
    msg.includes("access-control") ||
    msg.includes("network error")
  );
}

/**
 * HEAD (2xx) then GET Range (206 or 200). Public URL only.
 * @param {string} url
 * @param {{ fetchImpl?: typeof fetch, range?: string }} [opts]
 */
export async function probePmtilesPublicUrl(url, { fetchImpl = globalThis.fetch, range = DEFAULT_RANGE_HEADER } = {}) {
  try {
    const head = await fetchImpl(url, { method: "HEAD" });
    if (!isHttp2xx(head.status)) {
      return {
        ok: false,
        url,
        step: "HEAD",
        status: head.status,
        message: `HEAD ${url} → HTTP ${head.status} (need 2xx)`,
      };
    }
    let rangeRes;
    try {
      rangeRes = await fetchImpl(url, { method: "GET", headers: { Range: range } });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      if (isOpaqueCorsOrRangeError(err)) {
        return {
          ok: false,
          url,
          step: "Range",
          status: 0,
          message: `Range probe failed (CORS/Range opaque error): ${detail}\n${EXPECTED_CORS}`,
        };
      }
      return {
        ok: false,
        url,
        step: "Range",
        status: 0,
        message: `Range GET ${url} failed: ${detail}`,
      };
    }
    if (!isRangeAccepted(rangeRes.status)) {
      return {
        ok: false,
        url,
        step: "Range",
        status: rangeRes.status,
        message: `Range GET ${url} → HTTP ${rangeRes.status} (need 206 or 200)\n${EXPECTED_CORS}`,
      };
    }
    return {
      ok: true,
      url,
      step: "ok",
      status: rangeRes.status,
      headStatus: head.status,
      rangeStatus: rangeRes.status,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    if (isOpaqueCorsOrRangeError(err)) {
      return {
        ok: false,
        url,
        step: "HEAD",
        status: 0,
        message: `HEAD failed (CORS/Range opaque error): ${detail}\n${EXPECTED_CORS}`,
      };
    }
    return {
      ok: false,
      url,
      step: "HEAD",
      status: 0,
      message: `HEAD ${url} failed: ${detail}`,
    };
  }
}

/**
 * @param {{
 *   env?: NodeJS.ProcessEnv | Record<string, string | undefined>,
 *   fetchImpl?: typeof fetch,
 *   log?: (...args: unknown[]) => void,
 * }} [opts]
 */
export async function runVerifyTilesCdn({
  env = process.env,
  fetchImpl = globalThis.fetch,
  log = console.log,
} = {}) {
  const tilesBase = env.NEXT_PUBLIC_TILES_BASE_URL;
  const acehOsm = env.NEXT_PUBLIC_ACEH_OSM_PMTILES;
  const overlays = resolveOverlayCdnTargets(tilesBase);
  const osm = resolveAcehOsmCdnTarget({ acehOsmUrl: acehOsm, tilesBaseUrl: tilesBase });

  /** @type {{ file: string, url: string, optionalBrand?: boolean }[]} */
  const targets = [...overlays.targets];
  if (osm.action === "verify" && osm.url) {
    targets.push({ file: ACEH_OSM_PMTILES_FILENAME, url: osm.url, optionalBrand: true });
  }

  if (targets.length === 0) {
    log(SKIP_LOCAL_TILES_MESSAGE);
    if (osm.action === "skip") log(`  ${osm.reason}`);
    return { exitCode: 0, skipped: true, results: [] };
  }

  if (overlays.action === "skip") {
    log(`${SKIP_LOCAL_TILES_MESSAGE} (overlay HEAD skipped)`);
  }

  const results = [];
  let failed = 0;
  for (const target of targets) {
    const probed = await probePmtilesPublicUrl(target.url, { fetchImpl });
    results.push({ ...target, ...probed });
    if (probed.ok) {
      log(`ok  ${target.file}  HEAD ${probed.headStatus}  Range ${probed.rangeStatus}  ${target.url}`);
    } else {
      failed += 1;
      log(`FAIL ${target.file}  ${probed.message}`);
    }
  }

  if (failed) {
    log(`\n${failed} tile CDN check(s) failed. No AWS credentials are used — public URL only.`);
    log(EXPECTED_CORS);
    return { exitCode: 1, skipped: false, results };
  }

  log("\nTile CDN overlays reachable (HEAD 2xx + Range 206/200).");
  return { exitCode: 0, skipped: false, results };
}
