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
| BE-15 | backend | Validator 1–10, sitasi judul, method-irbi, timeout 15d | jurnal/BE-15.md | selesai |

## Gelombang 14 — loop overlay di git produksi

Koordinator menaruh POST cron + GET ledger overlay ke `origin/main` (`c5ed644`). Production Ready. Satu `workflow_dispatch` sukses (bukan skip / 404 / 503 not configured). `GET /api/overlay/bmkgQuakes` 200 setelah refresh. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan menulis nilai `OVERLAY_CRON_SECRET`. Jangan menyelaraskan seluruh tumpukan lokal.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| BE-14 | backend | Landasikan tulis + baca overlay live | jurnal/BE-14.md | selesai |
| AN-18 | analis | Naskah penerimaan loop overlay | jurnal/AN-18.md | selesai |
| KOORD-G14 | koordinator | Bacaan ulang + commit daftar | jurnal/KOORD-G14.md | selesai |

## Gelombang 15 — overlay maritim + hook peta + dump RPC

Koordinator membuka rekomendasi pasca-G14. Cron maritim memakai secret overlay yang sudah ada. GET maritim hanya baca. Hook peta memakai tabel AN-19. DATA-11 dump tubuh RPC, jangan apply, jangan mengarang. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan menulis nilai `OVERLAY_CRON_SECRET`. Jangan mengubah `matchesKabScope` sebelum AN-20.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-19 | analis | Naskah rute overlay + GET maritim baca saja | jurnal/AN-19.md | selesai |
| BE-16 | backend | Cron maritim; GET hanya baca | jurnal/BE-16.md | selesai |
| FE-17 | frontend | Hook peta ikut tabel AN-19 | jurnal/FE-17.md | selesai |
| DATA-11 | data | Dump tubuh `upsert_marker_features` | jurnal/DATA-11.md | selesai |

`npx tsc --noEmit` hijau. Uji path/maritim/G14 lulus. GET static + maritime/perairan 200; path live-only lama 404. DATA-11 tidak di-apply. DATA-4 tetap tertahan.

## Gelombang 16 — otorisasi kab

Fail-closed `admin_kabkota` tanpa profil; filter `/sik/resource` menurut matriks AN-20. Calon overlay tanpa wilayah tersembunyi dari kab (efek disengaja). Operator harus mengisi profil kab sebelum deploy. `npx tsc --noEmit` hijau; uji roles / resource-scope / Destana / calon lulus. DATA-4 tetap tertahan. Jangan merevoke `is_staff` / `is_ops`. Jangan POST nasional. Jangan membuka P2 Juklak.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-20 | analis | Naskah fail-closed kab + matriks resource | jurnal/AN-20.md | selesai |
| BE-17 | backend | Terapkan AN-20 | jurnal/BE-17.md | selesai |
| AN-21 | analis | Uji matriks + tutup STATUS | jurnal/AN-21.md | selesai |

## Gelombang 17 — moderasi scoped

Saring `laporan_*` per kab. Reports warisan 403 untuk kab. `npx tsc --noEmit` hijau; uji laporan-scope lulus. DATA-4 tetap tertahan. Jangan merevoke `is_staff` / `is_ops`. Jangan menandai 23 akun hidup.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-22 | analis | Naskah moderasi scoped + undangan 23 kab | jurnal/AN-22.md | selesai |
| BE-18 | backend | Saring GET/PATCH laporan; reports 403 kab | jurnal/BE-18.md | selesai |

## Gelombang 18 — administrasi + 23 slot

Halaman `/id/admin/staf` + `GET`/`POST /api/admin/users`. 23 slot katalog; email resmi operator. Migrasi unik belum di-apply. DATA-4 tetap tertahan. Jangan merevoke `is_staff` / `is_ops`.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| BE-19 | backend | GET/POST `/api/admin/users` | jurnal/BE-19.md | selesai |
| FE-18 | frontend | Halaman `/admin/staf` 23 slot | jurnal/FE-18.md | selesai |
| DATA-12 | data | Unik parsial `admin_kabkota` per kode | jurnal/DATA-12.md | selesai |
| AN-23 | analis | Uji matriks + tutup STATUS | jurnal/AN-23.md | selesai |

## Gelombang 19 — inovasi WeatherNext 3, mesin resmi tetap BMKG

Naskah AN-24 dikunci sebelum kode. Jalur resmi tidak diubah. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-24 | analis | Naskah resmi vs inovasi WN3 | jurnal/AN-24.md | selesai |
| DATA-13 | data | Ingest EE + fixture inovasi | jurnal/DATA-13.md | selesai |
| BE-20 | backend | GET `/api/weather/inovasi` | jurnal/BE-20.md | selesai |
| FE-19 | frontend | Strip publik terpisah | jurnal/FE-19.md | selesai |
| AN-25 | analis | Uji regresi + tutup STATUS | jurnal/AN-25.md | selesai |

## Gelombang 20 — halaman Analisis data bencana

Naskah G20 dikunci sebelum kode (lihat FE-25 / BE-28 / `analisis-data-acceptance.test.ts`). Berkas `jurnal/AN-29.md` dan `AN-30.md` kemudian dipakai ulang oleh ECC-S4 (upsert inovasi / helper kab) — jangan dibaca sebagai naskah permukaan Analisis. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan memakai ID AN-26/27, FE-20, atau BE-21 (itu ECC-S).

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-29 | analis | Naskah permukaan + kontrak API | jurnal/AN-29.md | selesai |
| BE-28 | backend | GET `/api/kejadian/analisis` | jurnal/BE-28.md | selesai |
| FE-25 | frontend | Halaman + teaser + Tanggapi | jurnal/FE-25.md | selesai |
| AN-30 | analis | Uji penerimaan + tutup STATUS | jurnal/AN-30.md | selesai |

## Gelombang ECC-C — wrapper harness

Skill/agent Aceh membungkus loop ECC. Clone sibling `../ecc` pin `v2.2.0` (`5eddf1a3`). Installer tidak dijalankan ke `.cursor/` aplikasi pada gelombang ini. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-ECC-1 | analis | Naskah wrapper ECC | jurnal/AN-ECC-1.md | selesai |
| KOORD-ECC-C | ecc | Skill + agent + brief | jurnal/KOORD-ECC-C.md | selesai |
| AN-ECC-2 | analis | Uji wrapper | jurnal/AN-ECC-2.md | selesai |

## Gelombang ECC-A — install selektif

Setelah AN-ECC-2. Dry-run `install.ps1` ditolak (hooks + MCP + skill di luar allowlist). Tulis: tiga skill + empat rules TypeScript dari clone `v2.2.0`. Doctor tanpa install-state (disengaja). DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan `--enable-hooks`.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-ECC-3 | analis | Naskah allowlist install | jurnal/AN-ECC-3.md | selesai |
| KOORD-ECC-A | ecc | Dry-run ditolak; salinan allowlist | jurnal/KOORD-ECC-A.md | selesai |
| AN-ECC-4 | analis | Verifikasi A | jurnal/AN-ECC-4.md | selesai |

## Gelombang ECC-S — skema kerapian

Riset ECC atas G0–G19 + pohon kode. Naskah: [06-skema-kerapian.md](06-skema-kerapian.md). S1–S4 dikerjakan 6 September 2026. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan merge cuaca resmi/inovasi. Jangan apply `20260923` / dump DATA-11 dari tiket ini.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-ECC-5 | ecc | Naskah skema kerapian | jurnal/AN-ECC-5.md | selesai |
| FE-20 | frontend | Pulihkan sikCalon / sikSdb / map.overlay* | jurnal/FE-20.md | selesai |
| FE-21 | frontend | Rute calon + SDB | jurnal/FE-21.md | selesai |
| FE-22 | frontend | WeatherGrid + hazards yatim | jurnal/FE-22.md | selesai |
| FE-23 | frontend | Locale tanggal dasbor publik | jurnal/FE-23.md | selesai |
| DATA-18 | data | Fixture stub + jembatan | jurnal/DATA-18.md | selesai |
| BE-24 | backend | Hapus qk.hazards yatim | jurnal/BE-24.md | selesai |
| AN-26 | analis | Uji S1 | jurnal/AN-26.md | selesai |
| AN-27 | analis | Naskah registri kab + ruang | jurnal/AN-27.md | selesai |
| DATA-14 | data | Registri kab kanonik | jurnal/DATA-14.md | selesai |
| DATA-15 | data | Satu modul ruang Aceh | jurnal/DATA-15.md | selesai |
| AN-28 | analis | Naskah 200 vs 503 | jurnal/AN-28.md | selesai |
| BE-22 | backend | Samakan static/maritime | jurnal/BE-22.md | selesai |
| BE-27 | backend | Petunjuk 404 overlay | jurnal/BE-27.md | selesai |
| BE-21 | backend | Alias cron cuaca di /cron/ | jurnal/BE-21.md | selesai |
| AN-29 | analis | Naskah upsert inovasi | jurnal/AN-29.md | selesai |
| AN-30 | analis | Naskah helper kab + catalog + reports | jurnal/AN-30.md | selesai |
| BE-23 | backend | Helper kab-scope | jurnal/BE-23.md | selesai |
| BE-25 | backend | Cabut /api/sik/catalog | jurnal/BE-25.md | selesai |
| BE-26 | backend | Rencana pensiun /admin/reports | jurnal/BE-26.md | selesai |
| DATA-16 | data | Seed overlay statis dari JSON | jurnal/DATA-16.md | selesai |
| DATA-19 | data | Upsert inovasi ke snapshot | jurnal/DATA-19.md | selesai |
| FE-24 | frontend | Cangkang tabel admin bersama | jurnal/FE-24.md | selesai |
| KOORD-ECC-S | ecc | Review uji + browser | jurnal/KOORD-ECC-S.md | selesai |

## Gelombang 21 — Bahaya InaRISK poligon kelas

Naskah AN-31 mengunci ImageServer `exportImage` amplop `ACEH_BBOX` → poligon sedang/tinggi. ID data = DATA-20 karena DATA-14 sudah registri kab. Jangan menimpa AN-19 / DATA-11 / FE-17. Jangan POST nasional. Jangan mengubah clip patahan. Jangan hapus proxy ubin. DATA-4 tetap tertahan.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-31 | analis | Naskah bahaya InaRISK jadi poligon kelas | jurnal/AN-31.md | selesai |
| DATA-20 | data | ETL fixture poligon bahaya | jurnal/DATA-20.md | selesai |
| FE-26 | frontend | Katalog fill + path static bahaya | jurnal/FE-26.md | selesai |

## Gelombang 22 — sisa lokal (chrome, cuaca, peta, tilikan)

Bukan gelombang overlay baru. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan ingest pengungsian/orang. Jangan `upsert_marker_features`.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| FE-28 | frontend | Oranye navbar sebagai penanda interaksi | jurnal/FE-28.md | selesai |
| FE-27 | frontend | Popup konteks AI di dalam #cuaca | jurnal/FE-27.md | selesai |
| DATA-21 | data | Dissolve R3P ke kabupaten + PMTiles LOD | jurnal/DATA-21.md | selesai |
| FE-29 | frontend | Kartu keterangan titik peta | jurnal/FE-29.md | selesai |
| DATA-22 | data | Tabel staf tilikan kerusakan infra | jurnal/DATA-22.md | selesai |

## Gelombang 23 — IRBI/KRB pada Analisis data

Dua variabel kabupaten × jenis ancaman IRBI/KRB di `/analisis-data`. Analogi historis rumah rusak, bukan prediksi. Angka IRBI/KRB tidak dijumlahkan ke KPI katalog. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan menimpa AN-31/FE-26. UI frontend = FE-30 (ID FE-27 di main sudah dialog cuaca).

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-32 | analis | Naskah kab × ancaman + analogi | jurnal/AN-32.md | selesai |
| FE-30 | frontend | Panel Ancaman × riwayat | jurnal/FE-30.md | selesai |
| AN-33 | analis | Uji penerimaan IRBI/KRB analisis | jurnal/AN-33.md | selesai |

## Gelombang 25 — polish Analisis ancaman (pasca #70)

Tiga follow-up UI dari glance #70. Logika IRBI/KRB dan rumus proyeksi tidak diubah. `npm test` 566 lulus; lint + `tsc` hijau. Browser: satu judul id+en; chip TINGGI 13px; disclaimer empiris tetap. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| FE-32 | frontend | Type floor + judul + flex gap panel ancaman | jurnal/FE-32.md | selesai |

## Gelombang 26 — peta operasional SoT #2 (kartu + overlay stale/503)

Padding/stack/gap `MapFeatureCard` dirapatkan; overlay hidup stale/503 memakai Empty/Skeleton + “Data tertunda” + Coba lagi. Ukuran marker/ikon/chrome tidak diubah. Tidak retile / PMTiles / titik karangan. AreaProfil, Distribusi, SIK, basemap tidak disentuh. `npm test` 569 lulus; lint + `tsc` hijau. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| FE-33 | frontend | Kartu peta + Empty/Skeleton overlay stale/503 | jurnal/FE-33.md | selesai |

## Gelombang 27 — staf kab SoT #3 (empty + pending)

SoT #3 FINAL: Empty + “Belum ada … di kabupaten Anda”; CTA outline primary; chip Menunggu accent ink-on-orange; approved forest; rejected destructive; Skeleton + retry. Tanpa API undangan pending. `npm test` 571 lulus; lint + `tsc` hijau. Browser staf 307 ke login. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| FE-34 | frontend | Empty state + chip undangan pending | jurnal/FE-34.md | selesai |

## Gelombang 28 — PD/cuaca SoT #4 (type floor + CTA WeatherNext)

Kartu Peringatan Dini: lantai 13px, kontras kicker/tautan, tinggi 20rem + gulir isi tetap. Dialog WeatherNext: CTA accent ink-on-orange; flex+gap; bukan section cuaca kedua. `npm test` 573 lulus; lint + `tsc` hijau. Browser id+en: kartu gulir isi; CTA Eksperimen/Experimental membuka dialog delayed. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| FE-35 | frontend | Type floor + kontras PD + CTA WeatherNext | jurnal/FE-35.md | selesai |

## GO C #2 — tile CDN verify + runbook (lanjutan Stage 3 / #66)

Scaffold S3/R2 sudah di main. Tiket ini hanya verify publik + runbook ops. Carto tetap default. `r3p-kab.pmtiles` tetap. `aceh-osm.pmtiles` tidak di-build/commit. Sync tetap `workflow_dispatch`. `npm test` 586 lulus; `check:tiles` hijau. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| KOORD-GO-C2 | koordinator | Opt-in `verify:tiles-cdn` + runbook 5 langkah | jurnal/KOORD-GO-C2.md | selesai |

## Gelombang 29 — Destana SoT #1 (type floor + Empty/Skeleton)

Polish UI Destana saja. Lantai 13px; stack flex/gap; Empty/Skeleton pada daftar kosong/loading. API/RLS/skema Destana tidak diubah. `npm test` 577 lulus; lint + `tsc` hijau. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| FE-36 | frontend | Type floor + Empty/Skeleton Destana | jurnal/FE-36.md | selesai |

## Gelombang 30 — Tanggapi × Distribusi desa

CTA “Tanya Tanggapi” hanya pada view desa AreaProfil (setelah kab→kec→desa) dan pada MapFeatureCard jika `kode_desa` 10 digit. Seed lokasi whitelist lewat `aceh:tanggapi-seed`. IA #50 tidak diubah. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| FE-37 | frontend | Tanggapi CTA on Distribusi/AreaProfil desa | jurnal/FE-37.md | selesai |

## Gelombang Tanggapi briefing — AN-37 / FE-38

Sambutan beranda Tanggapi adalah briefing empat umpan `GET /api/peringatan-dini` (cuaca → MAGMA → Sipongi → Tatonas). Bukan Web Push, SMS, atau siaran WA. MAGMA unavailable tidak mengulang gempa. Tautan hanya `#status` / `#cuaca`. Kartu PD ke-5 maritim tetap [AN-36](jurnal/AN-36.md). DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-37 | analis | Naskah briefing peringatan Tanggapi | jurnal/AN-37.md | selesai |
| FE-38 | frontend | Compiler + sambutan briefing | jurnal/FE-38.md | selesai |

## Gelombang Tanggapi berkas percakapan — AN-44 / FE-49

Thread Tanggapi di `sessionStorage` (cap 40, sanitasi tel). Bukan CRM staf, bukan inbox, bukan WA publik. Kartu briefing empat umpan dari compiler FE-38. ID AN-38 / FE-39 tetap Daily Brief G31. AN-36 / DATA-4 / Web Push tidak dibuka. Jangan POST nasional. Jangan membuka P2 Juklak.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-44 | analis | Naskah berkas percakapan Tanggapi | jurnal/AN-44.md | selesai |
| FE-49 | frontend | Thread lokal + kartu briefing | jurnal/FE-49.md | selesai |

## Gelombang 24 — Histori Kejadian + Proyeksi Dampak

Label kartu 2/3 dan proyeksi empiris dari katalog (skala, koridor, jika berulang). Bukan PAGER/OpenQuake. Bukan meninggal dari skor IRBI. DATA-4 tetap tertahan. UI frontend = FE-31 (ID FE-28 di main sudah chrome navbar).

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-34 | analis | Naskah Histori + Proyeksi Dampak | jurnal/AN-34.md | selesai |
| FE-31 | frontend | Panel Histori + Proyeksi Dampak | jurnal/FE-31.md | selesai |
| AN-35 | analis | Uji penerimaan proyeksi | jurnal/AN-35.md | selesai |

## GO SIK apply GPS — karantina desimal >100 m

Kebijakan terkunci: konflik GPS memakai GPS existing; `attributeConflicts` tidak memblokir tulis. Langkah 1 = dry-run import (tanpa `--write-fixtures` / `--apply`). Langkah 3 = bendera `--accept-gps-quarantine`. VM Cloud: `sik_aceh.db` absen. Koordinator (tip `60f64a0`, mesin lain): matched 427, gpsConflicts 20. Jangan merge ke produksi dari tiket ini. Jangan `--apply`. DATA-4 tetap tertahan.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| DATA-23 | data | `--accept-gps-quarantine` keep-existing GPS | jurnal/DATA-23.md | selesai |

## Gelombang 31 — selesai (Daily Brief staf)

Naskah AN-38 dikunci sebelum kode. Audiens = nomor yang ditambah operator provinsi. Bukan OTP publik. Bukan stack Python. Compose dari umpan hidup yang sudah ada. `npm test` 654 lulus; `tsc` hijau. Browser: `/id/brief/{ymd}` empty sah; `/en/brief/{ymd}` EN; admin super admin form + error jika tabel belum di-apply. Migrasi `20260926` belum diterapkan ke produksi dari tiket ini. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan mengerjakan AN-36 / FE-38 / G32 dari tiket ini.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-38 | analis | Naskah Daily Brief staf | jurnal/AN-38.md | selesai |
| DATA-24 | data | Tabel subscriber / briefs / log | jurnal/DATA-24.md | selesai |
| BE-29 | backend | Compose + cron + API | jurnal/BE-29.md | selesai |
| FE-39 | frontend | `/brief/[ymd]` + admin nomor | jurnal/FE-39.md | selesai |
| AN-39 | analis | Uji penerimaan G31 | jurnal/AN-39.md | selesai |

G32 (AN-40 / DATA-25 / BE-30 / FE-40) tercatat di AN-38 §8. Jangan dikode sebelum G31 `selesai`.

## Gelombang 33 — selesai (User Management katalog)

Kontrak AN-41: Super Admin kelola semua staf + paket akses modul. Bukan RBAC dinamis. `npm test` 665 lulus; `tsc` hijau. Browser `/id/admin/staf` dan `/en/admin/staf` menampilkan form katalog + kisi akses + 23 slot. Migrasi `20260927` belum diterapkan ke produksi dari tiket ini. DATA-4 tetap tertahan. Jangan merevoke `is_staff` / `is_ops` / `is_walidata`. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan menimpa G31 Daily Brief.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-41 | analis | Naskah User Management katalog | jurnal/AN-41.md | selesai |
| DATA-26 | data | Tabel `admin_role_modules` + seed | jurnal/DATA-26.md | selesai |
| BE-31 | backend | Perluas `/api/admin/users` + `/api/admin/roles` | jurnal/BE-31.md | selesai |
| FE-41 | frontend | Dashboard `/admin/staf` pengguna + matriks | jurnal/FE-41.md | selesai |
| AN-42 | analis | Uji penerimaan G33 | jurnal/AN-42.md | selesai |

## Gelombang 34 — kartu PD maritim (AN-36)

Kontrak AN-36: kartu ke-5 dari buletin PDGT, bukan slot prakiraan. `npm test` 678 lulus; `tsc` hijau. Browser `/id#status` dan `/en#status` menampilkan kartu BMKG Maritim (tinggi 20rem). Overlay `maritimeWaters` tetap pewarna `wave_cat` slot. Cache buletin belum di-apply ke produksi dari tiket ini — GET lokal = `unavailable` + stale (benar, pola MAGMA). Migrasi `20260928` belum diterapkan ke produksi. DATA-4 tetap tertahan. Jangan menulis `overlay_live_features`. Jangan membuka calon. Jangan merge `/api/weather`. Jangan InaWaves. Jangan POST nasional. Jangan membuka P2 Juklak.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-36 | analis | Naskah kartu PD maritim | jurnal/AN-36.md | siap-kode |
| DATA-27 | data | Tabel `maritime_warning_cache` | jurnal/DATA-27.md | selesai |
| BE-32 | backend | Ingest buletin + GET baca saja | jurnal/BE-32.md | selesai |
| FE-42 | frontend | Kartu PD ke-5 + field peta | jurnal/FE-42.md | selesai |

## Gelombang 35 — dasbor data operasional staf

Satu layar `/admin/operasi` menampilkan hitungan dan progres modul (logistik, kejadian, Destana, rehab, moderasi, layanan) tanpa migrasi dan tanpa modul RBAC baru. Tata Bolster: cakupan → alur → umpan → linimasa/peringkat. `npm test` 695 lulus; `tsc` hijau. Browser `/id/admin/operasi` dan `/en/admin/operasi` (sesi super_admin): judul ID/EN, filter Logistik, papan volume (46 calon SIK). Ringkasan `/admin` tetap. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-43 | analis | Naskah dasbor data operasional | jurnal/AN-43.md | selesai |
| FE-43 | frontend | Halaman `/admin/operasi` | jurnal/FE-43.md | selesai |

## Permintaan beranda — slideshow Peringatan Dini

Bukan gelombang 35 (FE-43 dasbor operasi sudah selesai). Lima kartu `#status` jadi karusel satu kartu per slide. Tinggi `h-[20rem]` + gulir isi tidak diubah. Jangan menambah paket slider. DATA-4 tetap tertahan.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| FE-44 | frontend | Slideshow lima kartu Peringatan Dini | jurnal/FE-44.md | selesai |

## Permintaan beranda — desain fotografis ke produksi

Bukan gelombang 35. Desain pratinjau `/preview/beranda` menjadi `/[locale]`. Namespace i18n baru `beranda` (ID+EN). WeatherNext tetap dialog di `CuacaStrip`. Komponen lama tidak dihapus. `npm test` 708 lulus; `tsc` hijau. Browser `/id` dan `/en` menampilkan papan status lima umpan. DATA-4 tetap tertahan. Jangan POST nasional.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| FE-45 | frontend | Beranda produksi dari pratinjau fotografis | jurnal/FE-45.md | selesai |

## Permintaan beranda — karusel cuaca 23 kab + Renduk

Bukan gelombang 35. Pita `#cuaca` menampilkan semua 23 kabupaten/kota, jeda 5 detik. Salinan hero dan judul DIBI diganti. Jelajah dan Sumber data di footer memakai `<details>` seperti Kredit visual. Grafik PRRPKA / Renduk tampil di bawah `/analisis-data`. `npm test` 716 lulus; `tsc` hijau. DATA-4 tetap tertahan. Jangan POST nasional.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| FE-46 | frontend | Karusel cuaca 23 kab, salinan beranda, Renduk di Analisis | jurnal/FE-46.md | selesai |

## Permintaan peta — jenis mandiri, ikon zoom ketiga, uji MapLibre

Bukan gelombang 35. Hanya `/[locale]/peta`. Anak jenis kejadian bisa dinyalakan tanpa induk semua-jenis. Ikon pecah pada zoom ketiga dari z=7 (`clusterMaxZoom` 9). Mesin sudah MapLibre; raster tetap default (vector `?vector=1` tidak dipaksa). `npm test` 724 lulus; `tsc` hijau. DATA-4 tetap tertahan. Jangan POST nasional.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| FE-47 | frontend | Peta: jenis mandiri, ikon z+3, uji MapLibre | jurnal/FE-47.md | selesai |

## Tindak lanjut — gateway WhatsApp (BE-33)

`WHATSAPP_GATEWAY_URL` adalah URL layanan pengirim, bukan secret. Adapter Fonnte/Wablas di `sendWhatsAppGateway` supaya Daily Brief + laporan memakai format provider. Token tetap dari dashboard Fonnte setelah HP pengirim dipasangkan. Bukan rute publik baru. Jangan menulis nilai token. DATA-4 tetap tertahan. Jangan G32.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| BE-33 | backend | Adapter Fonnte/Wablas | jurnal/BE-33.md | selesai |

## Tindak lanjut — form Daily Brief (FE-48)

Form admin mengikuti tabel (Nama, lalu Nomor). Isi tertukar ditukar otomatis. Gagal tambah bukan “Gagal memuat”. DATA-4 tetap tertahan. Jangan menimpa FE-47. Jangan G32.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| FE-48 | frontend | Form Daily Brief nama/nomor + error | jurnal/FE-48.md | selesai |

## Gelombang 36 — unggah foto sampul CMS (staf)

Naskah AN-49 dikunci sebelum kode. Audiens = super admin (sama dengan CMS). Bucket baru `cms-media`, terpisah dari `laporan-media`. Bukan unggah publik. Bukan PDF/video/SVG. Bukan TUS. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan menimpa `POST /api/laporan/upload`. Jangan G32. Jangan C1. Jangan menimpa AN-45 / FE-50.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| KOORD-G36 | ecc | Rencana search-first + urutan tiket | jurnal/KOORD-G36.md | selesai |
| AN-49 | analis | Naskah unggah sampul CMS | jurnal/AN-49.md | selesai |
| DATA-28 | data | Bucket `cms-media` + kebijakan | jurnal/DATA-28.md | selesai |
| BE-36 | backend | `POST /api/admin/cms/upload` | jurnal/BE-36.md | selesai |
| FE-51 | frontend | Pemilih berkas foto sampul | jurnal/FE-51.md | selesai |
| AN-50 | analis | Uji penerimaan G36 | jurnal/AN-50.md | selesai |

Migrasi `20260929_cms_media` sudah di proyek produksi `aceh-tangguh` (`whojoxrbcdyotrpolgav`). `npm test` 752 lulus; 2 gagal di luar G36 (`email-invite`, FE-53).

## Naskah — konsep Rate Limiting (AN-45)

Bukan gelombang kode. G0 sudah memasang limiter publik. Naskah mengunci: adopt `@upstash/ratelimit` yang ada; enam POST `guardPublicPost`; kuota 8/8/20/8/20/30 per jam per IP; 429 vs 503 fail-closed; tanpa kuota pada GET/staf/cron. Jangan `express-rate-limit`. Jangan menaikkan kuota. Jangan DATA-4. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan G32.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-45 | analis | Naskah konsep Rate Limiting | jurnal/AN-45.md | selesai |

## Naskah konsep Authentication — AN-45

Tulisan. Bukan kode. Search-first: tetap `@supabase/ssr` + katalog peran (Adopt), jangan IdP baru. Tiga bidang: publik (anon), staf (cookie + `admin_profiles`), mesin (secret cron). Empat lapisan: sesi → profil → modul overlay → wilayah/RLS. Jangan OTP publik. Jangan RBAC dinamis. Jangan merevoke `is_staff` / `is_ops` / `is_super_admin` / `is_walidata`. Jangan DATA-4. Jangan POST nasional. Jangan membuka P2 Juklak.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-45 | analis | Naskah konsep Authentication | jurnal/AN-45.md | selesai |

## Konsep — penanganan error (AN-45)

Naskah analis. Bukan gelombang overlay. Bukan kode. Kontrak: lima kelas (kosong sah, tertunda/stale, hulu gagal, tolak, salah input). Overlay hidup tetap AN-28 (200 kosong vs 503). Static/maritime tetap 200+stale. MAGMA/buletin maritim fail-closed. Pesan aksi ≠ pesan muat (FE-48). Jangan RFC 7807. Jangan DATA-4. Jangan POST nasional. Jangan membuka P2 Juklak. Follow-up BE/FE (`error.message` staf, `error.tsx`) menunggu koordinator.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-45 | analis | Naskah konsep penanganan error | jurnal/AN-45.md | siap-kode |

## Gelombang ECC-CACHE — konsep caching

Skill `search-first` + `aceh-ecc`. Naskah: [07-konsep-caching.md](07-konsep-caching.md). Empat lapisan: L1 Postgres, L2 `unstable_cache`, L3 TanStack Query, L0 fixture. Upstash tetap rate limit saja. C1 usulan = AN-51 / BE-37 / AN-52 (bukan AN-47 keparahan, bukan G36). Jangan dikode BE-37 sebelum AN-51. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan merge cuaca resmi/inovasi. `src/` tidak berubah dari tiket ini.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-ECC-6 | ecc | Naskah empat lapisan cache | jurnal/AN-ECC-6.md | selesai |

## Gelombang ECC-C1 — GET PD baca L1

Kontrak [AN-51.md](jurnal/AN-51.md). MAGMA / Sipongi / Tatonas pada `GET /api/peringatan-dini` hanya SELECT overlay + ledger. Cron tetap scrape `no-store`. Agregat PD tetap HTTP 200. Overlay hidup tetap 200 vs 503. Jangan AN-47. Jangan G36. Jangan DATA-4. Jangan merge cuaca. Jangan Upstash overlay.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-51 | analis | Naskah GET PD baca L1 | jurnal/AN-51.md | siap-kode |
| BE-37 | backend | GET PD dari overlay + tag cron | jurnal/BE-37.md | draf |
| AN-52 | analis | Uji GET PD tanpa scrape hulu | jurnal/AN-52.md | draf |

BE-37 boleh dikode setelah bacaan ulang AN-51. AN-52 menutup C1. Jangan commit dari tiket naskah ini.

## Naskah — urutan keparahan vs katalog (AN-47)

Bukan gelombang kode. Bukan G36. Kontrak: kisi bento `#status` mengurut **keparahan** (`danger` → `warn` → `neutral`, seri katalog). Briefing Tanggapi tetap **katalog** empat klausul cuaca → MAGMA → Sipongi → Tatonas (AN-37). Karusel `PeringatanDiniSection` jika dipasang lagi tetap lima slide katalog (FE-44). Jangan IRBI/DIBI sebagai kunci PD. Jangan menambah maritim ke briefing. Jangan DATA-4. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan G32.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-47 | analis | Naskah keparahan vs katalog umpan PD | jurnal/AN-47.md | selesai |

## Tindak lanjut — verifikasi email staf (AN-53)

Bukan G31 OTP publik. Bukan pager FE-50. Adopt `inviteUserByEmail` + `verifyOtp` `token_hash`. Status dari `email_confirmed_at`. ID rencana AN-44/BE-34/FE-50/AN-45 sudah terpakai → AN-53 / BE-38 / FE-53 / AN-54. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan merevoke `is_staff` / `is_ops`.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| AN-53 | analis | Naskah undang → tautan → set sandi | jurnal/AN-53.md | selesai |
| BE-38 | backend | `redirectTo` + `/auth/confirm` + resend | jurnal/BE-38.md | selesai |
| FE-53 | frontend | `/admin/set-password` + chip pending | jurnal/FE-53.md | selesai |
| AN-54 | analis | Uji penerimaan | jurnal/AN-54.md | selesai |

## Tindak lanjut — Tanggapi analisis data (FE-57)

Bukan pelaporan warga. ID FE-56 sudah cascade wilayah di main (#104). Chip `analisisData` di beranda + lead di `/analisis-data`. FAQ filter/URL, grafik, dan beda vs Data bencana / DIBI / BTT. `validateGroundedBody` tidak diubah. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak.

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| FE-57 | frontend | Tanggapi jalur analisis data | jurnal/FE-57.md | siap-kode |

## Gelombang kemudian

| id | agent | judul | jurnal | status |
| --- | --- | --- | --- | --- |
| DATA-4 | data | Pemetaan `loggerKind` Tatonas | jurnal/DATA-4.md | menunggu-naskah |
| DATA-10 | data | Cabut anon dari `next_kejadian_nomor` | jurnal/DATA-10.md | selesai |
| FE-50 | frontend | Pager jendela daftar (konsep) | jurnal/FE-50.md | draf |
| FE-52 | frontend | Pager jendela daftar (chrome) | jurnal/FE-52.md | selesai |
| FE-54 | frontend | URL search/filter daftar kejadian | jurnal/FE-54.md | selesai |
| FE-55 | frontend | Cluster cincin + hierarki kab/kec/desa | jurnal/FE-55.md | selesai |
| FE-56 | frontend | Cascade kab/kec/desa pada form laporan | jurnal/FE-56.md | selesai |

DATA-4 tidak dikode 5 September 2026. Naskah AN-3 tetap siap salin; Status kirim = belum terkirim; jawaban tertulis belum ada. `src/lib/tatonas/parse.ts` tidak disentuh. Jangan menebak kode perangkat. Jangan menandai `siap-kode` sampai jawaban masuk di AN-3.

## Tindak lanjut 5 September 2026

DATA-10 diterapkan ke produksi `aceh-tangguh`: `next_kejadian_nomor` anon EXECUTE = false; `authenticated` dan `service_role` tetap; bukan SECURITY DEFINER.

Nama `OVERLAY_CRON_SECRET` diisi di GitHub Actions dan Vercel Production + Preview (bukan secret cuaca; nilai tidak ditulis). Variabel `OVERLAY_REFRESH_URL` tetap. Production Vercel di-redeploy agar runtime membaca env. Satu `workflow_dispatch` `overlay-live-refresh.yml` sukses setelah G14 (`c5ed644`): job tidak skip “secret not set”; rute cron sudah di `origin/main`; `GET /api/overlay/bmkgQuakes` 200 setelah refresh. Kalimat “curl 404 karena rute belum di git” adalah fakta sebelum G14, bukan status hari ini. Jangan menulis nilai. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak.

## Tinjauan pasca-G14 — 5 September 2026

Koordinator + data + backend + analis membaca ulang 70 rute API dan 35 migrasi (pohon `src/` = `origin/main`). Kanvas: tinjauan-pasca-g14. Jurnal: `jurnal/KOORD-REVIEW-20260905-g14.md`.

Perbaikan aman di review ini: `POST /api/sik/public` memakai `guardPublicPost` (kontrak `attack-surface.md` ~8/jam); uji inventaris mengunci enam rute POST publik; STATUS tidak lagi mengklaim cron overlay 404.

Tertutup di G15–G16: GET maritim hanya baca (BE-16); hook peta memakai tabel AN-19 (FE-17); dump RPC marker (DATA-11, tidak di-apply); `matchesKabScope` fail-closed + filter `/sik/resource` (AN-20 / BE-17 / AN-21). DATA-4 dan Juklak P2 tidak dibuka. Kalimat gelombang 2–12 yang menyebut secret/migrasi “belum diterapkan dari tiket ini” adalah catatan waktu tiket, bukan fakta operasional hari ini.
