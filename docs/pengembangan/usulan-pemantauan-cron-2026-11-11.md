# Usulan pemantauan cron — 11 November 2026 (WIB)

Status: usulan. PR ini tidak memindahkan jadwal, tidak mengisi variabel, tidak mengubah workflow yang mendorong `main`, dan tidak menulis basis data atau pengaturan Vercel.

Cek yang ikut PR hanya membaca berkas yang sudah di-commit dan menggolongkan teks log. Modul: `scripts/lib/pantau-cron-repo.mjs`. Uji: `scripts/lib/pantau-cron-repo.test.mjs`. Tidak ada panggilan jaringan.

Siapa yang harus OK bila usulan ini nanti dikerjakan:

| Area | Yang disebut | OK |
| --- | --- | --- |
| Backend | `POST /api/cron/daily-brief`, `POST /api/cron/overlay-live`, `pg_cron`, `vercel.json`, rahasia cron | Backend |
| Data | Fixture DIBI, jadwal hari kerja, commit git fixture | Data |
| Basemap | PR #151, `public/tiles/aceh-osm.pmtiles`, workflow re-tile | Basemap |

## 2. Cron GitHub Actions telat

Ekspresi `cron` GitHub dalam UTC. WIB = UTC+7, ditampilkan `HH.mm` tanpa membulatkan detik (`formatWibHm`). Angka telat dibulatkan ke menit terdekat dari `createdAt` ke jam ekspresi pada hari UTC yang sama (`delayMinutes`). Karena itu pukul 13.08 WIB bisa berjarak 6 jam 9 menit bila detiknya 30.

Sumber jadwal di `main` (`ac41a04331c72639f015b3380b361985fd4c0938`):

| Workflow | Ekspresi | Maksud di komentar berkas |
| --- | --- | --- |
| `.github/workflows/daily-brief.yml` | `0 0 * * *` | 07.00 WIB, setiap hari |
| `.github/workflows/dibi-refresh.yml` | `0 2 * * 1-5` | 09.00 WIB, Senin–Jumat |
| `.github/workflows/laporan-wa.yml` | `0 1 * * 1-5` | 08.00 WIB, Senin–Jumat |

### Daily Brief

Run terjadwal, bukan `workflow_dispatch`. Semua `conclusion: success`.

| `createdAt` (UTC) | WIB | Telat dari 00.00 UTC |
| --- | --- | --- |
| 2026-11-10T06:51:29Z | 13.51 | 6 jam 51 menit |
| 2026-11-09T05:43:24Z | 12.43 | 5 jam 43 menit |
| 2026-11-08T05:32:57Z | 12.32 | 5 jam 33 menit |
| 2026-11-07T05:31:41Z | 12.31 | 5 jam 32 menit |
| 2026-11-06T05:59:42Z | 12.59 | 6 jam 0 menit |
| 2026-11-05T06:05:51Z | 13.05 | 6 jam 6 menit |
| 2026-11-04T05:46:48Z | 12.46 | 5 jam 47 menit |
| 2026-11-03T06:08:30Z | 13.08 | 6 jam 9 menit |

Jalan 10 November 2026: [run 42771315362](https://github.com/piygmalion/aceh-tangguh/actions/runs/42771315362). Uji mengunci 13.51 WIB dan selisih 411 menit.

Pada delapan jalan ini telatnya 5 jam 32 menit sampai 6 jam 51 menit. Yang masuk 6–7 jam: 3, 5, 6, dan 10 November.

### DIBI hanya Senin–Jumat

`1-5` adalah Senin–Jumat UTC. Pukul 02.00 UTC masih hari yang sama di WIB, jadi Sabtu dan Minggu memang tidak dijadwalkan. Bukan geser zona waktu.

Tidak ada run DIBI pada 7 dan 8 November 2026 (Sabtu–Minggu). Run hari kerja yang dilihat:

| `createdAt` (UTC) | WIB | Telat dari 02.00 UTC |
| --- | --- | --- |
| 2026-11-10T09:01:22Z | 16.01 | 7 jam 1 menit |
| 2026-11-09T08:54:20Z | 15.54 | 6 jam 54 menit |
| 2026-11-06T08:48:21Z | 15.48 | 6 jam 48 menit |
| 2026-11-05T08:48:59Z | 15.48 | 6 jam 49 menit |
| 2026-11-04T08:22:30Z | 15.22 | 6 jam 23 menit |
| 2026-11-03T08:52:30Z | 15.52 | 6 jam 53 menit |
| 2026-11-02T08:41:24Z | 15.41 | 6 jam 41 menit |
| 2026-10-30T07:55:49Z | 14.55 | 5 jam 56 menit |

Run 10 November: [42787209617](https://github.com/piygmalion/aceh-tangguh/actions/runs/42787209617). Workflow ini meng-commit `public/fixtures/dibi-aceh.json` bila build lolos, lalu `git push`.

Dokumentasi GitHub menyatakan event `schedule` dapat tertunda saat beban Actions tinggi, termasuk di awal jam. Telat di atas adalah perilaku platform pada ekspresi yang sudah benar, bukan ekspresi yang salah. Memperbaiki telat berarti pindah penjadwal, dan itu tidak dikerjakan di PR ini.

### Usulan pindah jadwal — jangan diterapkan dulu

Dua opsi. Keduanya butuh GO tertulis Pak Pygmalion pada giliran itu, plus OK pemilik area. PR ini tidak menambah migrasi, tidak mengubah `vercel.json`, dan tidak mengubah ekspresi `cron`.

**Opsi A — `pg_cron` + `pg_net`, pola yang sudah dipakai overlay dan cuaca.**

Cocok untuk Daily Brief, karena jalur yang ada sudah `POST /api/cron/daily-brief` dengan Bearer `DAILY_BRIEF_CRON_SECRET`. `maxDuration` rute itu 60 detik.

Syarat sebelum GO:

1. OK Backend.
2. Berkas migrasi baru. Migrasi lama tidak disunting. Tidak ada `supabase db push` dan tidak ada SQL ke basis hidup dari usulan ini.
3. Nama rahasia Vault baru, dibaca saat job jalan. Nilai tidak masuk git dan tidak ditulis di PR. Jangan memakai rahasia overlay atau cuaca.
4. `timeout_milliseconds` di atas 60 detik. Bawaan `pg_net` yang disebut jurnal BE-78 adalah 2000 ms; itu memutus klien sebelum rute selesai. Tetap di bawah batas yang tertulis di panduan cron Supabase saat migrasi disusun.
5. Workflow GitHub tetap cadangan sampai log job baru terlihat. Jangan mematikan workflow dari PR usulan.

Risiko:

- Dua penjadwal bisa jalan berdekatan. `runDailyBriefCron` tanpa `force` berhenti bila `daily_briefs.whatsapp_enqueued_at` untuk tanggal Jakarta itu sudah terisi (`src/lib/daily-brief/service.ts`). Itu mengurangi kirim ganda, tetapi dua proses yang sama-sama melihat stempel kosong tetap bisa bertabrakan. Backend yang menilai sebelum GO.
- `pg_net` sempat memegang header Bearer di antrean. Jangan SELECT antrean itu ke log. Catatan yang sama ada di jurnal BE-78.
- DIBI tidak pindah ke `pg_cron` dengan usulan ini. Job DIBI menulis fixture lewat git. `pg_cron` tidak melakukan `git push`. Memindahkan DIBI butuh tempat tulis lain dan OK Data. Mengubah `1-5` menjadi tujuh hari juga perubahan perilaku; tidak diusulkan di sini.

**Opsi B — Cron Vercel lewat `crons` di `vercel.json`.**

`vercel.json` di `main` tidak punya `crons`. Dokumen Vercel untuk Cron Jobs memakai `Authorization: Bearer` dari `CRON_SECRET` platform ([manage cron jobs](https://vercel.com/docs/schedules/cron-jobs/manage-cron-jobs)). Rute Daily Brief memeriksa `DAILY_BRIEF_CRON_SECRET`, bukan `CRON_SECRET`. Tanpa ubah rute, panggilan Cron Vercel mendapat 401. Mengubah rute atau `vercel.json` adalah perubahan produksi.

Dokumen yang sama menyebut Cron Jobs sebagai fitur lama yang akan pindah ke Schedules. Kuota menurut plan tidak dicatat di sini; Backend memeriksanya sebelum GO. Jangan mengarang batas plan.

DIBI tetap tidak tergantikan oleh Cron Vercel selama hasilnya harus berupa commit fixture. Itu OK Data.

Syarat GO opsi B: GO tertulis, OK Backend, dan — bila fixture DIBI ikut — OK Data. Jangan mengisi atau mencetak nilai `CRON_SECRET`.

## 3. PR #151 — token dan pertumbuhan riwayat

[#151](https://github.com/piygmalion/aceh-tangguh/pull/151) masih terbuka, draf, cabang `bm/monthly-retile-ci`. Workflow `basemap-monthly-retile.yml` tidak ada di `main`. PR ini tidak menyunting cabang itu dan tidak mengubah workflow yang `git push` ke `main`.

Isi workflow di cabang itu, dibaca 11 November 2026: `peter-evans/create-pull-request@v7` tanpa input `token`. Bawaan action itu adalah `github.token` (GITHUB_TOKEN workflow). GitHub tidak menjalankan workflow lain untuk peristiwa yang dibuat GITHUB_TOKEN, kecuali `workflow_dispatch` dan `repository_dispatch` ([Triggering a workflow from a workflow](https://docs.github.com/en/actions/using-workflows/triggering-a-workflow#triggering-a-workflow-from-a-workflow)). `ci.yml` memakai `pull_request`. PR draf bulanan yang dibuka token itu tidak memicu Quality.

Arsip yang sudah di-commit: `public/tiles/aceh-osm.pmtiles`, 45.552.256 byte. Workflow #151 meng-commit berkas yang sama ke cabang `bm/retile-YYYY-MM` tiap bulan bila gate lolos. Blob git yang isinya berubah menetap di riwayat. Satu bulan dengan blob baru sebesar arsip ini menambah sekitar 45,6 MB (45.552.256 byte). Bulan dengan isi byte yang sama tidak menambah blob baru. Pertumbuhan bulanan belum jalan, karena workflow belum di `main`.

Usul, butuh OK Basemap, tidak diterapkan di sini:

1. Isi input `token` action dengan token GitHub App atau PAT terpisah yang disimpan sebagai secret repo. Jangan tulis nilai token di berkas. Izin cukup untuk membuka PR draf di cabang `bm/retile-*`. Jangan memakai token yang boleh mendorong `main`. Setelah itu event `pull_request` dapat memicu Quality. Risiko: token kedaluwarsa, izin terlalu lebar, dan PR tetap harus draf tanpa auto-merge.
2. Jangan memasukkan blob PMTiles baru ke riwayat tiap bulan. PR bulanan cukup memuat hash, ukuran, dan baris hasil gate. Byte arsip bisa menjadi artefak Actions, atau objek R2 bila billing mengizinkan. Langkah unggah R2 di #151 masih dikomentari. Mengganti URL layan lewat `NEXT_PUBLIC_BASEMAP_PMTILES_URL` adalah perubahan Basemap terpisah dan butuh GO sendiri.
3. Biarkan PR hasil re-tile sebagai draf. Tidak ada auto-merge.

## 4. Laporan WA selalu skip

Dicatat saja. `LAPORAN_WA_URL` tidak diisi oleh PR ini.

`.github/workflows/laporan-wa.yml` melewati job `process-pending` bila `vars.LAPORAN_WA_URL` kosong (`if: vars.LAPORAN_WA_URL != ''`). Bila URL terisi tetapi `LAPORAN_CRON_SECRET` kosong, job tetap jalan lalu `exit 0` dengan pesan skip. Run yang dilihat berstatus `skipped` dan job-nya tidak punya langkah. Itu cocok dengan variabel URL yang kosong, bukan dengan secret kosong di dalam job yang sempat jalan.

| Run | `createdAt` (UTC) | WIB | Kesimpulan |
| --- | --- | --- | --- |
| [42780318198](https://github.com/piygmalion/aceh-tangguh/actions/runs/42780318198) | 2026-11-10T08:08:33Z | 15.08 | skipped |
| 42581573849 | 2026-11-09T07:47:49Z | 14.47 | skipped |
| 42183392634 | 2026-11-06T07:49:21Z | 14.49 | skipped |
| 41989874709 | 2026-11-05T07:48:56Z | 14.48 | skipped |
| 41791935366 | 2026-11-04T07:23:30Z | 14.23 | skipped |
| 41598382075 | 2026-11-03T07:45:07Z | 14.45 | skipped |
| 41406710429 | 2026-11-02T07:30:15Z | 14.30 | skipped |
| 41016917117 | 2026-10-30T06:55:14Z | 13.55 | skipped |

Jadwal yang ditulis 08.00 WIB juga telat, pola yang sama dengan bagian 2. Antrian WhatsApp tidak diproses selama variabel itu kosong. Mengisinya nanti adalah keputusan pemilik dan OK Backend, di luar repo: nama variabel sudah ada di `docs/vercel.md`. Jangan menaruh nilainya di git.

## 5. Timeout refresh Tatonas pukul 00.15

Ditambahkan ke pemantauan baca-saja. Tidak ada perubahan klien Tatonas, rute cron, atau tulis produksi.

Log fungsi produksi `POST /api/cron/overlay-live`, proyek Vercel `aceh-tangguh`, deployment `dpl_J6pjUwjPWswQg2bJJvaNaF3CJFzC`, region `sin1`:

| Waktu UTC | WIB | Permintaan | Baris |
| --- | --- | --- | --- |
| 2026-11-10T17:15:25.467Z | 00.15 (11 Nov) | `gkprx-1794330900421-1c25fc06e0c1` | `[overlay-live/refresh] tatonasStations DOMException [TimeoutError]: The operation was aborted due to timeout` |
| 2026-11-10T17:30:24.775Z | 00.30 (11 Nov) | `jqnfm-1794331800609-c982226cdad2` | baris yang sama |

Pada kedua waktu itu ada pula timeout saat revalidasi cache kunci dasbor Tatonas (fungsi yang sama, bukan angka pos). Klaster galat pada rute yang sama juga memuat 404 `https://tatonas.co.id/api/server-time` (terakhir tercatat 2026-11-10T17:00:00Z) dan 404 `https://tatonas.co.id/monitoring/`. Penggolong `isTatonasRefreshTimeout` hanya benar untuk baris `[overlay-live/refresh]` + `tatonasStations` + `TimeoutError` atau `aborted due to timeout`. 404 tidak dihitung timeout. Tidak ada kode pos atau jumlah pos di catatan ini.

Di sumber, `src/lib/tatonas/client.ts` memakai `AbortSignal.timeout(20_000)`. Rute `src/app/api/cron/overlay-live/route.ts` memakai `maxDuration = 60`. Lapisan di-refresh berurutan di `refreshAllOverlayLive`. Log di atas adalah gagal satu lapisan, bukan bukti bahwa fungsi mencapai 60 detik. Log runtime Hobby yang bisa dibaca saat pencatatan hanya jendela pendek; baris 00.15 dan 00.30 ada di jendela itu.

Cara memantau tanpa menulis produksi: jalankan uji modul ini di CI (sudah lewat `npm test`), dan pada investigasi baca log rute `/api/cron/overlay-live` lalu cocokkan dengan `isTatonasRefreshTimeout`. Jangan POST ke cron untuk membuktikannya. Perbaikan fetch atau TTL butuh OK Backend dan GO terpisah.

## Yang sengaja tidak berubah

- Ekspresi `cron` dan berkas workflow lain.
- `vercel.json`, nama variabel lingkungan, secret, dan `LAPORAN_WA_URL`.
- Migrasi dan basis data hidup.
- Cabang serta PR #151, #153, #154, dan #155.
- Isi fixture, ubin, dan angka korban atau kode perangkat Tatonas.
