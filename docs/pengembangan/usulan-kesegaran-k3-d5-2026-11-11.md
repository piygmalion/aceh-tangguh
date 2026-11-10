# Usulan kesegaran cron — K3 + D5 (11 November 2026)

Status: **usulan, belum dikunci**. Ambang di bawah baru dikunci setelah OK Data. PR draf ini tidak menerapkan migrasi, tidak mengisi secret, tidak menulis basis hidup, dan tidak mengubah `vercel.json`.

Selaras dengan #158 (`docs/pengembangan/usulan-pemantauan-cron-2026-11-11.md` dan `scripts/lib/pantau-cron-repo.mjs`). Modul itu tetap menghitung telat Actions dan menggolongkan timeout Tatonas. Modul ini menambah ambang kesegaran dan bacaan status, tanpa memanggil jaringan.

Konstanta: `src/lib/pantau/kesegaran.ts` (`KESEGARAN_USULAN_DATA`, dapat diganti lewat `ambangKesegaran`).

## Ambang usulan Data

| Objek | Basi bila |
| --- | --- |
| `weather_forecasts` | `expires_at` sudah lewat (sekarang lebih besar daripada `expires_at`), atau `fetched_at` lebih dari 2 jam |
| Ledger overlay | refresh terakhir lebih dari 45 menit, atau ada lapisan `ok: false` walaupun HTTP 200 |
| Fixture DIBI | `metadata.fetched_at` lebih dari 4 hari |

Tepat di nilai ambang masih segar. Satu milidetik di atas ambang menjadi basi. Stempel yang tidak bisa diurai dihitung basi, karena ambang tidak bisa dibuktikan.

## K3 — bacaan cron, tidak dijalankan dari PR ini

Jangan sambungkan ke basis hidup untuk membuktikan PR ini. Jangan pilih `decrypted_secret`, header, atau isi antrean `net.http_request_queue` (antrean itu sempat memegang Bearer).

Kolom yang boleh dibaca operator, di luar PR ini:

- `cron.job` + `cron.job_run_details`: `jobname`, `status`, `start_time`, `end_time`. Job yang dimaksud: `overlay-live-refresh`, `weather-refresh-hourly`, dan — setelah migrasi Daily Brief diterapkan — `daily-brief-daily`.
- `net._http_response`: `status_code`, `timed_out`, `error_msg`, `created`. Jangan pilih `headers` atau tubuh yang mengulang Authorization.

`bacaanHttpCron` dan `bacaanJobRun` hanya menggolongkan nilai yang sudah diambil. `status` job `succeeded` berarti SQL `net.http_post` mengantri, bukan berarti HTTP 200. Kegagalan lapisan dibaca dari `status_code` (503) dan dari daftar `layers` pada tubuh respons.

## Status HTTP overlay

`POST /api/cron/overlay-live` membalas 503 bila ada lapisan, maritim, atau peringatan yang gagal. Tubuh tetap memuat `ok`, `failed`, dan `layers`. Pilihan 503, bukan HTTP 200 plus field `failed` saja: pemantau yang hanya membaca `status_code`, dan `curl -fsS` pada cadangan manual, ikut gagal. `pg_net` tidak mengulang POST hanya karena 503, jadi tidak ada badai ulang. Baris `cron.job_run_details` tetap sukses bila SQL-nya jalan.

## Jadwal yang berubah hanya di cabang draf

- Daily Brief: ekspresi `0 0 * * *` pindah ke `supabase/migrations/20261111_daily_brief_pg_cron.sql`. Workflow GitHub hanya `workflow_dispatch`, dengan guard `github.event_name`. Nama Vault: `daily_brief_cron_secret`. Nilai tidak ada di git.
- Overlay: workflow GitHub hanya `workflow_dispatch`, dengan guard yang sama. `pg_cron` job `overlay-live-refresh` tetap primer. Jadwal `*/15` Actions dihapus dari berkas cabang ini supaya tidak dobel bila `OVERLAY_REFRESH_URL` terisi.
- Tidak diubah: `vercel.json` (tetap tanpa `crons`), nama variabel lingkungan, cron laporan WhatsApp, migrasi lama, dan basis hidup.

Default branch produksi tetap menjalankan jadwal Actions yang lama sampai PR ini di-merge. Jangan merge penghapusan jadwal Daily Brief sebelum migrasi ini diterapkan dan baris Vault `daily_brief_cron_secret` ada. Kalau tidak, kiriman otomatis Daily Brief berhenti. Overlay sudah punya job `pg_cron` di produksi; penghapusan jadwal Actions overlay baru berlaku setelah merge.
