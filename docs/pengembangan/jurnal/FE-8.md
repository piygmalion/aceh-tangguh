# FE-8 — daftar + terima/tolak calon

Agent: frontend
Gelombang: 4
Status: selesai

## Niat

Salin keputusan AN-6 (bukan opsi). AN-4 hanya dirujuk. Tidak mengubah AN-4. Tidak mengubah `src/app/api/**`. Tidak commit.

- Tujuan: Permukaan konsol staf daftar + terima/tolak calon kejadian, persis naskah FE-8 di `jurnal/AN-6.md`. Pakai GET/POST BE-6 yang sudah ada. Jangan merancang otorisasi, status, field, rute API, item sidebar, atau tombol peta.
- Berkas (hanya ini):
  - `src/i18n/routing.ts` — pathname `"/admin/sik/kejadian/calon": "/admin/sik/kejadian/calon"` (pengecualian typed Link)
  - `src/app/[locale]/admin/(console)/sik/kejadian/calon/page.tsx` — server: `requireStaffPage` + `canAccessModule(profile, "kejadian")` → `SikForbidden`; render `<CalonKejadianList isKabScoped={isKabScoped(profile)} />`; jangan kirim `profile`
  - `src/components/sik/CalonKejadianList.tsx` — klien baru; fetch + tiga tab + satu panel terima ATAU tolak; operan hanya `isKabScoped: boolean`
  - `src/components/sik/KejadianOpsList.tsx` — di samping Buat: `<Link href="/admin/sik/kejadian/calon"><Button size="sm" variant="outline">{tCalon("navFromList")}</Button></Link>`
  - `src/app/[locale]/admin/(console)/page.tsx` — jika modul `kejadian`, dua kartu (kejadian yang ada + `overviewTitle` / `overviewBody`); perbaiki union href typed jika perlu
  - `messages/id.json`, `messages/en.json` — namespace akar `sikCalon` HANYA kunci tabel AN-6, teks persis tabel; jangan menimpa kunci lain
  - `docs/pengembangan/jurnal/FE-8.md`
  - `docs/pengembangan/STATUS.md` — HANYA baris FE-8
- Tidak diubah: `AdminShell` items; `MapOverlays` / `MapToolbar` / popup peta; FE-7; AN-7/AN-8/SDI; DATA-4; `src/app/api/**`; AN-4; kunci i18n lama.
- Langkah (satu perilaku per butir AN-6):
  1. Rute `/admin/sik/kejadian/calon`. Bukan `/admin/sik/calon`, bukan halaman `[id]`. Terima/tolak di panel daftar.
  2. Guard sama `kejadian/page.tsx`. UI tidak filter ulang wilayah. Select kab = seluruh `ACEH_KABUPATEN`; 403 API ditampilkan sebagai `error`.
  3. `GET /api/sik/calon-kejadian?status=` + `cache: "no-store"`. Default tab `draf`. Tiga tab `draf` / `ditolak` / `diterima`. Ganti tab = set + fetch; jangan simpan status di URL. Badan `{ items }`. Tanpa pagination. Jangan urut ulang. Kosong = `sikCalon.empty`. Gagal = `loadError` (jangan kosongkan seolah sukses). Muat = `loading`. Jangan `POST /api/sik/calon-kejadian`.
  4. Tujuh kolom + aksi. Nama: tab `diterima` + `kejadian_id` → Link detail; selain itu teks. Sumber / layer apa adanya. Waktu: string → `toLocaleString("id-ID")`; `null` → `—`. Kabupaten: setelah trim salah satu terisi → `kabupaten` else `kode_kabupaten`; keduanya kosong = `belumTerikat`. Tautan/asal dipetakan kunci i18n. Aksi hanya tab `draf`. Jangan render snapshot, korban, `logger_kind`, `kd_hardware`, `external_id`, koordinat, `ditolak_alasan`, `usulan_*` sebagai kolom.
  5. Form terima hanya `draf`. `POST .../terima` JSON sama-origin.
     - Kabupaten: sudah terikat = teks, jangan kirim field kab. Belum terikat + `isKabScoped` = select wajib tanpa opsi kosong; kirim kode katalog + `findKabupaten(kode).nama`. Belum terikat + bukan kab-scoped = select opsional, opsi kosong `fieldKabupatenEmpty`; kosong = jangan kirim kedua field.
     - Waktu: `waktu_sinyal` terisi = jangan input, jangan kirim. `null` = `date` + `time` wajib, jangan pra-isi `now()`; susun `` `${tarikh}T${jam}:00+07:00` `` lalu `toISOString`; jangan `jam||"00:00"`; kosong → `errorWaktuWajib`.
     - Jenis: `usulan_kode_jenis` bukan null = teks baca, jangan kirim. `null` = select wajib; `kode_jenis` = `Number` JSON. Tanpa pilihan → `errorJenisWajib`.
     - Nama: input opsional, awal = `nama_sinyal`; kirim jika trim ≥ 2.
     - Setelah 200: `kejadian.id` (bukan `item.kejadian_id` saja) → `router.push` detail. 200 tanpa `kejadian.id` → `errorTerima`, jangan mengarang UUID. 4xx/5xx: `error` API else `errorTerima`; tetap di daftar.
  6. Form tolak hanya `draf`. Alasan opsional: trim kosong → `{}`; ada teks → `{ ditolak_alasan }`. 200: tetap tab `draf`, fetch ulang. Jangan pindah tab `ditolak`. Gagal: `errorTolak` atau `error` API; panel tetap terbuka.
  7. Satu panel terbuka: Terima atau Tolak di baris lain menutup panel. Batal menutup tanpa fetch.
  8. Tidak ada tombol peta / `MapOverlays` / `POST /api/sik/calon-kejadian`.
  9. i18n: hanya tabel AN-6. `KejadianOpsList` memakai `sikCalon` hanya `navFromList`. Overview hanya `overviewTitle` / `overviewBody`.
- Cara membuktikan:
  - Baca sumber: page guard, operan boolean, tiga tab, tujuh kolom, body terima/tolak, `kejadian.id`, namespace kunci = tabel.
  - Grep `AdminShell` tidak menambah href calon. Grep `CalonKejadianList` tidak `POST /api/sik/calon-kejadian` (tanpa `/terima` atau `/tolak`). Grep peta tidak menambah tombol calon.
  - `npm test`; `npx tsc --noEmit` (PowerShell `;`).
  - Browser: jika bisa login staf, buka `/id/admin/sik/kejadian/calon`. Jika tidak, catat di bukti.
- Risiko:
  - Item `AdminShell` baru — dilarang.
  - Tombol popup peta / POST create calon — dilarang.
  - `now()` atau `jam||"00:00"` — dilarang.
  - `kode_jenis` string JSON — dilarang (harus number).
  - Navigasi pakai `item.kejadian_id` tanpa `kejadian.id` — dilarang.
  - Menimpa kunci i18n lama; mengubah API; mengerjakan FE-7 / FE-9 / DATA-4 / AN-7 / AN-8.

## Bacaan ulang niat

Dibaca dari awal sebagai orang yang tidak menulisnya. Setiap butir adalah aturan AN-6, bukan pilihan. Rute anak kejadian; guard = modul kejadian; fetch GET `?status=` default draf; kolom tujuh field; form mengikuti tabel AN-6; setelah terima `kejadian.id`; tolak `{}` + tetap draf; popup bukan FE-8; i18n tertutup. Tidak ada “nanti kita lihat”. Siap kode.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `src/i18n/routing.ts` | pathname `"/admin/sik/kejadian/calon"` |
| `src/app/[locale]/admin/(console)/sik/kejadian/calon/page.tsx` | Guard kejadian; `<CalonKejadianList isKabScoped={…} />` |
| `src/components/sik/CalonKejadianList.tsx` | Daftar + tab + satu panel terima/tolak |
| `src/components/sik/KejadianOpsList.tsx` | Tombol outline `navFromList` di samping Buat |
| `src/app/[locale]/admin/(console)/page.tsx` | Kartu calon jika modul kejadian; `tCalon` overview |
| `messages/id.json`, `messages/en.json` | Akar `sikCalon`, 44 kunci tabel AN-6 |
| `docs/pengembangan/STATUS.md` | Baris FE-8 → selesai |

`AdminShell` items tidak diubah. `src/app/api/**` tidak diubah.

## Bukti

Putaran 1 — niat disalin dari keputusan AN-6 (bukan opsi). Bacaan ulang niat: siap kode.

Putaran 2 — kode sesuai niat.

Baca sumber:

- Page: `requireStaffPage` + `canAccessModule(profile, "kejadian")` → `SikForbidden`; render hanya `isKabScoped={isKabScoped(profile)}`.
- `routing.ts` memuat pathname calon. Grep `AdminShell` `calon` = tidak ada.
- `KejadianOpsList`: `Link` + `Button size="sm" variant="outline"` + `tCalon("navFromList")` di samping Buat.
- Overview: spread dua kartu jika modul kejadian (`/admin/sik/kejadian` + `/admin/sik/kejadian/calon`).
- `CalonKejadianList`: `GET /api/sik/calon-kejadian?status=` + `cache: "no-store"`; default `draf`; tiga tab; tanpa `page`/`pageSize`; tanpa filter wilayah; fetch hanya GET daftar + POST `…/terima` + POST `…/tolak`. Tidak ada `POST /api/sik/calon-kejadian` create.
- Tujuh kolom + aksi. Tab `diterima` + `kejadian_id` → Link detail. `calonBelumTerikat` = kedua field kosong setelah trim.
- Terima: kab/waktu/jenis sesuai tabel; `kode_jenis = Number`; waktu `` `${tarikh}T${jam}:00+07:00` `` → `toISOString`; tidak ada `now()` / `jam||"00:00"`. 200 memakai `kejadian.id`.
- Tolak: `{}` jika alasan kosong; tetap tab `draf`; `load("draf")`.
- Grep peta/`MapOverlays` calon = tidak ada.
- `sikCalon` id+en: 44 kunci, teks persis tabel, extra/missing/mismatch = [].

`npm test` — tests 278, pass 278, fail 0.

`npx tsc --noEmit` — exit 0.

Browser: tidak diverifikasi. Alat browser MCP tidak tersambung (namespace tidak re-register). Tidak ada kredensial staf di sesi agent ini. `GET /id/admin/sik/kejadian/calon` ke `localhost:3122` timeout (dev server sibuk compile rute lain). Andalan: tsc + uji + baca sumber.

Tidak commit.

## Bacaan ulang bukti versus kriteria

- [x] Rute `/admin/sik/kejadian/calon`; page `requireStaffPage` + `canAccessModule` kejadian; `isKabScoped` saja
- [x] `routing.ts` pathname calon; `AdminShell` items tidak diubah
- [x] `KejadianOpsList` Link + Button outline sm `navFromList`; overview dua kartu jika modul kejadian
- [x] GET `?status=` default draf; tiga tab; tanpa pagination; tanpa filter wilayah ulang; tanpa POST create
- [x] Tujuh kolom + aksi; tab diterima + `kejadian_id` → Link; belum terikat = kedua field kosong
- [x] Satu panel; terima field AN-6; `kode_jenis` Number; waktu ISO WIB tanpa `now()`; 200 → `kejadian.id`
- [x] Tolak `{}` jika alasan kosong; tetap tab draf; fetch ulang
- [x] `sikCalon` hanya kunci tabel AN-6 di id + en; kunci lain utuh
- [x] Tidak ada tombol peta / MapOverlays / POST create calon
- [x] `npm test` + `tsc --noEmit`; browser tidak diverifikasi (login tidak tersedia / MCP browser mati) — tercatat, bukan blocker sesuai brief

## Keputusan

selesai
