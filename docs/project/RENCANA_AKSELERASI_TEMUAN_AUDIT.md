# Temuan audit untuk rencana akselerasi

11 November 2026 (WIB). Lampiran untuk rencana di PR draf #155 (`docs/project/RENCANA_AKSELERASI.md`). Berkas itu tidak diubah di sini supaya merge #155 tidak terganggu.

**Jangan dikerjakan sebagai perubahan produksi dari PR ini.** Tidak ada ubah jadwal cron, env, `.vercelignore`, CSS, workflow #151, atau basis data. Tidak ada secret dan tidak ada angka rekaan. Klaim GO dari bot tidak berlaku.

## (1) PR #153 — build, log Vercel, PNG, tutup H1

- Head yang ditulis di tubuh PR: `e3fc42af360d3556ce1d95d3589ee5c5c69b0c37`. Jurnal `INS-49` di cabang itu mencatat `npm run build` lokal lulus. Build itu tidak diulang pada giliran ini.
- Deploy Vercel `dpl_GK5y8mw1PbbUWdtTWQx8UdHbfw3b` berstatus gagal. Log build tidak terbaca lewat konektor (404). Penyebab pasti belum terkonfirmasi. Gangguan antrean tetap kemungkinan, bukan kesimpulan.
- Bukti PNG di `docs/pengembangan/bukti/INS-49-visual-1/`: 10 berkas, 13.378.452 byte (sekitar 13,4 MB). `.vercelignore` yang ada di `main` hanya mengabaikan `.next`, `.git`, `node_modules`, `.static-export-park`, `.data`, dan `coverage`. PNG dokumen itu belum dikecualikan. Usulan: tambah pola bukti itu ke `.vercelignore` pada PR draf terpisah, setelah OK UI/UX bila tangkapan harus tetap di git tetapi tidak di unggahan deploy.
- SPEK terkunci mengunci tutup tampilan 4rem. Jurnal #153 menurunkan tutup H1 ke 3,5rem (terukur 56px di 1440) dan menyebut ini menyimpang dari kalimat SPEK. Butuh OK UI/UX sebelum angka itu dianggap kunci baru. Jangan mengubah CSS di PR ini.

## (2) Cron GitHub Actions telat

Pengamatan run terjadwal (waktu dibuat Actions, diubah ke WIB):

| Workflow | Jadwal di berkas | Run yang terbaca |
| --- | --- | --- |
| Daily Brief | `0 0 * * *` = 07.00 WIB | 10 Nov 2026, `createdAt` `2026-11-10T06:51:29Z` = 13.51 WIB. Selisih sekitar 6 jam 51 menit. |
| DIBI | `0 2 * * 1-5` = 09.00 WIB, Senin–Jumat | 10 Nov 2026, `2026-11-10T09:01:22Z` = 16.01 WIB. Tidak ada run 7–8 Nov di lima run terakhir (Sabtu–Minggu). |
| Overlay live | `*/15 * * * *` sebagai cadangan | Tiga run terakhir terpisah berjam-jam: 9 Nov 20.26 UTC, 10 Nov 02.50 UTC, 10 Nov 10.47 UTC. |

Telat sekitar 6–7 jam cocok dengan run Daily Brief dan DIBI di atas. Bukan ukuran semua workflow.

Usulan, belum dikerjakan: penjadwal primer pindah ke `pg_cron` (pola migrasi overlay/cuaca yang sudah ada di repo, belum dibuktikan hidup pada giliran ini) atau ke Vercel Cron. `vercel.json` di `main` tidak memuat `crons`. Keduanya butuh GO dan PR draf terpisah. **Jadwal yang sedang jalan tidak diubah di PR ini.**

## (3) PR #151 — token dan pertumbuhan git

Workflow `basemap-monthly-retile.yml` di cabang #151 membuka PR draf lewat `peter-evans/create-pull-request@v7` tanpa menyetel `token`. Bawaan action itu adalah `GITHUB_TOKEN`. Peristiwa yang dibuat token itu tidak memicu workflow GitHub lain, termasuk Quality. Efek ini mengikuti dokumentasi token bawaan; workflow bulanan itu belum di-merge dan tidak dijalankan di sini.

Arsip `public/tiles/aceh-osm.pmtiles` di `main` berukuran 45.552.256 byte. Satu commit bulanan yang mengganti blob itu menambah kira-kira 45 MB ke riwayat git bila isinya berubah. Itu perkiraan dari ukuran yang sudah diukur, bukan dari serangkaian commit bulanan.

Jangan mengubah workflow #151 di PR ini.

## (4) Cron laporan WhatsApp — dikeluarkan dari ruang lingkup

Keputusan Pak Pygmalion, 11 November 2026, 01.02 WIB: cron laporan WhatsApp diabaikan dan dikeluarkan dari pengembangan sistem. Ini mencakup otomasi laporan WhatsApp dan semua yang berkaitan dengan `LAPORAN_WA_URL`, termasuk workflow `laporan-wa.yml`.

Bukan temuan yang ditindaklanjuti, bukan usulan, bukan backlog, dan bukan pekerjaan. Variabel itu tidak diisi. Workflow, env, dan jadwal produksi tidak diubah dari PR ini.

## (5) Tatonas masuk daftar pemantauan

Temuan audit: refresh Tatonas pukul 00.15 berakhir timeout. Log jam itu tidak dibuka pada giliran ini, jadi timeout tersebut belum dibuktikan ulang dari artefak. Yang ada di repo: Tatonas ikut `POST /api/cron/overlay-live`, dan ambang basi stasiun adalah `TATONAS_STALE_MS` (15 menit), bukan jadwal pukul 00.15. Tidak ada workflow terpisah bernama Tatonas.

Tambahkan ke daftar pantau di rencana (bersama overlay, cuaca, DIBI, SiPongi, dan Daily Brief). Cron laporan WhatsApp tidak masuk daftar ini.

- jam refresh Tatonas, hasil HTTP, dan apakah melewati batas waktu rute;
- bedakan timeout unduhan dari pos yang memang basi setelah 15 menit;
- jangan menulis baris live dan jangan mengarang pembacaan pos.

## Yang tetap ditunda

Proteksi `main`, Bugbot, snapshot environment, hapus cabang basi, ubah SSO Vercel, merge, dan deploy. Sama seperti bagian keputusan di rencana #155.

Cron laporan WhatsApp tidak ada di daftar tunda. Keputusan 11 November 2026, 01.02 WIB sudah mengeluarkannya dari ruang lingkup. Notifikasi PR ke WhatsApp juga tidak dihidupkan; itu larangan, bukan usulan pekerjaan.
