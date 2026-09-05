# Status pengembangan pasca-review

Diperbarui agent saat menutup tiket. Koordinator membaca berkas ini, bukan percakapan.

## Gelombang 0 — selesai

Filter Aceh, prune XB005, scope DELETE/GET dampak, guard moderasi, ubin, allowlist pelabuhan, rate limit publik, origin admin, 67 kunci i18n.

## Gelombang 1 — selesai (diverifikasi koordinator)

Koordinator menyambungkan `authorizeKejadianDelete` / `authorizeDampakRead` ke rute API agar uji AN-1 mengunci produksi, bukan salinan terpisah.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| DATA-1 | data | Kolom `expires_at` + purge | jurnal/DATA-1.md | selesai |
| DATA-2 | data | Checksum / ambang ETL | jurnal/DATA-2.md | selesai |
| BE-1 | backend | Overlay gagal = 503 | jurnal/BE-1.md | selesai |
| BE-2 | backend | Hapus EXIF unggahan | jurnal/BE-2.md | selesai |
| BE-3 | backend | Ringkasan marker sepadan | jurnal/BE-3.md | selesai |
| FE-1 | frontend | i18n bagian SIK beranda | jurnal/FE-1.md | selesai |
| FE-2 | frontend | `selectedId` URL | jurnal/FE-2.md | selesai |
| AN-1 | analis | Uji matriks otorisasi | jurnal/AN-1.md | selesai |
| AN-2 | analis | CI Node 22 | jurnal/AN-2.md | selesai |
| AN-3 | analis | Naskah konfirmasi Tatonas | jurnal/AN-3.md | selesai |

Status: `draf` → `siap-kode` → `diverifikasi` → `selesai`. Blocker: `terhambat`.

## Gelombang 2 — selesai (diverifikasi koordinator)

Koordinator membaca ulang AN-4 sebagai kontrak, lalu memeriksa cron baca-saja, RLS `is_ops()`, UI stale, dan jalur calon. `npm test` 255 lulus. Migrasi `20260913`–`20260915` dan secret `OVERLAY_CRON_SECRET` belum diterapkan ke produksi dari tiket ini.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| BE-4 | backend | Cron overlay; GET hanya baca | jurnal/BE-4.md | selesai |
| BE-5 | backend | RLS PII = `is_ops()` | jurnal/BE-5.md | selesai |
| AN-4 | analis | Naskah sinyal → kejadian | jurnal/AN-4.md | selesai |
| BE-6 | backend | Calon kejadian dari overlay | jurnal/BE-6.md | selesai |
| FE-3 | frontend | UI stale/gagal overlay | jurnal/FE-3.md | selesai |

## Gelombang 3 — selesai (diverifikasi koordinator)

Koordinator membaca ulang AN-5 sebagai kontrak, lalu memeriksa clip fixture, ledger GET, rotasi PII, hapus HazardStatusStrip, pratinjau catalog/meta, dan `tatonasStations` hanya overlay. `npm test` 278 lulus. DATA-4 tetap menunggu jawaban penyedia (AN-3). Jangan dikerjakan. Migrasi `20260913`–`20260916` dan secret overlay belum diterapkan ke produksi dari tiket ini.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-5 | analis | Naskah clip patahan + kosong-vs-503 | jurnal/AN-5.md | selesai |
| BE-7 | backend | Rotasi kunci PII | jurnal/BE-7.md | selesai |
| FE-4 | frontend | HazardStatusStrip mati/pasang | jurnal/FE-4.md | selesai |
| FE-5 | frontend | Fixture catalog + meta preview | jurnal/FE-5.md | selesai |
| FE-6 | frontend | `tatonasStations` hanya overlay | jurnal/FE-6.md | selesai |
| DATA-3 | data | Potong geometri patahan | jurnal/DATA-3.md | selesai |
| BE-8 | backend | GET live kosong sah vs 503 | jurnal/BE-8.md | selesai |

## Gelombang 4 — selesai (diverifikasi koordinator)

Koordinator membaca ulang AN-6 sebagai kontrak, lalu memeriksa daftar calon, form terima/tolak, dan sisa hazards. `npm test` 278 lulus. Browser staf tidak diverifikasi (tidak ada sesi). DATA-4 tetap menunggu jawaban penyedia (AN-3). Jangan dikerjakan. Naskah SDI/Destana (AN-7, AN-8) ada di gelombang kemudian.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-6 | analis | Naskah UI calon kejadian | jurnal/AN-6.md | selesai |
| FE-7 | frontend | Rapikan sisa `/api/hazards` | jurnal/FE-7.md | selesai |
| FE-8 | frontend | Daftar + terima/tolak calon | jurnal/FE-8.md | selesai |

## Gelombang 5 — selesai (diverifikasi koordinator)

Koordinator membaca ulang AN-8 sebagai kontrak, lalu memeriksa tiga tabel SDB, API katalog/jadwal/validasi, checklist kunci statis, GET peringatan, banner, dan halaman katalog. `npm test` 314 lulus. Browser staf tidak diverifikasi. DATA-4 tetap menunggu jawaban penyedia (AN-3). AN-7 Destana tetap di gelombang kemudian. Jangan POST ke `data.bnpb.go.id`. Jangan membuka P2 Juklak. Migrasi `20260913`–`20260917` dan secret overlay belum diterapkan ke produksi dari tiket ini.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| DATA-5 | data | Tabel `sdb_katalog` / `sdb_validasi` / `sdb_jadwal_kirim` | jurnal/DATA-5.md | selesai |
| BE-9 | backend | API katalog, jadwal, validasi | jurnal/BE-9.md | selesai |
| BE-10 | backend | Checklist kunci statis + peringatan dinamis | jurnal/BE-10.md | selesai |
| FE-9 | frontend | Banner dinamis + halaman katalog SDB | jurnal/FE-9.md | selesai |

## Gelombang 6 — selesai (diverifikasi koordinator)

Koordinator memeriksa salinan metodologi, i18n daftar kejadian, inventaris attack-surface, dan naskah penerimaan produksi. `npm test` 322 lulus saat tutup G6. `tsc` sudah hijau sebelum G7 dibuka (celah di luar tiket G6 tertutup). Browser staf tidak diverifikasi. DATA-4 dan AN-7 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| FE-10 | frontend | Sisa `/api/hazards` di panduan + i18n daftar kejadian | jurnal/FE-10.md | selesai |
| BE-11 | backend | Inventaris rute G2–G5 di attack-surface | jurnal/BE-11.md | selesai |
| AN-9 | analis | Naskah penerimaan produksi G2–G5 | jurnal/AN-9.md | selesai |

## Gelombang 7 — selesai (diverifikasi koordinator)

Koordinator memeriksa header KIB, tanggal locale staf, dan uji sumber. `npm test` 324 lulus; `tsc --noEmit` hijau. Browser staf tidak diverifikasi (307 ke login). DATA-4 dan AN-7 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan meni18n-kan seluruh `KejadianOpsDetail` di gelombang ini.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| FE-11 | frontend | Header KIB + tanggal locale staf | jurnal/FE-11.md | selesai |
| AN-10 | analis | Uji tidak ada `toLocaleString("id-ID")` di daftar/detail/calon | jurnal/AN-10.md | selesai |

## Gelombang 8 — selesai (diverifikasi koordinator)

Tinjauan proses: naskah terpakai ditandai selesai, jurnal DATA-4 dibuat, kanvas review diselaraskan, sisa i18n detail dikunci. `npm test` 336 lulus; `tsc --noEmit` hijau. Browser staf tidak diverifikasi (307). DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-11 | analis | Rapikan status naskah + jurnal DATA-4 | jurnal/AN-11.md | selesai |
| FE-12 | frontend | i18n sisa KejadianOpsDetail | jurnal/FE-12.md | selesai |
| AN-12 | analis | Uji string hardcoded detail | jurnal/AN-12.md | selesai |

## Gelombang 9 — selesai (diverifikasi koordinator)

Destana dua instrumen (AN-7): tabel SI/aktivitas, API scoped, label transisi, form 17 huruf. Rumus PKD tidak diubah. `npm test` 342 lulus; `tsc` hijau. Browser: `/id/destana` dan `/en/destana` menampilkan teks instrumen AN-7; konsol super admin menampilkan 17 aktivitas. Migrasi `20260918` belum diterapkan ke produksi dari tiket ini. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| DATA-6 | data | Tabel `destana_si` / `destana_aktivitas` | jurnal/DATA-6.md | selesai |
| BE-12 | backend | API program Destana + helper AN-7 | jurnal/BE-12.md | selesai |
| FE-13 | frontend | Label instrumen transisi + form 17 aktivitas | jurnal/FE-13.md | selesai |
| AN-13 | analis | Uji kontrak Destana AN-7 | jurnal/AN-13.md | selesai |

## Gelombang 10 — selesai (diverifikasi koordinator)

Koordinator menerapkan migrasi G2–G9 yang sudah ada ke proyek `aceh-tangguh`, lalu i18n Destana publik. `npm test` 345 lulus; `tsc` hijau. Browser: `/id/destana` judul Indonesia; `/en/destana` = Disaster-Resilient Village. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. *(Catatan historis: URL overlay dan RLS staging kemudian ditutup di G11/G13. Secret cron overlay masih operator.)*

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| DATA-7 | data | Terapkan migrasi overlay–Destana ke produksi | jurnal/DATA-7.md | selesai |
| FE-14 | frontend | i18n halaman publik Destana | jurnal/FE-14.md | selesai |
| AN-14 | analis | Naskah penerimaan G9 + uji Destana publik | jurnal/AN-14.md | selesai |

## Gelombang 11 — selesai (diverifikasi koordinator)

Koordinator mengunci staging `_tmp_profil_sheet_apply`: RLS nyala, hak Data API dicabut, 300 baris utuh. `purge_expired_overlay_rows` tidak lagi dieksekusi anon. `npm test` 348 lulus; `tsc` hijau. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Cron overlay masih butuh `OVERLAY_CRON_SECRET` / `OVERLAY_REFRESH_URL` (nama saja).

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| DATA-8 | data | Kunci staging `_tmp_profil_sheet_apply` | jurnal/DATA-8.md | selesai |
| AN-15 | analis | Naskah kunci staging + uji berkas | jurnal/AN-15.md | selesai |

## Gelombang 12 — selesai (diverifikasi koordinator)

Koordinator mencabut EXECUTE Data API pada `next_laporan_nomor` dan `upsert_marker_features`; `service_role` tetap. Fungsi peran tidak disentuh. `npm test` 350 lulus; `tsc` hijau. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Cron overlay masih butuh `OVERLAY_CRON_SECRET` / `OVERLAY_REFRESH_URL` (nama saja).

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| DATA-9 | data | Cabut Data API pada RPC definer tulis | jurnal/DATA-9.md | selesai |
| AN-16 | analis | Naskah revoke RPC definer tulis | jurnal/AN-16.md | selesai |

## Gelombang 13 — selesai (diverifikasi koordinator)

Koordinator menuliskan nama env overlay, mengisi variabel GitHub `OVERLAY_REFRESH_URL`, dan i18n tiga halaman publik. `npm test` 356 lulus; `tsc` hijau. Browser: `/en/training` = Education and training; `/en/emergency-contacts` = Essential disaster-service numbers; `/en/partners` = Disaster partners. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan menulis nilai `OVERLAY_CRON_SECRET`. Nama `OVERLAY_CRON_SECRET` kemudian diisi di GitHub + Vercel (lihat tindak lanjut 5 September).

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| BE-13 | backend | Nama env overlay + variabel URL | jurnal/BE-13.md | selesai |
| FE-15 | frontend | i18n pelatihan, nomor penting, mitra | jurnal/FE-15.md | selesai |
| AN-17 | analis | Naskah overlay env + uji halaman publik | jurnal/AN-17.md | selesai |

## Gelombang Tanggapi 14 — popup (FE-16)

Bukan loop overlay. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan mengembalikan undangan hero.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| FE-16 | frontend | Popup Tanggapi: avatar, gelembung, a11y | jurnal/FE-16.md | selesai |

## Gelombang Tanggapi 15 — grounded P1

Rencana menyebut BE-14; ID itu sudah overlay. Tiket ini BE-15. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan menaikkan kuota.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| BE-15 | backend | Validator 1–10, sitasi judul, method-irbi, timeout 15d | jurnal/BE-15.md | siap-kode |

## Gelombang 14 — loop overlay di git produksi

Tutup loop overlay di pohon git: `POST /api/cron/overlay-live` menulis, `GET /api/overlay/{key}` membaca ledger. Secret dan workflow sudah ada; rute belum di `origin/main` (404). DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan menulis nilai `OVERLAY_CRON_SECRET`. Jangan menyelaraskan seluruh tumpukan lokal.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| BE-14 | backend | Landasikan tulis + baca overlay live | jurnal/BE-14.md | selesai |
| AN-18 | analis | Naskah penerimaan loop overlay | jurnal/AN-18.md | draf |
| KOORD-G14 | koordinator | Bacaan ulang + commit daftar | jurnal/KOORD-G14.md | draf |

## Gelombang kemudian

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| DATA-4 | data | Pemetaan `loggerKind` Tatonas | jurnal/DATA-4.md | menunggu-naskah |
| DATA-10 | data | Cabut anon dari `next_kejadian_nomor` | jurnal/DATA-10.md | selesai |

## Tindak lanjut 5 September 2026

DATA-10 diterapkan ke produksi `aceh-tangguh`: `next_kejadian_nomor` anon EXECUTE = false; `authenticated` dan `service_role` tetap; bukan SECURITY DEFINER.

Nama `OVERLAY_CRON_SECRET` diisi di GitHub Actions dan Vercel Production + Preview (bukan secret cuaca; nilai tidak ditulis). Variabel `OVERLAY_REFRESH_URL` tetap. Production Vercel di-redeploy agar runtime membaca env. Satu `workflow_dispatch` `overlay-live-refresh.yml`: job tidak skip “secret not set”; `curl` 404 karena `src/app/api/cron/overlay-live` belum ada di pohon git produksi. Jangan menulis nilai. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak.
