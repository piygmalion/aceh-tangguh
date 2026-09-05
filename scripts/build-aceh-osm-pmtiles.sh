#!/usr/bin/env bash
# Build an Aceh-clipped OpenMapTiles vector extract → public/tiles/aceh-osm.pmtiles
#
# Local / manual only. Planetiler (or the tippecanoe fallback) is too heavy for
# CI — `npm run check:tiles` validates header + source-layers when the archive
# is present and skips it when it is not.
#
# Do NOT download or self-host a planet PMTiles. Aceh bbox only
# (ACEH_BBOX from src/lib/basemap.ts: 95.0, 2.0, 98.3, 6.15).
#
# Rebuild:
#   npm run build:aceh-osm
#   # or: bash scripts/build-aceh-osm-pmtiles.sh
#   #    bash scripts/build-aceh-osm-pmtiles.sh --indonesia   # Geofabrik ID + clip
#   #    ACEH_OSM_PBF_URL=https://... bash scripts/build-aceh-osm-pmtiles.sh
#
# Requires one of:
#   - Java 21+ (Planetiler jar is downloaded on first run), or Docker
#   - fallback: osmium-tool + tippecanoe  (`sudo apt install osmium-tool tippecanoe`)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
# scripts/_*/ is gitignored — jars, PBF, and scratch stay local.
WORK="${ACEH_OSM_WORK:-$ROOT/scripts/_/aceh-osm}"
OUT_DIR="$ROOT/public/tiles"
OUT="$OUT_DIR/aceh-osm.pmtiles"
LAYERS_DIR="$WORK/layers"

# Same envelope as src/lib/basemap.ts ACEH_BBOX (minLon,minLat,maxLon,maxLat).
ACEH_BBOX="${ACEH_BBOX:-95.0,2.0,98.3,6.15}"
MAXZOOM="${ACEH_OSM_MAXZOOM:-14}"
# Pin Planetiler so rebuilds stay reproducible. Override with PLANETILER_JAR.
PLANETILER_VERSION="${PLANETILER_VERSION:-0.9.0}"
PLANETILER_JAR="${PLANETILER_JAR:-$WORK/planetiler-${PLANETILER_VERSION}.jar}"
PLANETILER_URL="${PLANETILER_URL:-https://github.com/onthegomap/planetiler/releases/download/v${PLANETILER_VERSION}/planetiler.jar}"

# Geofabrik does not publish a province extract for Aceh (Indonesia is one file).
GEOFABRIK_INDONESIA_URL="${GEOFABRIK_INDONESIA_URL:-https://download.geofabrik.de/asia/indonesia-latest.osm.pbf}"
# Regional Aceh PBF (openstreetmap.fr) — default source, already ~province-sized.
OSMFR_ACEH_URL="${OSMFR_ACEH_URL:-https://download.openstreetmap.fr/extracts/asia/indonesia/aceh.osm.pbf}"

USE_INDONESIA=0
FORCE=0
for arg in "$@"; do
  case "$arg" in
    --indonesia) USE_INDONESIA=1 ;;
    --force) FORCE=1 ;;
    --help|-h)
      sed -n '2,22p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown flag: $arg" >&2
      exit 2
      ;;
  esac
done

mkdir -p "$WORK" "$OUT_DIR" "$LAYERS_DIR"
PBF="$WORK/aceh.osm.pbf"
SOURCE_PBF="$WORK/source.osm.pbf"

download() {
  local url="$1" dest="$2"
  echo "==> Download $url"
  curl -fL --retry 3 --retry-delay 2 -o "$dest" "$url"
}

need_pbf() {
  if [[ -f "$PBF" && "$FORCE" -eq 0 ]]; then
    echo "==> Reusing $PBF"
    return 0
  fi
  if [[ -n "${ACEH_OSM_PBF_URL:-}" ]]; then
    download "$ACEH_OSM_PBF_URL" "$SOURCE_PBF"
  elif [[ "$USE_INDONESIA" -eq 1 ]]; then
    echo "==> Geofabrik Indonesia (will clip to ACEH_BBOX=$ACEH_BBOX)"
    download "$GEOFABRIK_INDONESIA_URL" "$SOURCE_PBF"
  else
    echo "==> Aceh regional PBF (openstreetmap.fr). Geofabrik has no Aceh extract — use --indonesia to clip indonesia-latest.osm.pbf."
    if ! download "$OSMFR_ACEH_URL" "$SOURCE_PBF"; then
      echo "Aceh extract failed; falling back to Geofabrik Indonesia + clip" >&2
      download "$GEOFABRIK_INDONESIA_URL" "$SOURCE_PBF"
      USE_INDONESIA=1
    fi
  fi

  if [[ "$USE_INDONESIA" -eq 1 || "${ACEH_OSM_CLIP:-0}" == "1" ]]; then
    if ! command -v osmium >/dev/null 2>&1; then
      echo "osmium is required to clip Indonesia → ACEH_BBOX (sudo apt install osmium-tool)" >&2
      exit 1
    fi
    echo "==> osmium extract -b $ACEH_BBOX"
    osmium extract -b "$ACEH_BBOX" --overwrite "$SOURCE_PBF" -o "$PBF"
  else
    # Regional extract is already Aceh-sized; still clip so the archive cannot
    # grow past ACEH_BBOX if the upstream file includes neighbours.
    if command -v osmium >/dev/null 2>&1; then
      echo "==> osmium extract -b $ACEH_BBOX (tighten regional PBF)"
      osmium extract -b "$ACEH_BBOX" --overwrite "$SOURCE_PBF" -o "$PBF"
    else
      cp "$SOURCE_PBF" "$PBF"
    fi
  fi
}

have_java() {
  command -v java >/dev/null 2>&1
}

have_docker() {
  command -v docker >/dev/null 2>&1
}

ensure_planetiler_jar() {
  if [[ -f "$PLANETILER_JAR" && "$FORCE" -eq 0 ]]; then
    return 0
  fi
  echo "==> Download Planetiler $PLANETILER_VERSION"
  curl -fL --retry 3 --retry-delay 2 -o "$PLANETILER_JAR" "$PLANETILER_URL"
}

build_planetiler_java() {
  ensure_planetiler_jar
  echo "==> Planetiler OpenMapTiles (java) maxzoom=$MAXZOOM bounds=$ACEH_BBOX"
  java -Xmx"${PLANETILER_XMX:-4g}" -jar "$PLANETILER_JAR" \
    --osm-path="$PBF" \
    --output="$OUT" \
    --force \
    --download \
    --bounds="$ACEH_BBOX" \
    --maxzoom="$MAXZOOM"
}

build_planetiler_docker() {
  echo "==> Planetiler OpenMapTiles (docker) maxzoom=$MAXZOOM bounds=$ACEH_BBOX"
  docker run --rm \
    -v "$WORK:/data" \
    -v "$OUT_DIR:/out" \
    ghcr.io/onthegomap/planetiler:"${PLANETILER_VERSION}" \
    --osm-path=/data/aceh.osm.pbf \
    --output=/out/aceh-osm.pmtiles \
    --force \
    --download \
    --bounds="$ACEH_BBOX" \
    --maxzoom="$MAXZOOM"
}

build_tippecanoe() {
  if ! command -v osmium >/dev/null 2>&1 || ! command -v tippecanoe >/dev/null 2>&1; then
    echo "tippecanoe fallback needs osmium-tool and tippecanoe" >&2
    return 1
  fi
  echo "==> tippecanoe fallback (OpenMapTiles-style class tags, not full Planetiler)"
  local filtered="$WORK/aceh-filtered.osm.pbf"
  osmium tags-filter "$PBF" \
    n/place \
    w/natural=wood \
    w/landuse=forest \
    w/landuse=residential \
    w/leisure=park \
    w/leisure=nature_reserve \
    w/landuse=recreation_ground \
    w/natural=water \
    w/natural=bay \
    w/water \
    w/waterway \
    w/landuse=reservoir \
    w/landuse=basin \
    w/building \
    w/highway \
    wr/boundary=administrative \
    -o "$filtered" --overwrite

  rm -rf "$LAYERS_DIR"
  mkdir -p "$LAYERS_DIR"
  osmium export "$filtered" -f geojsonseq \
    | node "$ROOT/scripts/lib/osm-to-openmaptiles-build.mjs" "$LAYERS_DIR"

  local inputs=()
  local layer
  for layer in landcover landuse park water waterway building transportation \
    transportation_name boundary place water_name; do
    local gj="$LAYERS_DIR/${layer}.geojson"
    if [[ -s "$gj" ]]; then
      inputs+=(-L "${layer}:${gj}")
    fi
  done
  if [[ ${#inputs[@]} -eq 0 ]]; then
    echo "No OpenMapTiles layers produced from OSM export" >&2
    return 1
  fi

  tippecanoe \
    -o "$OUT" \
    --force \
    --name="Aceh OSM extract" \
    --attribution="© OpenStreetMap © OpenMapTiles · Aceh extract" \
    --minimum-zoom=0 \
    --maximum-zoom="$MAXZOOM" \
    --drop-densest-as-needed \
    --extend-zooms-if-still-dropping \
    "${inputs[@]}"
}

need_pbf

if have_java; then
  build_planetiler_java
elif have_docker; then
  build_planetiler_docker
else
  echo "==> Java/Docker not found — trying osmium + tippecanoe fallback"
  build_tippecanoe
fi

if [[ ! -f "$OUT" ]]; then
  echo "Failed to write $OUT" >&2
  echo "Install Java 21+ (Planetiler) or Docker, or osmium-tool + tippecanoe." >&2
  exit 1
fi

bytes="$(wc -c < "$OUT")"
echo "==> Wrote $OUT ($(awk -v b="$bytes" 'BEGIN{ printf "%.2f MB", b/1024/1024 }'))"
if [[ "$bytes" -gt $((80 * 1024 * 1024)) ]]; then
  echo "warn  archive is larger than 80 MB — consider lowering ACEH_OSM_MAXZOOM (now $MAXZOOM)" >&2
fi

echo "==> Validating header + source-layers (no overlay 500 KB gate)"
node "$ROOT/scripts/check-tiles.mjs" "$OUT"
echo "Done. Brand presets pick this up via NEXT_PUBLIC_ACEH_OSM_PMTILES or when the file is present."
echo "Default basemap stays Carto Positron. Host remotely with NEXT_PUBLIC_ACEH_OSM_PMTILES=<public URL>."
