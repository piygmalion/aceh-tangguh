const fs = require("fs");
const path = require("path");

const SRC =
  process.argv[2] ||
  "C:/Users/Patron/OneDrive/Documents/data bencana aceh/database/kantor_polisi/kantor_polisi_aceh.json";
const ROOT = process.argv[3] || "C:/Users/Patron/aceh-tangguh";
const markersPath = path.join(ROOT, "public/fixtures/markers.geojson");
const fixtureOut = path.join(ROOT, "public/fixtures/kantor-polisi.json");
const rowsOut = path.join(ROOT, "scripts/seed-sql/police-rows.json");

const src = JSON.parse(fs.readFileSync(SRC, "utf8"));
const kantor = src.kantor_polisi || [];

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
    layer: "policeOffices",
    title: k.nama,
    status: statusNorm || statusLabel,
    status_label: statusLabel,
    kabupaten: kab,
    jenis_kantor: k.jenis_kantor?.kode || null,
    sub_jenis_kantor: k.sub_jenis_kantor?.kode || null,
    skala_kerusakan: k.kondisi?.skala_kerusakan_normalisasi || null,
    kecamatan: k.lokasi?.kecamatan || null,
    kelurahan: k.lokasi?.kelurahan || null,
    alamat: k.lokasi?.alamat || null,
    telepon: k.nomor_telepon || null,
    yurisdiksi: k.yurisdiksi || null,
    url_google_maps: k.lokasi?.url_google_maps || null,
    memiliki_starlink: k.infrastruktur?.memiliki_starlink ?? null,
    personel_riil: k.personel?.jumlah_personel_riil ?? null,
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
for (const k of kantor) {
  const f = featureFrom(k);
  if (!f) {
    skipped++;
    continue;
  }
  features.push(f);
  rows.push({
    id: String(f.id),
    layer: "policeOffices",
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
  (f) => (f.properties || {}).layer !== "policeOffices"
);
markers.features = kept.concat(features);
fs.writeFileSync(markersPath, JSON.stringify(markers));
fs.writeFileSync(fixtureOut, JSON.stringify(src));
fs.mkdirSync(path.dirname(rowsOut), { recursive: true });
fs.writeFileSync(rowsOut, JSON.stringify(rows));

console.log(
  JSON.stringify(
    {
      source: kantor.length,
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
