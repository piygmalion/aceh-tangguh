# DATA-kode-scheme — usulan (tanpa migrasi)

Status: **usulan**. Tidak ada perubahan data, id, tile, atau Supabase di PR ini. Skema kanonik diputuskan Pygmalion.

## Temuan

Repo memakai lebih dari satu skema kode kabupaten Aceh:

- **BPS** (urutan BPS, Simeulue = 1101): `kode_kab` di `public/fixtures/boundaries-aceh-kab.geojson` (GADM 4.1, `gadm-kab`) dan kunci `village-r3p.pmtiles` (sejak #39).
- **Kemendagri** (urutan Permendagri, Aceh Selatan = 11.01): `kode_kab`/`kode_kabupaten` di `public/fixtures/areas/r3pDistribution.geojson`, `adm2` di `public/fixtures/aceh-kabupaten-registry.json`, dan `area_feature_meta.id`.
- **Catatan:** `kode_sik` di registry **bukan** BPS walaupun metadata-nya menulis `kode_bps`. Nilainya mengikuti urutan Kemendagri, kecuali empat pasang yang tertukar (Tamiang, Jaya, Langsa, Lhokseumawe; lihat `metadata.catatan` di registry). Jadi `kode_sik` sebaiknya diperlakukan sebagai skema ketiga (SIK/PRRPKA), bukan alias BPS.

15 dari 23 kab punya kode berbeda antara batas (BPS) dan r3p (Kemendagri). Saat ini tidak ada join lintas file lewat `kode_kab`, jadi belum ada yang rusak. Join baru lewat `kode_kab` akan salah untuk 15 kab tersebut.

## Tabel pemetaan (23 kab, dari registry + fixture di `70785ab`)

| nama | BPS (`boundaries` kode_kab) | `kode_sik` registry | Kemendagri (`adm2` registry) | r3p `kode_kab` | BPS vs r3p |
| --- | --- | --- | --- | --- | --- |
| Aceh Selatan | 1103 | 1101 | 11.01 | 1101 | beda |
| Aceh Tenggara | 1104 | 1102 | 11.02 | 1102 | beda |
| Aceh Timur | 1105 | 1103 | 11.03 | 1103 | beda |
| Aceh Tengah | 1106 | 1104 | 11.04 | 1104 | beda |
| Aceh Barat | 1107 | 1105 | 11.05 | 1105 | beda |
| Aceh Besar | 1108 | 1106 | 11.06 | 1106 | beda |
| Pidie | 1109 | 1107 | 11.07 | 1107 | beda |
| Aceh Utara | 1111 | 1108 | 11.08 | 1108 | beda |
| Simeulue | 1101 | 1109 | 11.09 | 1109 | beda |
| Aceh Singkil | 1102 | 1110 | 11.10 | 1110 | beda |
| Bireuen | 1110 | 1111 | 11.11 | 1111 | beda |
| Aceh Barat Daya | 1112 | 1112 | 11.12 | 1112 | sama |
| Gayo Lues | 1113 | 1113 | 11.13 | 1113 | sama |
| Aceh Tamiang | 1114 | 1114 | 11.16 | 1116 | beda |
| Nagan Raya | 1115 | 1115 | 11.15 | 1115 | sama |
| Aceh Jaya | 1116 | 1116 | 11.14 | 1114 | beda |
| Bener Meriah | 1117 | 1117 | 11.17 | 1117 | sama |
| Pidie Jaya | 1118 | 1118 | 11.18 | 1118 | sama |
| Banda Aceh | 1171 | 1171 | 11.71 | 1171 | sama |
| Sabang | 1172 | 1172 | 11.72 | 1172 | sama |
| Langsa | 1173 | 1173 | 11.74 | 1174 | beda |
| Lhokseumawe | 1174 | 1174 | 11.73 | 1173 | beda |
| Subulussalam | 1175 | 1175 | 11.75 | 1175 | sama |

## Usulan

1. `kode_kab` dan `area_feature_meta.id` **tetap seperti sekarang**. Tidak ada migrasi id.
2. Tambahkan secara additive `kode_bps` dan `kode_kemendagri` di respons `/api/boundaries` dan `/api/layers/areas/[key]` (dikerjakan Backend nanti, PR terpisah).
3. **Kemendagri kunci join; BPS field tambahan di batas kab.** Join memakai kode Kemendagri. BPS tetap field tambahan pada batas kabupaten, bukan kunci join.
4. Join antar-skema hanya lewat registry di server (`aceh-kabupaten-registry.json`, diperluas dengan kolom `kode_bps` eksplisit), bukan aritmetika kode. Klien tidak perlu tahu ada dua skema.
5. Perbaiki label metadata `kode_sik` di registry (bukan BPS) ketika registry diperluas.

**Catatan:** `kode_sik` jangan dipakai untuk join sampai 4 pasangan tertukar di registry (Tamiang↔Aceh Jaya, Langsa↔Lhokseumawe) dibetulkan.

## Keputusan yang dibutuhkan

- Pygmalion: skema kanonik jangka panjang (BPS atau Kemendagri) untuk data baru.
