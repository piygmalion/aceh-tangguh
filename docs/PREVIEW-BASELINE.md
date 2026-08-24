# Baseline preview — salinan lokal Aceh Tangguh

Diuji 24 Agustus 2026 dari folder kerja **`Aceh tangguh`** (`npm install` + `npm run dev`, tanpa kunci Supabase). Mode data: fixture / fallback.

Server: `http://127.0.0.1:3000` → `/id`.

## Yang sudah jalan

| Rute | Status | Isi yang terlihat |
|------|--------|-------------------|
| `/id` | OK | Hero, 3 kejadian aktif / 656 posko / 0 laporan 24 jam, status hazard, cuaca 23 kab, klaster, R3P, teaser peta, partisipasi, footer |
| `/id/peta` | OK | MapLibre + marker kejadian/faskes + panel layer (3 layer default) + choropleth distribusi desa |
| `/id/lapor` | OK | Hub dua kartu: kejadian & penanganan |
| `/id/lapor/kejadian` | OK | Pilih jenis bencana, form render |
| `/id/lapor/penanganan` | OK | GPS, kab/kec/desa, identitas pelapor |
| `/id/data-bencana` | OK | 427 kejadian, 13 jenis, dampak RR/RS/RB, filter, tabel, ekspor CSV/JSON/KML |
| `/id/anggaran-bencana` | OK | APBA ~Rp 176,2 M / 24 kegiatan / 91 baris, grafik fase |
| `/id/publikasi` | OK | 9 dari 9 artikel + tag filter |
| `/id/sumber-data` | OK | Inventaris dataset (kejadian, faskes, sekolah, …) |
| `/id/metodologi` | OK | Agregasi R3P, normalisasi nama, matching desa, tercile |
| `/id/admin/login` | OK | Form email/password Supabase Auth (belum login) |
| `/en` | OK | Nav + hero terjemahan Inggris |
| Mobile ~390px | OK | Hamburger + menu overlay |

API fixture (contoh): `GET /api/kejadian` → `total: 427`, `source: "fixture"`. `GET /api/stats/live` → `source: "fallback"`. Katalog layer: 15 item.

## Catatan untuk development berikutnya

1. **Tanpa `.env.local` isi Supabase**, POST laporan / admin / profil desa live tidak aktif. Isi `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` jika mau backend.
2. **Breadcrumb beberapa halaman salah** (mis. data-bencana menampilkan “Beranda · Peta”; publikasi menampilkan jejak anggaran).
3. Chart Recharts di data-bencana sempat kosong sejenak lalu terisi — cek hydration/ukuran kontainer jika masih terjadi.
4. Footer masih “Placeholder BPBD / Kominsa Aceh — brand final TBD”.
5. Jangan push ke GitHub sampai fitur yang dikerjakan sudah final.

## Cara menjalankan lagi

```bash
cd "Aceh tangguh"
npm install          # atau bun install
cp .env.example .env.local
npm run dev          # http://localhost:3000
```
