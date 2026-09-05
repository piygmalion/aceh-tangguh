# OpenData Aceh — tidak dipakai sebagai sumber SIK

Putusan 4 September 2026. Portal [data.acehprov.go.id](https://data.acehprov.go.id/) **tidak diintegrasikan** ke SIK Aceh Tangguh (`kejadian_operasi`, `kejadian_dampak`, `kejadian_lokasi`, `laporan_*`). Tidak ada schema `opendata`, tidak ada ETL katalog/DataStore, tidak ada overwrite `krb_*` atau `kejadian_*`.

SIK dan peta tetap memakai sumber yang sudah ada: DIBI, kejadian/fasilitas operasional, IRBI BNPB 2025, overlay BMKG/InaRISK. Seed IRB 2024 OpenData di `krb_kabupaten` **tetap**; join lewat **nama kabupaten**, bukan kode CSV — lihat catatan `opendata-aceh-irbi-2024` di `scripts/build-krb-aceh.mjs`.

Jangan mengusulkan ulang ingest SIK dari portal ini tanpa uji DataStore baru yang membuktikan kode wilayah dan grain sudah diperbaiki di sumber.

## Ringkasan uji

Portal adalah CKAN (~4.175 dataset, CC-BY). API Action hidup: `package_search`, `datastore_search`. Hampir semua resource kebencanaan `datastore_active: true`. **Akses API bukan masalah.** Kualitas isi yang gagal.

Grup CKAN `kebencanaan`: 90 dataset (BPBA 82, BPS 5, Dinsos 2, Dinas Pengairan 1). 69 dari 90 adalah eWalidata indikator provinsi.

Sampel diambil 4 September 2026 lewat `GET https://data.acehprov.go.id/api/3/action/datastore_search` (tanpa unduh CSV).

## 1. Kode kabupaten rusak (penghalang keras)

Join ke wilayah SIK lewat `kemendagri_kode_*` **akan menukar kab/kota**.

| Dataset | Resource | Temuan |
|---|---|---|
| Jumlah Desa Terdampak Bencana | `a9a8635f-a230-45d7-a94f-6b2ef2ced846` | Kode `"11.1"` dipakai untuk **Aceh Selatan dan Aceh Singkil** pada tanggal yang sama (4 Jan 2017). Nama `"Kabupaten Anagan Raya"` (typo Nagan Raya). 2.807 baris. |
| Jumlah Penduduk Terdampak Bencana | `8fecc3b8-0b8a-4a57-a3e3-95e216496ac7` | Kode `"11.10"` dipakai untuk **Aceh Selatan** (kode itu milik Aceh Singkil) dan juga Aceh Singkil. 2.250 baris. |
| Indeks Ketahanan Daerah (IKD) | `2520bced-b191-4ea1-aa2f-88c13dd54666` | Kolom kode bertipe numeric → `11.10` jadi `11.1` (Aceh Singkil). 23 baris, 2023. |
| IRB / IKD | IRB `4012aa22-eda2-46c0-aaf4-1ed124e6e85a` | `"Kota Langsa "` trailing space. |
| Jumlah Kejadian Bencana Alam (BPS) | `7f9bc5a6-485c-42ac-9325-f1cc6082cc43` | Kode **BPS** (`1101` = Simeulue), bukan Kemendagri (`11.01` = Aceh Selatan). Sampel `jumlah_kejadian: null`. 1.610 baris. |

Mencampur kode BPS dan Kemendagri menukar 23 kab. Peringatan yang sama sudah ada di seed KRB: *join IRB lewat nama, bukan kode CSV yang tertukar*.

## 2. Grain tidak cocok SIK

`kejadian_operasi` butuh kejadian bernama, waktu, desa, koordinat, status. OpenData memberi agregat atau log kabupaten.

- **Matriks termasuk nol.** `jumlah-bencana-menurut-kejadian` (`7c05fc88-957d-461e-9beb-65cf650d0490`, 1.656 baris): kab × 12 jenis bahaya × tahun, banyak `jumlah_kejadian: 0`. Label `"Banjir "` (spasi), `"Banjir dan Longsor"` sebagai jenis terpisah. `jumlah-bencana-menurut-bulan` (`f08a755c-d40e-458f-9b7e-3e0ee4aaae8b`, 3.036 baris): matriks yang sama per bulan.
- **Log kab tanpa desa/GPS.** Rumah rusak (`b2eedf04-2a2e-45e9-9793-1dcd0864a602`, 1.250 baris) dan meninggal/hilang (`8f434208-bb28-4310-8f4e-d76ab77156f8`, 1.463 baris): tanggal `DD/MM/YYYY`, grain kabupaten, banyak dampak 0, duplikat (dua Banjir Aceh Barat 30/03/2020, keduanya 0 rumah).
- **“Jumlah Desa Terdampak” = hitungan**, bukan daftar desa. Tidak ada `kode_desa` / nama gampong.
- Tidak bisa di-upsert ke SIK tanpa mengarang lokasi dan identitas kejadian.

## 3. eWalidata hampir kosong

69 dataset BPBA di grup kebencanaan adalah indikator eWalidata (dokumen, orang, unit). CSV 143–319 byte, grain provinsi × tahun.

Contoh dokumen R3P (`e21a12ee-8912-4e2b-9ad8-91f3cd470614`): 8 baris 2017–2024, `jumlah` = 1 di 2017 lalu **0**. Tidak merepresentasikan kapasitas operasional; Aceh Tangguh sudah punya jalur R3P sendiri.

## 4. Deret waktu IRB tidak andal

IRB (`4012aa22-eda2-46c0-aaf4-1ed124e6e85a`): 230 baris ≈ 23 kab × 2015–2024. Nilai 2015 dan 2016 identik untuk hampir semua kab. Aceh Selatan **171.2 dari 2015 masih 171.20 di 2024**; Simeulue 162.00 tidak bergerak. Sebagian kab baru berubah di 2024. Bukan deret pengukuran tahunan yang bersih.

Baris 2024 (kode teks `"11.01"` selaras nama) adalah subset yang sudah di-seed KRB lewat **nama**.

## 5. Bukan data hidup

Agregat tahunan/semester. Korban Dinsos (`377c38bd-3357-483e-aa6f-360e7541762b`): 46 baris, 2022 semester I–II saja. Bukan pengganti DIBI live atau overlay BMKG.

## Yang lolos QA sempit (tetap bukan SIK)

- **IRB 2024** 23 kab, kode teks `"11.01"` konsisten dengan nama — sudah di `krb_kabupaten` / `krb_dokumen` id `opendata-aceh-irbi-2024`.
- **IKD 2023** 23 kab, nilai 0.29–0.61 — join **wajib lewat nama**; tidak diingest.
- **IDM frekuensi bahaya desa 2024** (di luar grup kebencanaan): `1101` + desa `1101012001` Keude Bakongan = pola Kemendagri padat, bukan kode BPS. Survei desa, bukan kejadian SIK. Tidak diingest.

## API vs unduh

`datastore_search` bisa. Mengunduh CSV tidak memperbaiki kode tertukar, matriks nol, atau eWalidata kosong.

## Yang tidak dikerjakan

Tidak: migrasi schema `opendata`, harvest 4.175 paket, ETL DataStore, view silang baru ke `krb_kabupaten`, perubahan loader peta/toolbar.
