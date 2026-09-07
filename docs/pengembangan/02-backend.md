# Brief agent backend

Anda mengurus API, cron, privasi berkas, dan pemisahan gagal versus kosong. Baca [00-protokol.md](00-protokol.md) lalu kerjakan tiket sesuai [STATUS.md](STATUS.md).

## Sudah selesai — jangan diulang

Scope kabupaten pada DELETE kejadian dan GET dampak; `requireModuleApi("moderasi")`; batas ubin InaRISK; PNG 2 MB; allowlist kode pelabuhan; `guardPublicPost` pada pelatihan; `rejectCrossOrigin` pada CMS/database.

## Tiket gelombang 1

### BE-1 — kegagalan overlay bukan keberhasilan kosong

Jurnal: `jurnal/BE-1.md`

**Niat yang harus tertulis.** Klien harus bisa membedakan "tidak ada kejadian" dari "sumber mati".

**Berkas.** `src/app/api/overlay/[key]/route.ts`. Boleh menambah tipe hasil di `src/lib/overlay-live.ts` hanya jika perlu membedakan gagal/kosong, tanpa memindahkan pengambilan ke cron.

**Langkah.**

1. Jika sumber live gagal dan tidak ada cache yang masih sah, kembalikan HTTP 503 dengan `{ type: "FeatureCollection", features: [], stale: true, error: "upstream" }`.
2. Jika cache ada tetapi kedaluwarsa atau stale, HTTP 200 + `stale: true` diperbolehkan.
3. Jangan mengubah cabang fixture statis menjadi 503 hanya karena koleksi kosong.

**Kriteria.**

- `catch` di `api/overlay/[key]` tidak lagi membalas 200 untuk galat tak tertangani.
- FeatureCollection kosong tanpa `stale` hanya untuk data sah yang memang kosong.
- `npx tsc --noEmit` dan `npm test` lulus.

### BE-2 — hapus metadata EXIF unggahan laporan

Jurnal: `jurnal/BE-2.md`

**Niat yang harus tertulis.** Foto pelapor tidak boleh menyimpan GPS atau perangkat.

**Berkas.** `src/app/api/laporan/upload/route.ts`, helper baru di `src/lib/laporan/` jika perlu, uji di `src/lib/laporan/`.

**Langkah.**

1. Validasi magic bytes tetap jalan.
2. Enkode ulang gambar (JPEG/PNG/WebP) sebelum `storage.upload`. Buang metadata.
3. Tolak berkas yang bukan gambar terenkode ulang.
4. Jangan mengubah kebijakan bucket.

Pustaka: pakai yang sudah ada di `package.json`. Jika belum ada, pilih yang ringan dan catat di niat sebelum menambah dependensi.

**Kriteria.**

- Buffer yang diunggah bukan salinan byte-identik dari unggahan asli untuk JPEG ber-EXIF (uji dengan fixture kecil).
- Unggahan non-gambar tetap ditolak.
- `npm test` lulus.

### BE-3 — ringkasan marker sepadan dengan endpoint marker

Jurnal: `jurnal/BE-3.md`

**Niat yang harus tertulis.** Angka ringkasan memakai sumber yang sama dengan daftar marker.

**Berkas.** `src/app/api/layers/markers/summary/route.ts` dan helper yang sudah dipakai endpoint marker.

**Kriteria.**

- Ringkasan menghitung kejadian operasi dan pengungsian, bukan hanya `mergeLaporanOverlays`.
- Tidak ada endpoint baru.

## Tiket kemudian

### BE-4 — GET overlay live hanya membaca tabel

Jurnal: `jurnal/BE-4.md`. Gelombang 2. Selesai. Jangan diulang.

### BE-5 — RLS PII memakai `is_ops()`

Jurnal: `jurnal/BE-5.md`. Gelombang 2. Selesai. Jangan diulang.

### BE-6 — sinyal overlay menjadi calon kejadian

Jurnal: `jurnal/BE-6.md`. Gelombang 2. Selesai. Jangan diulang.

### BE-7 — rotasi kunci PII

`src/lib/laporan/crypto.ts`: sematkan id kunci; dekripsi mencoba beberapa kunci. Gelombang 3. Selesai. Jangan diulang.

## Tiket gelombang 5

### BE-9 — API katalog / jadwal / validasi

Jurnal: `jurnal/BE-9.md`. Gelombang 5. Selesai. Jangan diulang.

### BE-10 — checklist kunci statis + peringatan dinamis

Jurnal: `jurnal/BE-10.md`. Gelombang 5. Selesai. Jangan diulang.

### BE-11 — inventaris rute G2–G5

Jurnal: `jurnal/BE-11.md`. Gelombang 6. Selesai. Jangan diulang. **Pengecualian wilayah:** `security/attack-surface.md` (peta yang ada, bukan prosedur serangan).

Daftarkan rute yang sudah hidup dan belum ada di inventaris: calon kejadian, overlay publik/cron, SDB katalog/jadwal, validasi, peringatan dinamis, PATCH fase. Tambah env `LAPORAN_PII_KEY_ID` / `LAPORAN_PII_KEYS` di daftar server. Jangan menulis langkah exploit, payload, atau PoC. Jangan mengubah `src/`. Jangan Destana. Jangan commit.

### BE-12 — API program Destana

Jurnal: `jurnal/BE-12.md`. Gelombang 9. Selesai. Jangan diulang.

### BE-13 — nama env overlay + variabel URL

Jurnal: `jurnal/BE-13.md`. Gelombang 13. Nama `OVERLAY_CRON_SECRET` / `OVERLAY_REFRESH_URL` di `.env.example` (tanpa nilai). Variabel GitHub `OVERLAY_REFRESH_URL` = URL di `docs/vercel.md`. Jangan membuat atau menulis nilai secret. Jangan POST ke cron. Satu kalimat README: seed `upsert_marker_features` wajib `service_role`. **Pengecualian wilayah:** `.env.example`, `README.md`.

### BE-14 — landasikan tulis + baca overlay live

Jurnal: `jurnal/BE-14.md`. Gelombang 14. Landasikan `POST /api/cron/overlay-live` dan `GET /api/overlay/{key}` ke pohon git. GET hanya membaca ledger (BE-8 / AN-5). Jangan menulis nilai secret. Jangan menebak Tatonas. Jangan migrasi baru. Jangan rute tiles/static/maritime. **Pengecualian wilayah:** `src/lib/overlay-calon.ts`, `src/lib/overlay-layers.ts`, `src/lib/inarisk-tiles.ts`, `src/lib/types.ts`, `src/lib/supabase/types.ts`, `src/lib/sik/db-tables.ts` (hanya tipe overlay/calon).

### BE-16 — cron maritim, GET baca saja

Jurnal: `jurnal/BE-16.md`. Gelombang 15. Persist cache maritim hanya dari `POST /api/cron/overlay-live`. GET `/api/overlay/maritime/*` hanya baca. Paralel + allowlist Aceh. Jangan secret baru. Jangan DATA-4. Jangan mengubah `matchesKabScope`.

### BE-17 — fail-closed kab + filter resource

Jurnal: `jurnal/BE-17.md`. Gelombang 16. Jangan dikode sebelum AN-20 selesai. Hanya aturan tertulis di naskah.

### BE-18 — saring moderasi laporan

Jurnal: `jurnal/BE-18.md`. Gelombang 17. Jangan dikode sebelum AN-22. Helper `kabupaten_kota`, bukan `matchesKabScope` mentah. Reports warisan 403 untuk kab.

### BE-19 — API undangan staf

Jurnal: `jurnal/BE-19.md`. Gelombang 18. `requireSuperAdminApi`. POST hanya `admin_kabkota` + katalog. Jangan password. Jangan secret di klien.

### BE-20 — GET cuaca inovasi baca saja

Jurnal: `jurnal/BE-20.md`. Gelombang 19. Jangan dikode sebelum AN-24. `GET /api/weather/inovasi` hanya baca. Jangan mengubah `getWeatherForecasts`, `WeatherSource`, atau `POST /api/weather/refresh`. Secret `WEATHER_INOVASI_CRON_SECRET`. Jangan DATA-4.

### BE-28 — GET `/api/kejadian/analisis`

Jurnal: `jurnal/BE-28.md`. Gelombang 20. Jangan dikode sebelum AN-29. Agregat dari `loadKejadian()`. Kosong sah = 200. Hulu gagal = 503. Jangan menggabungkan DIBI. Jangan menabrak BE-21 (ECC-S). Jangan DATA-4.

### BE-29 — API insight + query adapter

Jurnal: `jurnal/BE-29.md`. Gelombang 25. Kontrak AN-36. CRUD staf + `GET /api/insight/public/[slug]` + `POST /api/insight/query`. Adapter empat sumber. Bukan SQL. Bukan `/api/admin/database`. Inventaris `attack-surface.md`. Jangan DATA-4.

## Tiket gelombang ECC-S — kerapian

Kontrak: [06-skema-kerapian.md](06-skema-kerapian.md). Jangan DATA-4. Jangan merge `/api/weather`.

### BE-24 — `qk.hazards` (S1)

Jurnal: `jurnal/BE-24.md`. Hapus kunci yatim jika uji preview tetap mengunci pensiun `/api/hazards`.

### BE-22 / BE-27 / BE-21 — kontrak baca + cron (S3)

Jangan dikode sebelum AN-28. Jangan menulis nilai secret. Jangan POST nasional.

## Saat menutup tiket

Perbarui [STATUS.md](STATUS.md). Jangan commit.
