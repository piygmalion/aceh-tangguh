# Brief agent frontend

Anda mengurus teks yang terlihat, tautan peta, dan status data di antarmuka. Baca [00-protokol.md](00-protokol.md) lalu kerjakan tiket sesuai [STATUS.md](STATUS.md).

## Sudah selesai — jangan diulang

Enam puluh tujuh kunci `messages/id.json` dan `messages/en.json` untuk hero, panduan, Tatonas, dan kicker bagian. Jangan menimpa nilai yang sudah ada.

## Tiket gelombang 1

### FE-1 — bagian SIK beranda ikut berpindah bahasa

Jurnal: `jurnal/FE-1.md`

**Niat yang harus tertulis.** Locale `en` tidak boleh menampilkan judul dan filter berbahasa Indonesia pada bagian kejadian operasional.

**Berkas.** `src/components/sik/OperationalStatsSection.tsx`, `messages/id.json`, `messages/en.json`. Namespace baru, misalnya `sikStats`.

**Teks yang wajib lewat next-intl.**

- Judul "Kejadian operasional Aceh"
- Deskripsi ringkasan di bawah judul
- Label "Jumlah kejadian"
- Opsi "Semua jenis"
- Tautan "Lihat data bencana" dan "Status Destana"
- Placeholder "Kabupaten/Kota" jika diketik di komponen ini

**Kriteria.**

- Tidak ada string Indonesia hardcoded di komponen itu untuk label UI.
- `/en` menampilkan salinan Inggris; `/id` tetap Indonesia.
- Pemindai `t()` tidak menambah kunci hilang.
- Verifikasi browser: buka `/id` dan `/en`, bandingkan judul bagian.

### FE-2 — `selectedId` di URL membuka fitur

Jurnal: `jurnal/FE-2.md`

**Niat yang harus tertulis.** Tautan dalam ke satu fitur harus menggerakkan peta dan popup, atau parameter dihapus jika tidak akan dipakai.

**Berkas.** `src/hooks/useMapUrlState.ts`, `src/components/map/MapViewport.tsx`. Jangan mengubah katalog layer.

**Kriteria.**

- Jika `selectedId` tetap ada: `MapViewport` membacanya, menyesuaikan bounds, dan membuka popup jika fitur ada.
- Jika dihapus: tidak ada sisa pembacaan/penulisan URL untuk kunci itu.
- Keputusan (sambungkan atau hapus) tertulis di jurnal sebelum kode.

## Tiket kemudian

### FE-3 — tampilan stale/gagal overlay

Jurnal: `jurnal/FE-3.md`. Gelombang 2. Selesai. Jangan diulang.

### FE-4 — `HazardStatusStrip`

Jurnal: `jurnal/FE-4.md`. Gelombang 3. Selesai. Jangan diulang.

### FE-5 — fixture pratinjau statis

Jurnal: `jurnal/FE-5.md`. Gelombang 3. Selesai. Jangan diulang.

### FE-6 — `tatonasStations` hanya overlay

Jurnal: `jurnal/FE-6.md`. Gelombang 3. Selesai. Jangan diulang.

### FE-7 — sisa dokumentasi dan kunci mati `/api/hazards`

Jurnal: `jurnal/FE-7.md`. Gelombang 4. Komponen dan rute sudah dihapus (FE-4). Rapikan sisa yang menyesatkan.

**Berkas.** `README.md`, `security/attack-surface.md`, `src/lib/qk.ts`, `src/lib/map-url-aliases.ts` (komentar), `messages/id.json`, `messages/en.json`. Pengecualian wilayah: README, attack-surface, dan `qk.ts` boleh disentuh hanya untuk menghapus sisa hazards.

**Langkah.**

1. Hapus baris `GET /api/hazards` dari README dan dari daftar Public GET di `security/attack-surface.md`.
2. Di README, baris `GET /api/layers/markers` jangan lagi mengklaim merge `tatonasStations` (FE-6: Tatonas hanya overlay).
3. Hapus `qk.hazards` jika tidak ada pemakai di `src/`.
4. Perbaiki komentar `HazardStatusStrip` di `map-url-aliases.ts` — `?hazard=` tetap, strip sudah tidak ada.
5. Hapus namespace `messages.hazards` hanya jika tidak ada `t("hazards…")`. Jangan menimpa kunci lain. Jangan menghapus `HazardKind` / `?hazard=`.

**Kriteria.** Grep `/api/hazards` di README dan attack-surface = tidak ada. `qk.hazards` tidak ada. `npm test` hijau.

### FE-8 — daftar dan keputusan calon kejadian

Jurnal: `jurnal/FE-8.md`. Gelombang 4. Selesai. Jangan diulang.

Kontrak: seluruh bagian FE-8 di AN-6. Pakai API BE-6 yang sudah ada. Jangan merancang otorisasi, status, atau field baru. Jangan tombol di peta publik. Jangan menebak `loggerKind`, zona KRB, atau angka korban.

### FE-9 — banner dinamis + katalog SDB

Jurnal: `jurnal/FE-9.md`. Gelombang 5. Selesai. Jangan diulang. Bukan item sidebar baru. Jangan mengerjakan ulang UI calon (FE-8).

### FE-10 — sisa panduan hazards + i18n daftar kejadian

Jurnal: `jurnal/FE-10.md`. Gelombang 6. Selesai. Jangan diulang. Dua permukaan saja.

1. `panduan.s8.body` di `messages/id.json` dan `messages/en.json`: hapus klaim bahwa `GET /api/hazards` masih hidup. `?hazard=` tetap alias filter jenis peta (bukan rute hazards). Jangan menimpa fakta kartu Peringatan Dini. Jangan menimpa kunci lain.
2. `KejadianOpsList.tsx`: opsi status Aktif / Selesai / Diarsipkan dan suffix `bencana` lewat next-intl. Tambah kunci di namespace `admin` saja (`statusAktif`, `statusSelesai`, `statusDiarsipkan`, `labelIsBencana`). Jangan memakai `statusVocab.aktif`. Tanggal baris memakai locale next-intl, bukan hardcode `id-ID`. Jangan mengubah banner SDB, tautan calon, atau fetch.

Jangan Destana. Jangan UI calon. Jangan item sidebar. Jangan commit.

### FE-11 — header KIB + tanggal locale staf

Jurnal: `jurnal/FE-11.md`. Gelombang 7. Selesai. Jangan diulang.

1. `KejadianOpsList.tsx`: header `KIB` lewat kunci baru `admin.colKib` (id+en). Status baris memakai kunci `admin` yang sudah ada (`statusDraft` / `statusAktif` / `statusSelesai` / `statusDiarsipkan`), bukan `.capitalize` mentah. Jangan mengubah fetch, banner, tautan.
2. `CalonKejadianList.tsx`: `toLocaleString("id-ID")` → `useLocale()`. Jangan menambah kunci `sikCalon` (AN-6 terkunci).
3. `KejadianOpsDetail.tsx`: tanggal kejadian memakai `useLocale()`. Suffix ` · bencana` memakai `admin.labelIsBencana`. Tambah `admin.labelBelowThreshold` untuk ` · di bawah ambang`. Jangan menerjemahkan tombol fase, pesan error, atau seluruh halaman.

Jangan Destana. Jangan item sidebar. Jangan commit.

### FE-12 — i18n sisa KejadianOpsDetail

Jurnal: `jurnal/FE-12.md`. Gelombang 8. Selesai. Jangan diulang.

### FE-13 — label instrumen + form 17 aktivitas

Jurnal: `jurnal/FE-13.md`. Gelombang 9. Selesai. Jangan diulang.

### FE-14 — i18n halaman publik Destana

Jurnal: `jurnal/FE-14.md`. Gelombang 10. Selesai. Jangan diulang.

Judul, lead, header tabel, dan label tingkat di `/[locale]/destana` lewat `destanaProgram`. Tautan beranda lewat `nav.home`. Jangan mengubah `pkd.ts`. Jangan menimpa `instrumentTransisi`. Jangan meni18n-kan seluruh form admin PKD.

### FE-15 — i18n pelatihan, nomor penting, mitra

Jurnal: `jurnal/FE-15.md`. Gelombang 13. Judul, lead, dan tautan beranda di `/[locale]/pelatihan`, `/nomor-penting`, `/mitra` lewat namespace `publik` + `nav.home`. Jangan meni18n-kan daftar/form di dalam komponen. Jangan meni18n-kan admin atau cetak Juklak. Jangan mengubah `pkd.ts`.

### FE-17 — hook peta ikut tabel AN-19

Jurnal: `jurnal/FE-17.md`. Gelombang 15. `fetchOverlayGeojson` memakai `overlayVectorApiPath`. Raster tetap `/api/overlay/tiles`. Verifikasi browser `/id/peta`. Jangan meni18n-kan ulang. Jangan mengubah `pkd.ts`.

### FE-18 — halaman 23 slot staf kab

Jurnal: `jurnal/FE-18.md`. Gelombang 18. `/admin/staf` super_admin. Dropdown katalog, bukan teks bebas. Jangan undang email fiktif. Sembunyikan tab reports warisan untuk kab.

### FE-19 — strip inovasi publik terpisah

Jurnal: `jurnal/FE-19.md`. Gelombang 19. Jangan dikode sebelum AN-24. Strip di bawah `WeatherStrip`. Namespace `weatherInovasi`. Jangan mengubah `WeatherStrip`, `weather-summary.ts`, atau `weather.attribution`. Jangan DATA-4.

### FE-25 — halaman Analisis data + teaser

Jurnal: `jurnal/FE-25.md`. Gelombang 20. Jangan dikode sebelum AN-29. Rute `/analisis-data` · `/disaster-analysis`. Namespace `analisisData`. Teaser mengganti panel `KejadianAnalisis` di Data bencana. Jangan menabrak FE-20 (ECC-S). Jangan DATA-4.

### FE-26 — katalog fill + path static bahaya

Jurnal: `jurnal/FE-26.md`. Gelombang 21. `inariskBahaya*` = `kind: "fill"` + fixture static. `fetchOverlayGeojson` memakai `overlayVectorApiPath`. Popup `kelas` lewat `krbSedang`/`krbTinggi`. Jangan hapus `isInariskRasterKey` / proxy ubin. Jangan DATA-4.

### FE-27 — popup konteks AI di dalam #cuaca

Jurnal: `jurnal/FE-27.md`. Gelombang 22. Dialog dari chip di `WeatherStrip`. Jangan fetch WN3 di `WeatherStrip`. Jangan DATA-4.

### FE-28 — oranye navbar sebagai penanda interaksi

Jurnal: `jurnal/FE-28.md`. Gelombang 22. Oranye hanya hover/fokus/aktif. Locale terpilih tetap sage. Jangan DATA-4.

### FE-29 — kartu keterangan titik peta

Jurnal: `jurnal/FE-29.md`. Gelombang 22. Deny-list PII. Bukan CSV karantina. Jangan DATA-4.

### FE-30 — panel Ancaman × riwayat di Analisis data

Jurnal: `jurnal/FE-30.md`. Gelombang 23. Kontrak AN-32. Select `ancaman`, kartu IRBI/KRB + riwayat + analogi. i18n `analisisData.*`. Jangan menimpa FE-26. Jangan menjumlahkan skor ke KPI. Jangan hardcode judul Indonesia. Jangan menimpa FE-27 (dialog cuaca G22).

### FE-31 — Histori Kejadian + Proyeksi Dampak

Jurnal: `jurnal/FE-31.md`. Gelombang 24. Kontrak AN-34. Ganti judul kartu; tampilkan rentang histori + pita skala + replay. Jangan hardcode judul Indonesia. Jangan menjumlahkan skor ke KPI. Jangan menimpa FE-28 (navbar G22).

### FE-32 — polish Analisis ancaman (type floor, judul, flex gap)

Jurnal: `jurnal/FE-32.md`. Gelombang 25. Hanya `AnalisisAncamanPanel` + uji penerimaan. Chip/catatan naik ke `TYPE_FLOOR_CLASS` (13px). Satu `ancamanTitle` di `h3`. `flex` + `gap-*` mengganti `space-y-*` / `space-x-*` di panel dan tiga kartu. Jangan mengubah IRBI/KRB, rumus proyeksi, layer peta, SIK, Destana, atau navbar. Jangan hapus `GlassPanel` atau disclaimer empiris.

## Tiket gelombang ECC-S — kerapian

Kontrak: [06-skema-kerapian.md](06-skema-kerapian.md). Jangan menimpa kunci i18n yang sudah ada. Jangan menggabungkan strip cuaca resmi dan inovasi.

### FE-20 — namespace calon / SDB / overlay peta (S1)

Jurnal: `jurnal/FE-20.md`. Pulihkan `sikCalon`, `sikSdb`, dan kunci `map.overlay*` di ID+EN. Komponen sudah memanggilnya.

### FE-21 — rute calon + SDB (S1)

Jurnal: `jurnal/FE-21.md`. `routing.ts` + taut dari daftar kejadian. Jangan mengubah matriks peran.

### FE-22 / FE-23 — sampah tampilan + locale tanggal (S1)

`WeatherGrid` yatim; namespace `hazards` yatim; `useLocale()` pada dasbor yang masih `id-ID` keras.

## Saat menutup tiket

Perbarui [STATUS.md](STATUS.md). Jangan commit. Jika UI berubah, verifikasi di browser sebelum menutup.
