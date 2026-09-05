# Skema kerapian data, tampilan, dan backend

Sumber: riset ECC (search-first) 6 September 2026 atas gelombang 0–19 + pohon `src/`, `scripts/`, `supabase/migrations/`, `messages/`. Kontrak: [jurnal/AN-ECC-5.md](jurnal/AN-ECC-5.md).

Ini skema, bukan izin mengulang tiket yang sudah `selesai`. DATA-4, P2 Juklak, dan POST nasional tetap tertahan. Jalur cuaca resmi dan inovasi tetap terpisah (AN-24).

## Yang sudah rapi — jangan dibongkar

- Empat wilayah agent + jurnal tulis–baca ulang.
- Overlay live: GET baca ledger; gagal hulu live = 503; cron `POST /api/cron/overlay-live`.
- Fail-closed `admin_kabkota` tanpa profil; filter laporan/resource per kab.
- Destana dua instrumen; SDB tiga tabel; 23 slot staf.
- Strip inovasi di bawah cuaca resmi, `official: false`.

## Inventaris (dihitung dari repo)

| Lapisan | Jumlah | Catatan |
| --- | ---: | --- |
| Migrasi SQL | 38 | `20260923` unik kab belum di-apply dari tiket; DATA-11 dump jangan di-apply |
| Rute `src/app/api` | 73 | 3 cron di `/cron/`; 2 refresh cuaca di luar `/cron/` |
| Halaman `[locale]` | 36 | 15 publik, 21 admin |
| Komponen | 88 | 22 di `sik/`, 11 peta, 11 admin |
| Fixture terlacak | ~41 | overlay 8; area pensiun masih ada |

## Tiga sumbu kekusutan

### Data — banyak sumber kebenaran untuk satu konsep

1. Kode kab: `ACEH_KABUPATEN` (4 digit) vs `kab-weather-registry.json` (`11.01`) vs KRB vs `boundaries-aceh-kab.geojson`.
2. Amplop Aceh: `ACEH_BBOX` `[95.0, 2.0, 98.3, 6.15]` vs `ACEH_BOUNDS` laporan (lebih lebar) vs salinan bbox di beberapa skrip.
3. Overlay statis tiga wujud: geojson runtime, baris DB, `overlay-static-rows.json` yang tidak dibaca `src/`.
4. Fixture yatim: `boundaries-aceh-stub.geojson`; katalog merujuk `/fixtures/jembatan.json` yang tidak ada.
5. `weather_inovasi_snapshot.expires_at` ada di skema; ingest skrip masih ke fixture.

### Backend — kontrak baca dan cron tidak seragam

1. Live overlay: sepi sah = 200 kosong; hulu gagal = 503. Static/maritime catch = 200 kosong + `stale`.
2. Refresh cuaca di `/api/weather/refresh`, bukan `/api/cron/`.
3. Kab scope di tiga modul: `roles.ts`, `laporan-scope.ts`, `resource-scope.ts`.
4. `/api/reports` 410; `/admin/reports` masih hidup untuk provinsi.
5. `qk.hazards` tanpa pemakai; `/api/sik/catalog` tanpa pemakai FE.

### Tampilan — kunci i18n hilang dan rute yatim

1. `CalonKejadianList` memakai `useTranslations("sikCalon")` tetapi namespace tidak ada di `messages/id.json` maupun `en.json`.
2. `SdbKatalogList` memakai `sikSdb` — namespace absen.
3. `MapToolbar` / `MapOverlays` memakai kunci `map.overlayLive*` yang absen.
4. `/admin/sik/kejadian/calon` dan `/admin/sik/sdb` tidak di `routing.ts` dan tidak di `AdminShell`.
5. `WeatherGrid.tsx` tidak diimpor. Sisa `toLocaleString("id-ID")` di beberapa dasbor publik.

## Gelombang kerapian

Kerjakan berurutan. Jangan membuka gelombang berikutnya sebelum yang berjalan `selesai` di STATUS, kecuali S1 yang sudah dinyatakan paralel.

### ECC-S1 — lubang tampilan dan sampah aman (paralel)

Wilayah tidak bertabrakan. Tidak mengubah aturan akses atau skema live.

| id | agent | judul |
| --- | --- | --- |
| FE-20 | frontend | Pulihkan namespace `sikCalon`, `sikSdb`, dan kunci `map.overlayLive*` / `map.overlayAttribution*` di ID+EN |
| FE-21 | frontend | Daftarkan calon + SDB di `routing.ts`; taut dari daftar kejadian; jangan menambah nav yang mengubah matriks peran |
| FE-22 | frontend | Hapus `WeatherGrid` jika tetap tanpa pemakai; cabut namespace `hazards` yatim |
| FE-23 | frontend | Tanggal/angka publik: `useLocale()` di `KejadianTable`, `DibiDashboard`, `OperationalStatsSection`, `R3PChartSection`, `WeatherStrip` |
| DATA-18 | data | Hapus atau dokumentasikan `boundaries-aceh-stub.geojson`; pulihkan atau cabut `jembatan.json` dari katalog |
| BE-24 | backend | Hapus `qk.hazards` jika uji preview tetap mengunci pensiun `/api/hazards` |
| AN-26 | analis | Uji: kunci FE-20 ada; rute FE-21 terdaftar; `npm test` hijau |

### ECC-S2 — satu kamus kab dan satu peta ruang (naskah dulu)

Jangan dikode sebelum AN-27 `siap-kode`. Jangan mengubah `matchesKabScope` di tiket data.

| id | agent | judul |
| --- | --- | --- |
| AN-27 | analis | Naskah: satu registri kab (4 digit, adm2, slug, nama); peran `ACEH_BBOX` vs `ACEH_BOUNDS` vs filter teks |
| DATA-14 | data | Fixture/registri kanonik; juklak membaca turunan, bukan daftar ketiga yang diketik tangan |
| DATA-15 | data | `src/lib/aceh-scope.ts` atau setara di wilayah data+pengecualian tertulis; skrip ETL mengimpor, bukan menyalin bbox |

### ECC-S3 — kontrak baca rusak (naskah dulu)

Jangan dikode sebelum AN-28. Jangan menggabungkan cuaca resmi dan inovasi.

| id | agent | judul |
| --- | --- | --- |
| AN-28 | analis | Naskah: kapan 200 kosong sah vs 503 hulu, untuk static, maritime, weather, inovasi |
| BE-22 | backend | Samakan static + maritime ke kontrak AN-28 |
| BE-27 | backend | 404 `/api/overlay/{kunci-statis}` menyertakan petunjuk path AN-19 |
| BE-21 | backend | Pindah refresh cuaca ke `/api/cron/…` hanya jika naskah AN-28 mengizinkan; perbarui `docs/vercel.md` + URL Actions, jangan menulis nilai secret |

### ECC-S4 — paralel yang ditahan sampai S1–S3 hijau

| id | agent | judul | Syarat |
| --- | --- | --- | --- |
| BE-23 | backend | Satu helper kab-scope | Naskah analis; uji AN-20/21/23 tetap hijau |
| BE-25 | backend | Cabut atau pasang pemakai `/api/sik/catalog` | Cek serangan permukaan |
| BE-26 | backend | Rencana pensiun `/admin/reports` | Naskah; jangan hapus baris warisan tanpa operator |
| DATA-16 | data | Seed overlay statis dari satu JSON | Migrasi baru, bukan sunting `20260911` |
| DATA-19 | data | Upsert inovasi ke `weather_inovasi_snapshot` | Naskah terpisah; jangan merge `/api/weather` |
| FE-24 | frontend | Cangkang tabel admin bersama | Setelah FE-20; jangan ubah aturan moderasi |

## Yang tidak masuk skema ini

- DATA-4 / `loggerKind` Tatonas.
- Membuka P2 Juklak atau POST nasional.
- Hook ECC, Memory Vault sebagai kebijakan, `install.ps1` penuh.
- Apply `20260923` dari tiket kode — itu operator (sudah DATA-12).
- Apply dump DATA-11.

## Cara memakai

Koordinator membaca STATUS, bukan percakapan. Agent wilayah hanya mengerjakan id di gelombang yang terbuka. Setiap tiket: jurnal, niat, bukti. Jika UI: verifikasi browser.
