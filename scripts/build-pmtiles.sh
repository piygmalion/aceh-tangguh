#!/usr/bin/env bash
# Rebuild vector PMTiles for R3P kab + village choropleth layers.
# Requires: tippecanoe (apt install tippecanoe)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AREAS="$ROOT/public/fixtures/areas"
OUT="$ROOT/public/tiles"
mkdir -p "$OUT"

echo "==> Building r3p-kab.pmtiles"
tippecanoe \
  -o "$OUT/r3p-kab.pmtiles" \
  --force \
  --layer=r3p \
  --name="Aceh R3P kab" \
  --attribution="Aceh Tangguh / Compiled R3P + GADM" \
  -zg \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  -y name -y value -y bucket -y kode_kab -y rumah_rr -y rumah_rs -y rumah_rb \
  "$AREAS/r3pDistribution.geojson"

echo "==> Building village-r3p.pmtiles (aggressive simplify for web)"
tippecanoe \
  -o "$OUT/village-r3p.pmtiles" \
  --force \
  --layer=village \
  --name="Aceh R3P village" \
  --attribution="Aceh Tangguh / Compiled R3P + village borders" \
  --minimum-zoom=5 \
  --maximum-zoom=12 \
  --simplification=12 \
  --simplify-only-low-zooms \
  --drop-densest-as-needed \
  --extend-zooms-if-still-dropping \
  --coalesce-densest-as-needed \
  -y name -y value -y bucket -y kabupaten -y kecamatan -y kode_desa_kelurahan \
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
echo "Done. MapViewport will prefer these when present under /tiles/."
