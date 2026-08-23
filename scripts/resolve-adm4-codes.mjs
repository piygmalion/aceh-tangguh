/**
 * Resolve BMKG adm4 codes for kab/kota using wilayah.id + BMKG API validation.
 * Usage: node scripts/resolve-adm4-codes.mjs
 */
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const registryPath = path.join(root, "public/fixtures/kab-weather-registry.json");

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

async function testBmkgAdm4(adm4) {
  try {
    const res = await fetch(
      `https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=${adm4}`,
      { signal: AbortSignal.timeout(15000) },
    );
    if (!res.ok) return false;
    const data = await res.json();
    return Boolean(data?.data?.[0]?.cuaca);
  } catch {
    return false;
  }
}

async function findAdm4ForAdm2(adm2) {
  const districts = await fetchJson(
    `https://wilayah.id/api/districts/${adm2}.json`,
  );
  if (!districts?.data?.length) return null;

  for (const district of districts.data.slice(0, 8)) {
    const adm3 = district.code;
    const villages = await fetchJson(
      `https://wilayah.id/api/villages/${adm3}.json`,
    );
    if (!villages?.data?.length) continue;

    for (const village of villages.data.slice(0, 5)) {
      const adm4 = village.code;
      if (await testBmkgAdm4(adm4)) {
        return { adm4, kecamatan: district.name, desa: village.name };
      }
      await new Promise((r) => setTimeout(r, 1200));
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  return null;
}

async function main() {
  const registry = JSON.parse(await readFile(registryPath, "utf8"));
  let updated = 0;

  for (const entry of registry.kabupaten_kota) {
    if (entry.adm4) {
      const ok = await testBmkgAdm4(entry.adm4);
      console.log(`${entry.slug}: existing ${entry.adm4} ${ok ? "OK" : "INVALID"}`);
      await new Promise((r) => setTimeout(r, 1200));
      continue;
    }

    process.stdout.write(`${entry.slug} (${entry.adm2})...`);
    const found = await findAdm4ForAdm2(entry.adm2);
    if (found) {
      entry.adm4 = found.adm4;
      entry.adm4_label = `${found.kecamatan} / ${found.desa}`;
      updated++;
      console.log(` ${found.adm4}`);
    } else {
      console.log(" not found");
    }
    await new Promise((r) => setTimeout(r, 1500));
  }

  registry.metadata.adm4_resolved_at = new Date().toISOString();
  await writeFile(registryPath, JSON.stringify(registry, null, 2) + "\n", "utf8");
  console.log(`Done. Updated ${updated} adm4 codes.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
