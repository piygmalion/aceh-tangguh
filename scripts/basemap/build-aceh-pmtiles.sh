#!/usr/bin/env bash
# Build an Aceh-clipped OpenMapTiles vector basemap → public/tiles/aceh-osm.pmtiles
#
# Profile: Planetiler's default OpenMapTiles schema (not Protomaps).
# The app style and scripts/check-tiles.mjs already paint OpenMapTiles
# source-layers (landcover, park, water, transportation, place, …).
# A Protomaps basemap profile would need a second style.
#
# Geofabrik publishes Indonesia (asia/indonesia-latest.osm.pbf, about 1.6 GB)
# and does not publish a Sumatra sub-extract (asia.html, checked 2026-10-27).
# This script downloads that Indonesia extract, clips it to ACEH_BBOX with
# osmium, then runs Planetiler. The rectangle is the app's operational
# envelope (src/lib/aceh-scope.ts), not a claim of the legal provincial border.
#
# Output is committed and bundled by Vercel (must stay < 50 MB; served with
# HTTP Range). Optionally host it on R2/CDN and set
# NEXT_PUBLIC_BASEMAP_PMTILES_URL. Expected size at z14 is on the order of tens of MB;
# the journal records a measured size when a build is run.
#
#   npm run build:basemap
#   ACEH_OSM_PBF_URL=https://… bash scripts/basemap/build-aceh-pmtiles.sh
#
# Requires: curl, osmium-tool, Java 21+.
# Planetiler also downloads Natural Earth / water polygons on first run (--download).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="${ACEH_OSM_WORK:-$ROOT/scripts/_/aceh-basemap}"
OUT_DIR="$ROOT/public/tiles"
OUT="$OUT_DIR/aceh-osm.pmtiles"

ACEH_BBOX="${ACEH_BBOX:-95.0,2.0,98.3,6.15}"
MAXZOOM="${ACEH_OSM_MAXZOOM:-14}"
PLANETILER_VERSION="${PLANETILER_VERSION:-0.9.0}"
PLANETILER_JAR="${PLANETILER_JAR:-$WORK/planetiler-${PLANETILER_VERSION}.jar}"
PLANETILER_URL="${PLANETILER_URL:-https://github.com/onthegomap/planetiler/releases/download/v${PLANETILER_VERSION}/planetiler.jar}"
GEOFABRIK_INDONESIA_URL="${GEOFABRIK_INDONESIA_URL:-https://download.geofabrik.de/asia/indonesia-latest.osm.pbf}"

FORCE=0
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    --help|-h)
      sed -n '2,28p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown flag: $arg" >&2
      exit 2
      ;;
  esac
done

if ! command -v osmium >/dev/null 2>&1; then
  echo "osmium-tool is required to clip Indonesia to ACEH_BBOX (apt install osmium-tool)" >&2
  exit 1
fi
if ! command -v java >/dev/null 2>&1; then
  echo "Java 21+ is required for Planetiler" >&2
  exit 1
fi

mkdir -p "$WORK" "$OUT_DIR"
SOURCE_PBF="$WORK/indonesia.osm.pbf"
PBF="$WORK/aceh.osm.pbf"

if [[ -n "${ACEH_OSM_PBF_URL:-}" ]]; then
  echo "==> Download override $ACEH_OSM_PBF_URL"
  curl -fL --retry 3 --retry-delay 2 -o "$SOURCE_PBF" "$ACEH_OSM_PBF_URL"
elif [[ -f "$SOURCE_PBF" && "$FORCE" -eq 0 ]]; then
  echo "==> Reusing $SOURCE_PBF"
else
  echo "==> Download Geofabrik Indonesia (no Sumatra extract on download.geofabrik.de/asia.html)"
  curl -fL --retry 3 --retry-delay 2 -o "$SOURCE_PBF" "$GEOFABRIK_INDONESIA_URL"
fi

echo "==> osmium extract -b $ACEH_BBOX"
osmium extract -b "$ACEH_BBOX" --overwrite "$SOURCE_PBF" -o "$PBF"

if [[ ! -f "$PLANETILER_JAR" || "$FORCE" -eq 1 ]]; then
  echo "==> Download Planetiler $PLANETILER_VERSION"
  curl -fL --retry 3 --retry-delay 2 -o "$PLANETILER_JAR" "$PLANETILER_URL"
fi

echo "==> Planetiler OpenMapTiles maxzoom=$MAXZOOM bounds=$ACEH_BBOX"
java -Xmx"${PLANETILER_XMX:-4g}" -jar "$PLANETILER_JAR" \
  --osm-path="$PBF" \
  --output="$OUT" \
  --force \
  --download \
  --bounds="$ACEH_BBOX" \
  --maxzoom="$MAXZOOM"

bytes="$(wc -c < "$OUT")"
echo "==> Wrote $OUT ($(awk -v b="$bytes" 'BEGIN{ printf "%.2f MB", b/1024/1024 }'))"
if [[ "$bytes" -gt $((120 * 1024 * 1024)) ]]; then
  echo "warn  archive is larger than 120 MB — consider lowering ACEH_OSM_MAXZOOM (now $MAXZOOM)" >&2
fi

echo "==> Header + OpenMapTiles source-layers (overlay size gates do not apply)"
node "$ROOT/scripts/check-tiles.mjs" "$OUT"
echo "Commit $OUT (Vercel bundle, < 50 MB) or host it with HTTP Range and set NEXT_PUBLIC_BASEMAP_PMTILES_URL."
