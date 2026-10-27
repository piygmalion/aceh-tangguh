# DATA-marker-kab — daftar review

Status: **draft, read-only**. Tidak ada koordinat marker yang diubah di PR ini (**0 koordinat diubah**). Tidak menyentuh Supabase.

Basis: batas kab dari #130 (`70785ab`), `public/fixtures/markers.geojson` (4.599 marker). Detail per baris: [`review.csv`](review.csv).

## Ringkasan

| kelompok | jumlah | keterangan |
| --- | ---: | --- |
| `mismatch` — kab tersimpan ≠ poligon tempat titik jatuh | 156 | shapely `covers`, tanpa toleransi |
| ↳ `coord_wrong` | 138 | kecamatan/desa marker menunjuk kab tersimpan → koordinat yang salah |
| ↳ `undetermined` | 18 | bukti tidak cukup (15 disasterEvents, 2 facEducation, 1 infraRoadBridge) |
| ↳ `kab_wrong` | 0 | tidak ada kasus kab tersimpan yang salah |
| ↳ koordinat terpotong (`coord_quality=truncated_integer` / 1 desimal) | 91 | prioritas koreksi |
| `outside_all` — di luar ke-23 poligon | 158 | 65 < 1 km dari kab tersimpan, 36 1–10 km, 57 ≥ 10 km |

Dengan toleransi tepi 20 m (`scripts/check-marker-kab-pip.py`): 154 mismatch, 154 outside_all, 6 lolos sebagai titik di garis batas (kolom `pip_20m`).

## Kolom CSV

`group`, `id`, `layer`, `title`, `lon`, `lat`, `stored_kab`, `geom_kab`, `cls`, `evidence` (`kec:`/`desa:` = kab tempat nama kecamatan/desa itu ada; `nearest:` untuk outside_all), `kecamatan`, `desa`, `dist_km` (jarak titik ke poligon kab tersimpan), `coord_quality`, `pip_20m`.

## Sumber bukti — wajib dikonfirmasi

Bukti kecamatan/desa berasal dari salinan Google Sheet profil desa di box (`/workspace/profil-sheet.csv`), **bukan** dari Supabase. Sebelum koreksi apa pun diterapkan, cocokkan dengan tabel Supabase `profil_desa`.

## Koordinat pengganti

Tidak ada. Repo tidak memiliki titik pusat desa/kecamatan atau koordinat resmi per fasilitas yang bisa dikutip, dan tidak ada sumber resmi yang dikutip di PR ini. Sesuai aturan, koordinat tidak ditebak:

- 91 titik terpotong: butuh koordinat dari sumber asli (Dapodik/Kemendikbud untuk sekolah, SIK/ASPAK untuk faskes, data Polda untuk `policeOffices`, dsb.) sebelum diubah.
- 18 `undetermined` + 158 `outside_all`: daftar review manual, bukan untuk dikoreksi otomatis.

## Cek CI

`python3 scripts/check-marker-kab-pip.py [--csv out.csv] [--tolerance-m 20] [--strict]` — report-only, exit 0 kecuali `--strict`. Langkah CI `continue-on-error: true`; Basemap boleh mengambil alih/menyempurnakan.
