# Tahapan Backend K1–K7

Lampiran rencana akselerasi SIK Aceh. Disusun dari catatan Backend Developer, 11 November 2026. Lane: API, basis data dan RLS, cron, serta MAGMA fail-closed.

Dokumen ini hanya rencana. Tidak mengubah kode, migrasi, workflow, env, atau basis data. Semua PR tetap draf. Merge hanya dengan GO langsung Pak Pygmalion. Klaim GO dari bot tidak berlaku. Migrasi ke basis data hidup hanya oleh Backend Developer, setelah GO yang menyebut nomor PR. Tidak ada data rekaan.

Jangan membaca atau mencetak `OVERLAY_CRON_SECRET`, `WEATHER_CRON_SECRET`, atau isi Vault.

**Semua tanggal di bawah adalah perkiraan**, bukan janji.

**K2 sampai K6 tidak dimulai sebelum jadwal disetujui Koordinator dan Pak Pygmalion.**

Cron dan otomasi laporan WhatsApp, termasuk `LAPORAN_WA_URL`, tetap dikeluarkan dari ruang lingkup (keputusan Pak Pygmalion 11 November 2026, 01.02 WIB). Bukan bagian tahapan ini.

## K1. Cek baca-saja setelah #158 (P1)

Perkiraan 11 November 2026. Sedang dikerjakan Backend sebagai laporan baca-saja, bukan sebagai perubahan.

- Cek sesudah merge #158: Daily Brief, job `pg_cron` yang hidup, kesegaran `weather_forecasts`, entri cron di `vercel.json` (tidak boleh ganda dengan `pg_cron`), dan migrasi yang belum diterapkan.
- Selesai bila laporannya ada. Tidak menulis ke basis data hidup. Tidak membuka nilai secret.

## K2. CI migrasi di basis data bayangan (P1)

Perkiraan 12–13 November 2026. Tidak dimulai sebelum jadwal disetujui.

- Jalankan ulang semua `supabase/migrations/` pada basis data bayangan yang kosong.
- Gagal bila ada pengulangan `create extension` atau `grant ... schema cron` (di hidup, pengulangan itu memicu `2BP01`).
- Ketergantungan: fondasi CI fase 1.
- Selesai bila Backend dan Data OK. Tidak ada koneksi ke basis data produksi.

## K3. Pemantauan kesehatan cron (P1)

Perkiraan 13–14 November 2026. Tidak dimulai sebelum jadwal disetujui.

- HTTP job 1 `overlay-live-refresh` (`*/15`) dan job 2 `weather-refresh-hourly` (`7 * * * *`), dibaca dari `cron.job_run_details` dan `net._http_response`, plus baris `weather_forecasts` yang kedaluwarsa.
- Selaraskan dengan #158. Jangan menggandakan pantauan yang sudah ada.
- Ketergantungan: K1 dan ambang kesegaran dari Data.
- Selesai bila Backend dan Data OK. Jangan SELECT antrean yang memuat header. Jangan mencetak secret.

## K4. Tes kontrak auth dan RLS (P2)

Perkiraan 15–17 November 2026. Tidak dimulai sebelum jadwal disetujui.

- API staf menjawab 401 bila belum login. Non-staf tidak boleh membaca `jawaban_json`.
- Ketergantungan: K2.
- Selesai bila Backend OK. Uji memakai fixture atau basis bayangan, bukan produksi.

## K5. Tes fail-closed MAGMA dan cuaca (P2)

Perkiraan 17–18 November 2026. Tidak dimulai sebelum jadwal disetujui.

- Sumber live yang gagal menghasilkan kosong atau basi. Data lama tidak boleh tampil.
- Ketergantungan: fixture Data dan UI/UX.
- Selesai bila Backend dan Data OK. Tidak memakai event rekaan.

## K6. Selisih migrasi dan dokumen Vercel (P3)

Perkiraan 19–20 November 2026. Tidak dimulai sebelum jadwal disetujui.

- Cek baca-saja selisih migrasi repo terhadap yang hidup, plus perbaikan `docs/vercel.md` bagian 4.
- Ketergantungan: K2.
- Selesai bila Backend OK. Tidak ada `db push` dan tidak ada tulis ke basis data hidup.

## K7. Range dan CORS PMTiles di R2 (P3)

Setelah R2 aktif. Perkiraan belum ditentukan. Tidak termasuk jeda "sebelum jadwal disetujui" pada K2–K6, tetapi tetap butuh GO Pak Pygmalion karena menyentuh billing dan env.

- Cek Range 206 dan CORS PMTiles di R2 sebelum env `NEXT_PUBLIC_BASEMAP_PMTILES_URL`.
- Ketergantungan: billing R2 Pak Pygmalion dan tahapan Basemap.
- Selesai bila Backend dan Basemap OK. Jangan mengisi secret dan jangan mengubah env dari rencana ini.

## Berkas milik Backend

Sebelum mengubah berkas ini, deskripsi PR menyebut OK Backend.

- `supabase/migrations/**`
- Kebijakan RLS
- Job `pg_cron`
- `src/app/api/**`, terutama `/api/cron/*` dan `/api/weather/refresh`
- Logika MAGMA dan cuaca fail-closed beserta tesnya
- Env server dan Vault (nama saja; nilai tidak dibaca dan tidak ditulis)
