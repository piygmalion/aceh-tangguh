# Basemap PMTiles Aceh

Peta dasar operasional `/peta` adalah arsip vektor PMTiles milik sendiri. Tidak ada ubin `tile.openstreetmap.org` dan tidak ada Carto.

## Profil

Planetiler **OpenMapTiles** (profil bawaan jar `v0.9.0`), bukan Protomaps.

Gaya di `src/lib/basemap-presets.ts` dan gerbang `scripts/check-tiles.mjs` sudah memakai source-layer OpenMapTiles (`landcover`, `park`, `water`, `waterway`, `building`, `transportation`, `boundary`, `place`, `water_name`, `transportation_name`). Profil Protomaps memakai nama layer lain (`earth`, `roads`, `places`, …) sehingga gaya dan uji yang ada tidak bisa dipakai ulang.

## Sumber data

Geofabrik tidak menerbitkan ekstrak Sumatra. Indeks [asia.html](https://download.geofabrik.de/asia.html) (dilihat 27 Oktober 2026) hanya punya `indonesia-latest.osm.pbf` (sekitar 1,6 GB). Skrip mengunduh berkas itu, mengguntingnya dengan osmium ke `ACEH_BBOX` `95.0,2.0,98.3,6.15` (amplop operasional di `src/lib/aceh-scope.ts`, bukan klaim batas administratif resmi), lalu menjalankan Planetiler dengan `--bounds` yang sama.

## Keluaran

| | |
| --- | --- |
| Path | `public/tiles/aceh-osm.pmtiles` |
| Git | di-commit dan dibundel Vercel (wajib < 50 MB). Scratch `public/tiles/_osm-src/` diabaikan. |
| Zoom | 0–14 (`ACEH_OSM_MAXZOOM`) |
| Ukuran | puluhan MB pada z14 untuk klip Aceh. Angka terukur dicatat di jurnal `BM-fallback` bila bangun dijalankan. |

## Menjalankan

Butuh `curl`, `osmium-tool`, dan Java 21+. Planetiler mengunduh Natural Earth pada jalan pertama (`--download`).

```bash
npm run build:basemap
# atau
bash scripts/basemap/build-aceh-pmtiles.sh
```

## Hosting

Unggah arsip ke Cloudflare R2 atau CDN lain yang menjawab **HTTP Range** (`206` pada `Range: bytes=0-16383` juga diterima sebagai `200`). CORS harus mengizinkan GET dan Range dari origin aplikasi.

```bash
NEXT_PUBLIC_BASEMAP_PMTILES_URL=https://cdn.example.com/aceh-osm.pmtiles
```

`NEXT_PUBLIC_ACEH_OSM_PMTILES` tetap dibaca sebagai alias lama. Jika keduanya kosong, atau ubin gagal dimuat, peta memakai kanvas warna tema dan pemberitahuan singkat. Overlay lain tetap dipasang. Tidak ada cadangan Carto atau OSM publik.

Protokol `pmtiles://` didaftarkan di `MapViewport` lewat `pmtiles` `Protocol`.

## Glif dan sprite

Label memakai **Noto Sans Regular** yang di-host sendiri di `public/fonts/` (rentang MapLibre PBF, lisensi SIL OFL 1.1). URL gaya: `/fonts/{fontstack}/{range}.pbf`.

Tidak ada sprite. Gaya hanya memakai simbol teks, jadi tidak ada atlas ikon dan tidak ada server glif pihak ketiga (bukan OpenFreeMap, bukan server demo MapLibre).

## Warna

Terang: kertas `#F4F5F0`, label tinta `#1A1A17`, taman hutan `#1F4C15`, tutupan lahan sekunder sage `#8A9A5B`, air teal `#2F6B66`. Gelap: kanvas `#1A1A17`, label `#F7F7F4`, tutupan lahan sekunder sage, air `#4D807B` (teal campur 15% kertas — token air yang sudah disetel di repo). Oranye `#FF7722` bukan isian basemap.

Atribusi `© OpenStreetMap contributors` ada pada field `attribution` sumber vektor, lalu dibaca kontrol peta dan lembar telepon. Teks itu tidak dikunci di komponen UI.
