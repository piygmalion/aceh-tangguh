# AN-7 — naskah Destana dua instrumen

Agent: analis
Gelombang: kemudian (setelah Gelombang 4)
Status: selesai — naskah terpakai gelombang 9. Jangan ditulis ulang.

## Niat

- Tujuan: Mengunci korespondensi PKD Perka 1/2012 (yang masih hidup di kode) ke 17 aktivitas [Perban 7/2025 Pasal 8](https://jdih.bnpb.go.id/storage/file/2025pbbnpb007.pdf) dan field SI Pasal 20, tanpa mengarang skor baru. Tiket ini tulisan. Tidak mengubah `src/lib/sik/pkd.ts`, tabel `pkd_*`, atau rumus indeks.
- Berkas: `docs/pengembangan/jurnal/AN-7.md`, brief di `04-analis.md`, baris STATUS gelombang kemudian.
- Langkah: tulis niat → baca ulang → naskah satu perilaku → baca ulang sebagai implementer.
- Cara membuktikan: setiap indikator 1–32 punya huruf Pasal 8; SI Pasal 20 punya lima field; `hitungIndeksKetangguhan` dilarang diubah; tidak ada ambang 68,33 / 83,33 baru.
- Risiko: mengganti kuesioner 128; mengarang pedoman/SNI Kepala BNPB; menambah peran; menyentuh katalog AN-8 sebelum DATA-5 selesai.

## Bacaan ulang niat

Perban 7/2025 Pasal 22 mencabut Perka 1/2012, tetapi Pasal 12 dan 16 menyerahkan pedoman penyelenggaraan dan penilaian kepada Kepala BNPB + SNI (Pasal 13). Instrumen skor **belum ada di Perban**. Aceh Tangguh tetap menjalankan PKD 1/2012 sebagai **instrumen transisi** dengan label tahun. Registri 17 aktivitas dan SI Pasal 20 adalah data program, bukan pengganti indeks.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `docs/pengembangan/jurnal/AN-7.md` | Naskah korespondensi + SI |
| `docs/pengembangan/04-analis.md` | Brief AN-7 |
| `docs/pengembangan/STATUS.md` | AN-7 di gelombang kemudian |

## Naskah

### 1. Dua instrumen, satu desa

| Instrumen | Kode `instrumen_versi` | Apa yang boleh |
| --- | --- | --- |
| PKD Perka 1/2012 | `perka-1-2012` | Tetap: `pkd_*`, `hitungIndeksKetangguhan`, ambang pratama/madya/utama yang **sudah ada** di `pkd.ts` |
| Program Destana 7/2025 | `perban-7-2025` | Registri aktivitas a–q + meta SI. **Tanpa skor, tanpa level baru** |

UI publik `/destana` dan admin PKD wajib menampilkan teks tetap: `Instrumen transisi Perka BNPB 1/2012`. Locale `en`: `Transitional instrument: BNPB Regulation 1/2012`. Jangan menghapus penilaian yang sudah tersimpan.

Jangan menambah peran. Tetap: `admin_desa` isi PKD mandiri; `penilai_pkd` verifikasi; `admin_kabkota` / `admin_provinsi` lihat scope. Penilaian 7/2025 Pasal 14 ayat 4 = mandiri desa = `admin_desa` pada registri aktivitas, bukan penilai baru.

### 2. Huruf Pasal 8 (kunci tetap)

Pakai huruf ini sebagai `kode_aktivitas` (text, satu karakter `a`–`q`):

| kode | Aktivitas Pasal 8 |
| --- | --- |
| a | Pengintegrasian layanan dasar sektor pembangunan dengan pengelolaan risiko bencana |
| b | Penyusunan peraturan dan kebijakan PB tingkat desa/kelurahan |
| c | Pengembangan tata kelola lokal pada pelaku lokal |
| d | Pengembangan kapasitas masyarakat |
| e | Penilaian Ketangguhan Desa dan Kelurahan |
| f | Identifikasi jenis dan karakteristik ancaman |
| g | Identifikasi kerentanan dan kapasitas aset berisiko |
| h | Pembentukan FPRB desa/kelurahan |
| i | Pembentukan Tim Relawan Penanggulangan Bencana |
| j | Identifikasi sumber daya dan pengetahuan lokal |
| k | Penilaian risiko bencana |
| l | Membangun jejaring kemitraan |
| m | Perencanaan PB berbasis masyarakat |
| n | Pelaksanaan rencana PB berbasis masyarakat |
| o | Pengintegrasian rencana PB dalam perencanaan pembangunan lokal |
| p | Perencanaan penanggulangan kedaruratan berbasis masyarakat |
| q | Peningkatan kapasitas akses sumber daya, pembiayaan, teknologi, dan informasi |

### 3. Korespondensi indikator PKD 1–32 → Pasal 8

Satu indikator boleh ke lebih dari satu huruf. Implementasi menyimpan array huruf, bukan skor.

| No | Indikator PKD (nama di `PKD_KATALOG`) | Pasal 8 |
| --- | --- | --- |
| 1 | Penyelenggaraan layanan pendidikan | a |
| 2 | Penyelenggaraan layanan kesehatan | a |
| 3 | Sarana dan prasarana transportasi | a |
| 4 | Penyediaan air bersih | a |
| 5 | Program dan kegiatan pangan & gizi | a |
| 6 | Pemberdayaan UMKM dan BUMDes | a, q |
| 7 | Sarana dan prasarana komunikasi/informasi | a, q |
| 8 | Pelayanan administrasi dan kependudukan | a |
| 9 | Perlindungan dan pengelolaan lingkungan hidup | a, f |
| 10 | Peraturan dan kegiatan keagamaan | a, j |
| 11 | Peraturan dan kegiatan kebudayaan | a, j |
| 12 | Perlindungan keamanan | a |
| 13 | Pemberdayaan perempuan dan perlindungan anak | a, d |
| 14 | Layanan khusus (difabel) | a, d |
| 15 | Pengkajian risiko bencana | e, f, g, k |
| 16 | Rencana penanggulangan bencana | b, m, o |
| 17 | Pelatihan penanggulangan bencana | d |
| 18 | Kelembagaan penanggulangan bencana | c, h, i |
| 19 | Bantuan/kerja sama kegiatan PB | l, q |
| 20 | Pencegahan bencana | f, n |
| 21 | Mitigasi bencana | g, n |
| 22 | Sosialisasi pengetahuan kebencanaan | d |
| 23 | Peringatan bahaya | p |
| 24 | Penyebarluasan peringatan bahaya | p |
| 25 | Rencana evakuasi | p |
| 26 | Jalur evakuasi | p |
| 27 | Tempat pengungsian | p |
| 28 | Uji kesiapsiagaan / simulasi | d, p |
| 29 | Penilaian pasca bencana secara mandiri | e, n |
| 30 | Pemulihan dini mandiri | n |
| 31 | Pengelolaan bantuan mandiri yang transparan | n, q |
| 32 | Membangun kembali dengan lebih baik | n, o |

Komponen PKD (agregat, bukan kunci simpan):

| Komponen | Bobot 1/2012 (jangan diubah) | Huruf dominan |
| --- | --- | --- |
| 1 Layanan dasar | 0,3 | a |
| 2 Peraturan dan kebijakan | 0,25 | b, h, l |
| 3 Pencegahan dan mitigasi | 0,25 | f, g, k |
| 4 Kesiapsiagaan | 0,1 | p, i, d |
| 5 Pemulihan | 0,1 | n, q |

### 4. SI Pasal 20 — lima muatan, tanpa skor

Tabel baru kemudian `destana_si` (satu baris per `kode_desa_kelurahan`, bukan per penilaian PKD):

| Kolom | Isi Pasal 20 | Sumber yang boleh |
| --- | --- | --- |
| `info_umum` | informasi umum Destana | teks staf desa; jangan isi indeks PKD sebagai “skor 7/2025” |
| `sebaran` | sebaran lokasi program | `kode_desa_kelurahan` 10 digit yang sudah ada di `profil_desa` / `pkd_tugas`. Jangan mengarang koordinat |
| `penilaian_rujukan` | Penilaian Ketangguhan | FK opsional ke `pkd_tugas.id` + `instrumen_versi = perka-1-2012`. Boleh null |
| `fasilitator` | sumber daya fasilitator | teks nama/instansi; bukan NIK |
| `pembelajaran` | referensi pembelajaran | URL atau teks; bukan angka korban |

Tabel baru kemudian `destana_aktivitas` :

| Kolom | Aturan |
| --- | --- |
| `kode_desa_kelurahan` | 10 digit, harus ada di `profil_desa` jika profil punya kode |
| `tahun` | int |
| `kode_aktivitas` | `a`–`q` |
| `status` | `belum` \| `berjalan` \| `selesai` |
| `catatan` | text |
| unique | `(kode_desa_kelurahan, tahun, kode_aktivitas)` |

Siklus Pasal 14 ayat 5: UI menampilkan `penilaian_berikutnya = tahun_tugas_pkd + 3`. Jangan memaksa pengisian ulang PKD otomatis.

Pemantauan Pasal 17: pakai peran yang ada (desa → kab → prov). Jangan membuat peran kecamatan.

### 5. Yang dilarang

- Mengubah `nilaiRespon`, `destanaLevelFromIndex`, bobot komponen, atau 128 pertanyaan.
- Mengisi level utama/madya/pratama dari jumlah aktivitas `selesai`.
- Menunggu atau mengarang SNI / pedoman Kepala BNPB di kode.
- POST ke sistem Destana nasional.
- Mencampur tiket ini dengan DATA-5 (katalog AN-8 memakai kunci `pkd`; jangan menambah kunci Destana 7/2025 di seed G4).

### 6. Tiket pelaksana kemudian (jangan didaftarkan di Gelombang 4)

Setelah G4 selesai dan koordinator membuka gelombang baru:

- DATA: migrasi `destana_si` + `destana_aktivitas` (berkas baru).
- BE: CRUD `admin_desa` scoped `kode_desa_kelurahan`; baca kab/prov.
- FE: label instrumen transisi; formulir 17 aktivitas; jangan ganti kuesioner PKD.

## Bacaan ulang sebagai implementer

Huruf a–q dan peta 32 indikator cukup untuk seed/UI. Tidak ada rumus. `penilaian_rujukan` menunjuk PKD lama, bukan skor baru. NIK fasilitator dilarang.

## Bukti

Tulisan murni. Tidak ada perubahan `src/`.

## Bacaan ulang bukti versus kriteria

- [x] 32 indikator terpetakan
- [x] 17 huruf Pasal 8 terkunci
- [x] Lima field SI Pasal 20 terkunci
- [x] Rumus PKD dilarang diubah
- [x] Tidak ada tiket G4 Destana

## Keputusan

selesai — naskah `siap-kode` untuk gelombang kemudian
