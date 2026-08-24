#!/usr/bin/env bash
# Buat salinan kerja lokal bernama "Aceh tangguh".
# Salinan ini untuk development di mesin lokal — jangan push ke GitHub sampai final.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${1:-${HOME}/Aceh tangguh}"
MAKE_ZIP="${MAKE_ZIP:-1}"

if [[ "$DEST" -ef "$ROOT" ]]; then
  echo "Tujuan tidak boleh sama dengan folder sumber: $ROOT" >&2
  exit 1
fi

mkdir -p "$DEST"

tar -C "$ROOT" \
  --exclude node_modules \
  --exclude .next \
  --exclude out \
  --exclude dist \
  --exclude .git \
  --exclude .env \
  --exclude .env.local \
  --exclude '.env*.local' \
  --exclude .static-export-park \
  --exclude 'Aceh tangguh' \
  --exclude 'Aceh-tangguh.zip' \
  --exclude .DS_Store \
  --exclude coverage \
  -cf - . | tar -C "$DEST" -xf -

STAMP="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
FILE_COUNT="$(find "$DEST" -type f ! -name '.salinan-lokal.txt' | wc -l | tr -d ' ')"
{
  echo "Aceh Tangguh — salinan lokal terstruktur"
  echo "Dibuat: ${STAMP}"
  echo "Sumber: ${ROOT}"
  echo "Jumlah file: ${FILE_COUNT}"
  echo "GitHub (jangan push sampai final): https://github.com/piygmalion/aceh-tangguh"
  echo
  echo "Langkah berikutnya:"
  echo "  cd \"${DEST}\""
  echo "  bun install          # atau: npm install"
  echo "  cp .env.example .env.local"
  echo "  bun run dev"
  echo
  echo "Baca: MULAI-DISINI.md, docs/STRUKTUR.md, docs/PENGEMBANGAN-LOKAL.md"
} > "$DEST/.salinan-lokal.txt"

echo "Salinan lokal: $DEST"
echo "File: $FILE_COUNT"

if [[ "$MAKE_ZIP" == "1" ]]; then
  ZIP_DIR="$(cd "$(dirname "$DEST")" && pwd)"
  ZIP_PATH="${ZIP_DIR}/Aceh-tangguh.zip"
  (
    cd "$ZIP_DIR"
    rm -f "$ZIP_PATH"
    zip -qr "$ZIP_PATH" "$(basename "$DEST")"
  )
  echo "Arsip: $ZIP_PATH ($(du -h "$ZIP_PATH" | awk '{print $1}'))"
fi
