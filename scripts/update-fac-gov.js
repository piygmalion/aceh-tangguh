const fs = require("fs");
const path = require("path");

const SRC =
  process.argv[2] ||
  "C:/Users/Patron/OneDrive/Documents/data bencana aceh/database/fasilitas_pemerintahan/fasilitas_pemerintahan_aceh.json";
const ROOT = process.argv[3] || "C:/Users/Patron/aceh-tangguh";
const LAYER = "facGov";
const markersPath = path.join(ROOT, "public/fixtures/markers.geojson");
const fixtureOut = path.join(ROOT, "public/fixtures/fasilitas-pemerintahan.json");
const rowsOut = path.join(ROOT, "scripts/seed-sql/fac-gov-rows.json");

const src = JSON.parse(fs.readFileSync(SRC, "utf8"));
const items = src.fasilitas || [];

function featureFrom(k) {
  const lon = Number(k.lokasi?.longitude);
  const lat = Number(k.lokasi?.latitude);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  const kab =
    k.kabupaten_kota?.nama_normalisasi ||
    k.kabupaten_kota?.nama ||
    null;
  const statusNorm =
    k.operasional?.status_operasional_normalisasi || null;
  const statusLabel = k.operasional?.status_operasional || statusNorm || null;
  const properties = {
    layer: LAYER,
    title: k.nama,
    status: statusNorm || statusLabel,
    status_label: statusLabel,
    kabupaten: kab,
    jenis_fasilitas: k.jenis_fasilitas?.kode || null,
    jenis_fasilitas_nama: k.jenis_fasilitas?.nama || null,
    klasifikasi: k.klasifikasi || null,
    skala_kerusakan: k.kondisi?.skala_kerusakan_normalisasi || null,
    skala_kerusakan_label: k.kondisi?.skala_kerusakan || null,
    kecamatan: k.lokasi?.kecamatan || null,
    desa: k.lokasi?.desa || null,
    alamat: k.lokasi?.alamat || null,
    telepon: k.telepon || null,
    url_google_maps: k.lokasi?.url_google_maps || null,
    source_id: k.source_id || null,
  };
  return {
    type: "Feature",
    id: k.id,
    geometry: { type: "Point", coordinates: [lon, lat] },
    properties,
  };
}

const features = [];
const rows = [];
let skipped = 0;
for (const k of items) {
  const f = featureFrom(k);
  if (!f) {
    skipped++;
    continue;
  }
  features.push(f);
  rows.push({
    id: String(f.id),
    layer: LAYER,
    title: f.properties.title,
    status: f.properties.status,
    kabupaten: f.properties.kabupaten,
    longitude: f.geometry.coordinates[0],
    latitude: f.geometry.coordinates[1],
    properties: f.properties,
  });
}

const markers = JSON.parse(fs.readFileSync(markersPath, "utf8"));
const kept = (markers.features || []).filter(
  (f) => (f.properties || {}).layer !== LAYER
);
markers.features = kept.concat(features);
fs.writeFileSync(markersPath, JSON.stringify(markers));
fs.writeFileSync(fixtureOut, JSON.stringify(src));
fs.mkdirSync(path.dirname(rowsOut), { recursive: true });
fs.writeFileSync(rowsOut, JSON.stringify(rows));

console.log(
  JSON.stringify(
    {
      source: items.length,
      features: features.length,
      skipped,
      markersTotal: markers.features.length,
      otherLayers: kept.length,
      rowsOut,
      fixtureOut,
    },
    null,
    2
  )
);
