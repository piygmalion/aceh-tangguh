#!/usr/bin/env bash
# Rebuild overlay vector PMTiles for R3P kecamatan + village choropleth layers.
# Requires: tippecanoe (apt install tippecanoe)
# Overlay archives only — Carto raster stays the default basemap.
# tippecanoe --layer must stay kecamatan / village / irbi (MapViewport source-layer).
# r3p-kab.pmtiles is retired (LOD0 is kecamatan). The kab tile script was removed.
# After build, check:tiles enforces 500 KB per MVT tile + village archive < 4 MB
# and kecamatan archive < 2 MB.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AREAS="$ROOT/public/fixtures/areas"
OUT="$ROOT/public/tiles"
mkdir -p "$OUT"

echo "==> Building kecamatan-r3p.pmtiles"
# Dissolve of villageDistribution by kode_kecamatan (6-digit BPS) only.
# Do not pass --use-attribute-for-id=kode_kecamatan: string BPS codes are
# not valid MVT ids. Stamp kode only from the GeoJSON; never invent codes.
tippecanoe \
  -o "$OUT/kecamatan-r3p.pmtiles" \
  --force \
  --layer=kecamatan \
  --name="Aceh R3P kecamatan" \
  --attribution="Aceh Tangguh / dissolve villageDistribution by kode_kecamatan" \
  --minimum-zoom=0 \
  --maximum-zoom=11 \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  -y name -y value -y bucket -y kabupaten -y kecamatan \
  -y kode_kecamatan -y kode_kabupaten -y kode_kab -y level \
  -y rumah_rr -y rumah_rs -y rumah_rb \
  "$AREAS/kecamatanDistribution.geojson"

echo "==> Building village-r3p.pmtiles (aggressive simplify for web)"
# Keep BPS kode as a property only. Do not pass --use-attribute-for-id=
# kode_desa_kelurahan: tippecanoe rejects the 10-digit string as a
# non-numeric MVT id, and --convert-stringified-ids-to-numbers would
# strip the property (MapViewport joins on properties.kode_desa_kelurahan)
# and can assign 0 / empty ids for slug-only polygons that have no kode.
# Stamp kode only from the GeoJSON; never invent codes for leftover slugs.
tippecanoe \
  -o "$OUT/village-r3p.pmtiles" \
  --force \
  --layer=village \
  --name="Aceh R3P village" \
  --attribution="Aceh Tangguh / profil_desa + geoportal.acehprov.go.id Peta_Administrasi_Desa" \
  --minimum-zoom=5 \
  --maximum-zoom=12 \
  --simplification=12 \
  --simplify-only-low-zooms \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  --coalesce-densest-as-needed \
  -y name -y value -y bucket -y kabupaten -y kecamatan \
  -y kode_desa_kelurahan -y kode_kecamatan -y kode_kabupaten -y kode_kab -y level \
  -y rumah_rr -y rumah_rs -y rumah_rb \
  "$AREAS/villageDistribution.geojson"

echo "==> Building irbi-2025.pmtiles"
tippecanoe \
  -o "$OUT/irbi-2025.pmtiles" \
  --force \
  --layer=irbi \
  --name="Aceh IRBI 2025 kab" \
  --attribution="BNPB IRBI 2025 / Aceh Tangguh" \
  -zg \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  -y name -y irb_2025 -y value -y bucket -y kelas_risiko -y ancaman_tertinggi \
  -y ir_banjir -y ir_gempabumi -y ir_tsunami -y ir_likuefaksi \
  "$AREAS/irbi2025.geojson"

ls -lh "$OUT"/*.pmtiles
echo "==> Checking per-tile sizes (500 KB limit, not archive size)"
node "$ROOT/scripts/check-tiles.mjs"
echo "Done. MapViewport will prefer these when present under /tiles/."
echo "Aceh OSM basemap extract is separate: npm run build:aceh-osm (not this script)."
