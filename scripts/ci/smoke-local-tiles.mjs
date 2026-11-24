/**
 * Smoke Range untuk /tiles/aceh-osm.pmtiles pada server lokal setelah build.
 * Hanya loopback. Tidak memanggil host produksi atau CDN.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = "3456";
const BASE = `http://127.0.0.1:${PORT}`;

/**
 * @param {string} base
 */
export function assertLoopback(base) {
  const url = new URL(base);
  if (url.protocol !== "http:") throw new Error("smoke hanya http");
  if (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") {
    throw new Error("smoke menolak host selain loopback");
  }
}

/**
 * @param {{ status: number, cacheControl: string | null, contentRange: string | null, location: string | null, bodyByteLength: number }} input
 * @returns {string[]}
 */
export function assessTileSmoke(input) {
  /** @type {string[]} */
  const errors = [];
  if (input.status !== 206 && input.status !== 200) {
    errors.push(`status ${input.status}, diharapkan 206 atau 200`);
  }
  if (input.status === 206 && !String(input.contentRange ?? "").startsWith("bytes")) {
    errors.push("206 tanpa Content-Range");
  }
  const cache = input.cacheControl ?? "";
  if (!cache.includes("max-age=86400")) {
    errors.push(`Cache-Control tidak memuat max-age=86400 (${cache || "kosong"})`);
  }
  const location = input.location ?? "";
  if (/cartocdn|openstreetmap\.org|openfreemap/i.test(location)) {
    errors.push("respons mengarah ke OSM publik atau Carto");
  }
  if (input.bodyByteLength <= 0) errors.push("badan respons kosong");
  return errors;
}

/**
 * @param {string} base
 * @param {import("node:child_process").ChildProcess} child
 */
async function waitUntilReady(base, child) {
  const deadline = Date.now() + 90_000;
  let last = "belum ada jawaban";
  while (Date.now() < deadline) {
    if (child.exitCode != null) {
      throw new Error(`next start berhenti dengan kode ${child.exitCode}`);
    }
    try {
      const res = await fetch(`${base}/tiles/aceh-osm.pmtiles`, {
        method: "HEAD",
        redirect: "manual",
      });
      if (res.status < 500) return;
      last = `HEAD ${res.status}`;
    } catch (err) {
      last = err instanceof Error ? err.message : String(err);
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`server lokal tidak siap: ${last}`);
}

async function main() {
  assertLoopback(BASE);
  const nextBin = join(ROOT, "node_modules", "next", "dist", "bin", "next");
  const child = spawn(process.execPath, [nextBin, "start", "-H", "127.0.0.1", "-p", PORT], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  let log = "";
  const capture = (chunk) => {
    log += chunk.toString();
    if (log.length > 12_000) log = log.slice(-12_000);
  };
  child.stdout?.on("data", capture);
  child.stderr?.on("data", capture);
  try {
    await waitUntilReady(BASE, child);
    const res = await fetch(`${BASE}/tiles/aceh-osm.pmtiles`, {
      headers: { Range: "bytes=0-16383" },
      redirect: "manual",
    });
    const body = await res.arrayBuffer();
    const errors = assessTileSmoke({
      status: res.status,
      cacheControl: res.headers.get("cache-control"),
      contentRange: res.headers.get("content-range"),
      location: res.headers.get("location"),
      bodyByteLength: body.byteLength,
    });
    if (errors.length > 0) {
      console.error(errors.join("\n"));
      console.error(log);
      process.exitCode = 1;
      return;
    }
    console.log(
      `Smoke loopback ${res.status}, ${body.byteLength} byte, Cache-Control ${res.headers.get("cache-control")}`,
    );
  } finally {
    if (child.exitCode == null) child.kill("SIGTERM");
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
}
