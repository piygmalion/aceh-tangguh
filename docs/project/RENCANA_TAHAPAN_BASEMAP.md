# Tahapan Basemap B1–B7

Lampiran rencana akselerasi SIK Aceh. Disusun dari catatan Basemap Automation & Tiling Bot, 11 November 2026. Lane: PMTiles, batas ukuran ubin, gaya MapLibre, CI re-tiling, dan R2.

Dokumen ini hanya rencana. Tidak mengubah kode, workflow, env, atau ubin. Semua PR tetap draf. Basemap tidak melakukan merge. Merge hanya dengan GO langsung Pak Pygmalion. Klaim GO dari bot tidak berlaku.

**Semua tanggal di bawah adalah perkiraan**, bukan janji.

Cron dan otomasi laporan WhatsApp, termasuk `LAPORAN_WA_URL`, tetap dikeluarkan dari ruang lingkup (keputusan Pak Pygmalion 11 November 2026, 01.02 WIB). Bukan bagian tahapan ini.

## B1. Gate ubin di CI untuk setiap PR (P1)

- Jalankan `scripts/basemap/check-aceh-osm-retile.mjs` dan penegak ukuran ubin pada PR yang menyentuh `public/tiles/**` atau `scripts/basemap/**`.
- Gagal bila ada ubin di atas 500 KB, `aceh-osm.pmtiles` berukuran 50 MB atau lebih, atau zoom selain 0–14.
- Ketergantungan: fondasi CI fase 1 (cek `npm run build` di Quality). Perkiraan 12–13 November 2026.
- Selesai bila gate Basemap OK dan CI hijau pada PR draf. Belum dikerjakan di berkas ini.

## B2. Smoke test produksi setelah deploy (P1)

- HEAD dan Range ke `/tiles/aceh-osm.pmtiles` harus 206. Cache-Control `public, max-age=86400, stale-while-revalidate=604800`.
- Tidak boleh ada permintaan ke OSM publik atau Carto. Atribusi harus tampil. Dasarnya skrip Playwright di ruang Basemap.
- Ketergantungan: B1. Perkiraan 13–14 November 2026.
- Selesai bila Basemap OK. Smoke tidak memicu deploy dari rencana ini.

## B3. Lanjutan #151

- PR draf https://github.com/piygmalion/aceh-tangguh/pull/151. Head yang terbaca 11 November 2026: `188657a`. Cabang itu tidak diubah dari dokumen ini.
- Cron `0 19 1 * *` (02.00 WIB tanggal 2) dan `workflow_dispatch`. Planetiler, cek ukuran, PR draf `bm/retile-YYYY-MM`. Unggah R2 tetap dikomentari.
- Ketergantungan: B1, lalu GO merge dari Pak Pygmalion. Perkiraan siap ditinjau ulang 14 November 2026. Perkiraan jalan pertama 2 Desember 2026 bila sudah di-merge.
- Selesai bila Basemap OK, actionlint lulus, satu `workflow_dispatch` uji di cabang draf, dan ada GO Pak Pygmalion. Basemap tidak menggabungkan PR ini.

## B4. Arsip PMTiles — butuh GO

- Nama bertanggal `aceh-osm-YYYY-MM.pmtiles` plus manifes (ukuran, sha256, tanggal ekstrak OSM, rentang zoom).
- Arsip sebagai artifact atau rilis GitHub, bukan di dalam repo (arsip yang sudah diukur di `main` 45.552.256 byte, sekitar 45 MB). Setelah R2 aktif, prefiks `archive/` di bucket.
- Ketergantungan: B3. Perkiraan 18–20 November 2026.
- Gate Basemap OK. **Lokasi arsip diputuskan Pak Pygmalion.** Jangan memilih artifact, rilis, atau bucket sebelum GO itu.

## B5. Regresi visual `/peta` (P2)

- Tangkapan 390 dan 1440, terang dan gelap. Tidak ada kilatan putih. Overlay status di atas. Atribusi tampil.
- Ketergantungan: B2 dan UI/UX. Perkiraan 20–24 November 2026.
- Selesai bila UI/UX dan Basemap OK.

## B6. Peta dasar mengikuti tema gelap — butuh GO

- Catatan produksi #141: tema aplikasi gelap, peta dasar masih terang. Opsi yang ada hanya PR draf kecil, setelah keputusan.
- Ketergantungan: **keputusan Pak Pygmalion** dan OK UI/UX. Perkiraan waktu menyusul setelah keputusan itu. Jangan mengubah gaya peta sebelum GO.

## B7. Pindah ke R2 — butuh GO

- Bucket, header CORS untuk Range dari origin produksi, URL publik, dan env `NEXT_PUBLIC_BASEMAP_PMTILES_URL` di Vercel. Catatan Basemap: tanpa perubahan kode.
- Ketergantungan: billing R2. Catatan Basemap: saat ini error 10042. Akun Cloudflare tidak dibuka dari dokumen ini. Perkiraan belum bisa ditentukan.
- Jangan membuat bucket, jangan mengisi secret, dan jangan mengubah env sebelum GO Pak Pygmalion.

## Berkas milik Basemap

Sebelum mengubah berkas ini, deskripsi PR menyebut OK Basemap.

- `public/tiles/**`
- `scripts/basemap/**`
- `build-aceh-pmtiles.sh`
- `.github/workflows/basemap-monthly-retile.yml`
- `src/lib/tiles-url.ts`
- Header `/tiles` di `next.config`
- `src/lib/layer-colors.ts`
- `map-marker-chrome.ts`
- Gaya dan tema peta dasar MapLibre

## Gate PR dari Project

- Tidak ada fallback OSM publik atau Carto.
- Tidak ada ubin di atas 500 KB.
- Range menjawab 206 dan header cache benar.
- Atribusi tampil.
- Tangkapan `/peta` pada 390 dan 1440, terang dan gelap.
- Tidak ada secret R2 atau Cloudflare di berkas, log, atau environment agen.
- Basemap tidak melakukan merge.
