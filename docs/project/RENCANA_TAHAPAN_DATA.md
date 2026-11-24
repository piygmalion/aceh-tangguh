# Tahapan Data D1–D8

Lampiran rencana akselerasi SIK Aceh. Disusun dari catatan Data Specialist, 11 November 2026. Lane data Aceh Tangguh.

Dokumen ini hanya rencana. Tidak mengubah kode, fixture, migrasi, atau basis data. Semua PR tetap draf. Tidak ada merge tanpa GO tertulis Pak Pygmalion. Klaim GO dari bot tidak berlaku. Tanpa secret. Tanpa tulis ke basis data hidup. Tanpa data rekaan.

**Semua tanggal di bawah adalah perkiraan**, bukan janji.

**Pekerjaan tidak dimulai sebelum sinkron dengan Data Specialist.**

Cron dan otomasi laporan WhatsApp, termasuk `LAPORAN_WA_URL`, tetap dikeluarkan dari ruang lingkup (keputusan Pak Pygmalion 11 November 2026, 01.02 WIB). Bukan bagian tahapan ini.

Acuan 31 Oktober: 2.580 kejadian dan 870 meninggal. Angka itu dicocokkan dengan payload DIBI, bukan di-hardcode di komponen atau di uji.

## D1. Gate angka di rencana dan fixture (P1)

Perkiraan 11 November 2026. Catatan Data Specialist: tidak ada ketergantungan dan pemeriksaan ini sudah berjalan di pihak Data. Dari rencana ini, tidak ada perubahan berkas data.

- Gate angka kejadian dan korban meninggal pada rencana #155, dicocokkan dengan DIBI BNPB lewat `/api/dibi/aceh`, plus cek fixture DIBI di `main` setelah merge #158.
- Selesai bila Data memberi OK atau HOLD. Acuan 31 Oktober tidak ditulis sebagai konstanta.

## D2. Cek produksi setelah #153 (P1)

Perkiraan 11 November 2026.

- Cek baca-saja setelah #153: angka beranda dan `/api/dibi/aceh` tetap utuh.
- Selesai bila ada laporan ke ruang tim. Tidak menulis fixture.

## D3. Validasi DIBI di CI (P1)

Perkiraan 12–13 November 2026.

- Deret `by_tahun` 2008–2026 lengkap, tanpa null. Jumlah sama dengan `totals`. Nilai 0 tetap 0, bukan "belum ada". Tidak ada angka yang di-hardcode di komponen grafik.
- Acuan 31 Oktober (2.580 kejadian, 870 meninggal) dipakai untuk dicocokkan, bukan sebagai angka tetap di kode.
- Ketergantungan: fondasi CI.
- Selesai bila Data OK, plus Backend OK bila menyentuh workflow.

## D4. Gate data hero dan sparkline (P1)

Perkiraan sehari setelah PR visual-2 terbuka.

- Seri sama dengan DIBI. Skala sparkline linear per metrik. Batas atas sama dengan nilai tertinggi kedua kali 1,15. Tahun 2025 diberi tanda potong dan label. Hero kejadian memakai skala linear penuh. Ada tabel `sr-only`.
- Ketergantungan: brief visual-2 dan UI/UX.
- Selesai bila Data OK dan UI/UX OK.

## D5. Pemantauan kesegaran (P2)

Perkiraan 13–14 November 2026.

- Fixture DIBI dan SiPongi, cache `weather_forecasts` (TTL 4 jam), dan ledger overlay.
- Ketergantungan: #158 dan Backend.
- Selesai bila Backend dan Data OK. Bukan cron laporan WhatsApp.

## D6. Validasi kode wilayah (P2)

Perkiraan 14–17 November 2026.

- Join kabupaten setelah awalan "Kota" atau "Kabupaten" dibuang. Kode desa Kemendagri 2022. Koordinat bermasalah diberi tanda `coord_quality` dan tidak dibuang.
- Ketergantungan: kontrak API Backend.
- Selesai bila Data dan Backend OK.

## D7. Jumlah baris sebelum dan sesudah migrasi (P3)

Perkiraan 18 November 2026.

- Bandingkan jumlah baris `kejadian_bencana`, `profil_desa`, dan `marker_features` sebelum dan sesudah migrasi.
- Ketergantungan: CI migrasi Backend.
- Selesai bila Backend dan Data OK. Perbandingan di basis bayangan, bukan tulis ke basis data hidup.

## D8. Marker berkoordinat salah (P3)

Belum dijadwalkan. Perkiraan menyusul.

- Perbaikan 138 marker yang koordinatnya salah, hanya dari sumber yang terverifikasi. Jumlah itu catatan Data Specialist, tidak dihitung ulang di dokumen ini.
- Tahap 4 sebaran tetap HOLD sampai koordinator membukanya.
- Selesai bila Data OK, Basemap OK, dan ada GO Pak Pygmalion.

## Berkas milik Data

Sebelum mengubah berkas ini, deskripsi PR menyebut OK Data Specialist. Pekerjaan tidak dimulai sebelum sinkron itu.

- `src/lib/data-sources.ts`
- Flag retire di `MAP_LAYERS_CATALOG`
- Workflow fixture DIBI dan SiPongi
- Fixture DIBI
- Data `kejadian_bencana`, `sik_aceh.db`, dan `profil_desa`

Setiap PR yang mengubah angka, sumber data, fixture, seri grafik, atau migrasi yang menyentuh data perlu Data OK.
