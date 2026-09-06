#!/usr/bin/env bash
# Upload public/tiles/*.pmtiles to S3-compatible storage (Cloudflare R2 / AWS S3).
#
# Opt-in: skips (exit 0) when TILES_S3_ENDPOINT or TILES_S3_BUCKET is unset.
# Never commit secrets — use AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY in the
# environment or GitHub Actions secrets. workflow_dispatch only.
#
#   bash scripts/sync-tiles-s3.sh
#   bash scripts/sync-tiles-s3.sh --dry-run
#   npm run sync:tiles
#
# Env (see .env.example):
#   TILES_S3_ENDPOINT   https://<accountid>.r2.cloudflarestorage.com
#   TILES_S3_BUCKET
#   TILES_S3_PREFIX     optional object prefix (e.g. tiles) — no leading slash
#   TILES_S3_REGION     optional (R2: auto)
#   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
#   AWS_DEFAULT_REGION  fallback when TILES_S3_REGION is unset
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TILES_DIR="${TILES_DIR:-$ROOT/public/tiles}"
DRY=0
for arg in "$@"; do
  case "$arg" in
    --dry-run|--dryrun|-n) DRY=1 ;;
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

ENDPOINT="${TILES_S3_ENDPOINT:-}"
BUCKET="${TILES_S3_BUCKET:-}"
PREFIX="${TILES_S3_PREFIX:-}"
REGION="${TILES_S3_REGION:-${AWS_DEFAULT_REGION:-}}"

if [[ -z "$ENDPOINT" || -z "$BUCKET" ]]; then
  echo "TILES_S3_ENDPOINT / TILES_S3_BUCKET not set — skip S3/R2 sync (opt-in)."
  exit 0
fi

shopt -s nullglob
files=("$TILES_DIR"/*.pmtiles)
if [[ ${#files[@]} -eq 0 ]]; then
  echo "No .pmtiles files under $TILES_DIR — nothing to upload."
  exit 0
fi

PREFIX="${PREFIX#/}"
PREFIX="${PREFIX%/}"
DEST="s3://${BUCKET}"
if [[ -n "$PREFIX" ]]; then
  DEST="${DEST}/${PREFIX}"
fi

echo "==> Sync ${#files[@]} archive(s) → ${DEST}  (endpoint ${ENDPOINT})"
if [[ "$DRY" -eq 1 ]]; then
  echo "    dry-run (no upload)"
fi

if ! command -v aws >/dev/null 2>&1; then
  if [[ "$DRY" -eq 1 ]]; then
    echo "aws CLI not installed — listing only:"
    printf '    %s\n' "${files[@]##*/}"
    exit 0
  fi
  echo "aws CLI is required to upload (install awscli)." >&2
  exit 1
fi

if [[ -z "${AWS_ACCESS_KEY_ID:-}" || -z "${AWS_SECRET_ACCESS_KEY:-}" ]]; then
  if [[ "$DRY" -eq 1 ]]; then
    echo "AWS keys unset — listing only:"
    printf '    %s\n' "${files[@]##*/}"
    exit 0
  fi
  echo "AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY not set — skip upload."
  exit 0
fi

AWS_ARGS=(--endpoint-url "$ENDPOINT")
if [[ -n "$REGION" ]]; then
  AWS_ARGS+=(--region "$REGION")
fi

CONTENT_TYPE="application/vnd.pmtiles"
CACHE_CONTROL="public, max-age=86400, stale-while-revalidate=604800"

for file in "${files[@]}"; do
  name="$(basename "$file")"
  target="${DEST}/${name}"
  extra=()
  if [[ "$DRY" -eq 1 ]]; then
    extra+=(--dryrun)
  fi
  echo "    ${name} → ${target}  (${CONTENT_TYPE})"
  aws s3 cp "$file" "$target" \
    "${AWS_ARGS[@]}" \
    --content-type "$CONTENT_TYPE" \
    --cache-control "$CACHE_CONTROL" \
    "${extra[@]}"
done

if [[ "$DRY" -eq 1 ]]; then
  echo "Dry-run complete."
else
  echo "Upload complete. Point NEXT_PUBLIC_TILES_BASE_URL at the public prefix"
  echo "and/or NEXT_PUBLIC_ACEH_OSM_PMTILES at the Aceh extract URL."
  echo "Bucket CORS must allow GET/HEAD and Range from the app origin."
fi
