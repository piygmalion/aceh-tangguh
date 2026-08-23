import { readFile } from "fs/promises";
import path from "path";
import type {
  AnalisisAnggaran,
  AnggaranApiResponse,
  KegiatanFixture,
} from "./anggaran-types";

export {
  formatRpCompact,
  formatRpFull,
  pctOf,
} from "./anggaran-format";

let cache: AnggaranApiResponse | null = null;

export async function loadAnggaranFixtures(): Promise<AnggaranApiResponse> {
  if (cache) return cache;

  const base = path.join(process.cwd(), "public/fixtures");
  const [analisisRaw, kegiatanRaw] = await Promise.all([
    readFile(path.join(base, "analisis-anggaran-2026.json"), "utf8"),
    readFile(path.join(base, "kegiatan-penanganan-2026.json"), "utf8"),
  ]);

  const analisis = JSON.parse(analisisRaw) as AnalisisAnggaran;
  const kegiatanFile = JSON.parse(kegiatanRaw) as KegiatanFixture;

  cache = {
    analisis,
    kegiatan: kegiatanFile.kegiatan ?? [],
    source: "fixture",
  };
  return cache;
}
