const fs = require("fs");
const path = require("path");

const SRC =
  process.argv[2] ||
  "C:/Users/Patron/OneDrive/Documents/data bencana aceh/database/profil_desa/profil_desa_aceh.json";
const ROOT = process.argv[3] || "C:/Users/Patron/aceh-tangguh";
const rowsOut = path.join(ROOT, "scripts/seed-sql/profil-desa-rows.json");
const fixtureOut = path.join(ROOT, "public/fixtures/profil-desa.json");
const geoPath = path.join(ROOT, "public/fixtures/areas/villageDistribution.geojson");

function n(v) {
  if (v == null || v === "") return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function bucket(total) {
  const t = total || 0;
  if (t <= 20) return "sangat_rendah";
  if (t <= 191) return "rendah";
  if (t <= 731) return "sedang";
  if (t <= 2849) return "tinggi";
  return "sangat_tinggi";
}

const src = JSON.parse(fs.readFileSync(SRC, "utf8"));
const list = src.desa_kelurahan || [];
const rows = [];
const byKode = new Map();

for (const d of list) {
  const kab = d.kabupaten_kota?.nama_normalisasi || d.kabupaten_kota?.nama || null;
  const kec = d.lokasi?.kecamatan || null;
  const dampak = d.dampak_bencana || {};
  const demo = d.demografi || {};
  const rr = n(dampak.rumah_rusak_ringan) ?? 0;
  const rs = n(dampak.rumah_rusak_sedang) ?? 0;
  const rb = n(dampak.rumah_rusak_berat) ?? 0;
  const total =
    n(dampak.total_rumah_rusak) ?? (rr + rs + rb);
  const row = {
    id: d.id,
    kode_desa_kelurahan: d.kode_desa_kelurahan,
    nama: d.desa_kelurahan,
    kabupaten: kab,
    kecamatan: kec,
    kode_kabupaten: d.lokasi?.kode_kabupaten_kota || null,
    kode_kecamatan: d.lokasi?.kode_kecamatan || null,
    kondisi_kode: d.kondisi?.kondisi_desa_kode || null,
    kk: n(demo.jumlah_kk),
    populasi: n(demo.jumlah_populasi),
    kk_terdampak: n(dampak.jumlah_kk_terdampak),
    populasi_terdampak: n(dampak.populasi_terdampak),
    korban_meninggal: n(dampak.korban_meninggal),
    korban_hilang: n(dampak.korban_hilang),
    rumah_rr: n(dampak.rumah_rusak_ringan),
    rumah_rs: n(dampak.rumah_rusak_sedang),
    rumah_rb: n(dampak.rumah_rusak_berat),
    total_rumah_rusak: total,
    payload: d,
  };
  rows.push(row);
  byKode.set(row.kode_desa_kelurahan, row);
}

fs.mkdirSync(path.dirname(rowsOut), { recursive: true });
fs.writeFileSync(rowsOut, JSON.stringify(rows));
// slim fixture for repo (metadata + ringkasan only + note); full source too big for casual diffs
fs.writeFileSync(
  fixtureOut,
  JSON.stringify({
    metadata: src.metadata,
    ringkasan: src.ringkasan,
    note: "Full desa_kelurahan rows live in Supabase profil_desa; source file on Drive/OneDrive.",
    source_path:
      "database/profil_desa/profil_desa_aceh.json",
    total: rows.length,
  })
);

let matched = 0;
let unmatched = 0;
if (fs.existsSync(geoPath)) {
  const geo = JSON.parse(fs.readFileSync(geoPath, "utf8"));
  for (const f of geo.features || []) {
    const kode = f.properties?.kode_desa_kelurahan;
    const row = kode ? byKode.get(kode) : null;
    if (!row) {
      unmatched++;
      continue;
    }
    matched++;
    const total = row.total_rumah_rusak || 0;
    f.properties = {
      ...f.properties,
      name: row.nama,
      kabupaten: row.kabupaten,
      kecamatan: row.kecamatan,
      level: "desa",
      value: total,
      bucket: bucket(total),
      rumah_rr: row.rumah_rr ?? 0,
      rumah_rs: row.rumah_rs ?? 0,
      rumah_rb: row.rumah_rb ?? 0,
      kode_desa_kelurahan: row.kode_desa_kelurahan,
      kode_kecamatan: row.kode_kecamatan,
      kode_kabupaten: row.kode_kabupaten,
      kondisi_kode: row.kondisi_kode,
      kk: row.kk,
      populasi: row.populasi,
      source: "profil_desa_aceh.json",
      profil_id: row.id,
    };
  }
  fs.writeFileSync(geoPath, JSON.stringify(geo));
}

console.log(
  JSON.stringify(
    { rows: rows.length, rowsOut, fixtureOut, matched, unmatched },
    null,
    2
  )
);
