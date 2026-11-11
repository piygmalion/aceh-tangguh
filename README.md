# SIK Aceh

**SIK Aceh** (Sistem Informasi Kebencanaan Aceh) adalah aplikasi web untuk peta, peringatan dini, dan laporan kejadian di Aceh.

Nama repositori dan paket tetap `aceh-tangguh`. Situs publik: [https://aceh-tangguh.vercel.app](https://aceh-tangguh.vercel.app). Label tampilan untuk token sumber `sik_aceh.db` adalah **Data Kejadian BPBA**. Id katalog `sik-aceh`, berkas `data/sik/sik_aceh.db`, dan prefiks id kejadian `SIK-` tidak diubah.

## Arsitektur singkat

Aplikasi berjalan sebagai Next.js di Vercel (region `sin1`). Perintah instal dan build di `vercel.json` adalah `npm ci` dan `npm run build`. Locale selalu berprefiks: `id` (bawaan) dan `en`.

Halaman ada di `src/app/[locale]`. Rute API ada di `src/app/api` (tanpa prefiks locale). Salinan antarmuka ada di `messages/id.json` dan `messages/en.json`.

Data domain (kejadian, lapisan, publikasi, laporan) dibaca dari Supabase proyek `whojoxrbcdyotrpolgav` bila env terpasang. Geometri tidak disimpan di PostGIS: poligon dan titik ada di `public/fixtures`, ubin vektor di `public/tiles`. Jika env kosong, kueri gagal, atau tabel kosong, loader jatuh ke fixture. Fixture staf (anggaran, PRRPKA) ada di `data/staff` dan hanya untuk sesi staf.

Peta memakai MapLibre, react-map-gl, dan PMTiles. `vercel.json` tidak memasang cron. Penyegaran terjadwal ada di GitHub Actions (`.github/workflows/`). Inventaris rute yang dipelihara: [`security/attack-surface.md`](security/attack-surface.md).

## Peta folder

| Path | Isi |
| --- | --- |
| `src/` | Aplikasi: halaman, API, komponen, `src/lib`, `src/i18n/routing.ts` |
| `messages/` | Salinan Bahasa Indonesia dan Inggris |
| `public/fixtures/`, `public/tiles/`, `public/media/` | Geometri, ubin, media. `public/docs/` hanya PDF yang disajikan situs, bukan pohon dokumentasi |
| `data/staff/` | Fixture staf |
| `data/sik/` | Petunjuk berkas lokal. `sik_aceh.db` tidak di-commit |
| `data/drive-clean/` | Salinan kerja sheet. Tidak ditulis ke Supabase dari folder ini |
| `scripts/` | Impor, ubin, cuaca, dan SIK. Path dipanggil `package.json` dan Actions |
| `supabase/migrations/` | Skema SQL. Berkas yang sudah ada tidak disunting |
| `.github/workflows/` | Job `quality` dan cron |
| `docs/` | Dokumentasi per topik. Indeks: [`docs/README.md`](docs/README.md) |
| `security/` | Inventaris permukaan dan aturan uji Strix. Path ini dibaca uji |
| `.cursor/` | Aturan dan skill agen Cursor |

Path berikut tidak dipindah karena dipakai Vercel, CI, cron, rute, env, atau uji: `vercel.json`, `docs/vercel.md`, `.env.example`, `.env.production`, `src/app/api/`, `src/i18n/routing.ts`, `scripts/*` yang disebut `package.json` atau workflow, dan `security/attack-surface.md`.

Ubin yang terlacak git: `public/tiles/aceh-osm.pmtiles`, `irbi-2025.pmtiles`, `kecamatan-r3p.pmtiles`, `village-r3p.pmtiles`. Scratch bangun ada di `public/tiles/_osm-src/` dan tidak di-commit.

## Menjalankan

Perlu Node 22 (`.nvmrc`). CI dan Vercel memakai npm serta `package-lock.json`. Berkas `bun.lock` ada di repo dan bukan jalur CI.

```bash
npm ci
npm run dev
```

Buka [http://localhost:3000/id](http://localhost:3000/id). Padanan Inggris: [http://localhost:3000/en](http://localhost:3000/en).

```bash
npm run build
npm run start
npm run lint
npm run typecheck
npm test
```

Salin `.env.example` ke `.env.local` untuk admin dan tulis laporan. Nama secret hanya ada di contoh itu. Jangan commit `.env.local`, kunci service role, atau token cron. Tanpa env, banyak loader memakai fixture.

Pratinjau publik adalah Vercel, bukan GitHub Pages. Jangan set `STATIC_EXPORT`, `GITHUB_PAGES`, atau `NEXT_PUBLIC_BASE_PATH` di proyek Vercel. Langkah env dan URL cron: [`docs/vercel.md`](docs/vercel.md).

## Rute yang sering dibuka

| Locale | Path |
| --- | --- |
| id | `/id` beranda, `/id/peta` peta, `/id/lapor` laporan |
| id | `/id/data-bencana`, `/id/analisis-data`, `/id/sumber-data`, `/id/metodologi` |
| id | `/id/admin` konsol staf (masuk di `/id/admin/login`) |
| en | `/en/disaster-data`, `/en/disaster-analysis`, `/en/data-sources`, `/en/methodology` |

Daftar halaman dan API yang lebih lengkap ada di [`security/attack-surface.md`](security/attack-surface.md). Path terlokalisasi dikunci di `src/i18n/routing.ts`.

## Kontribusi

1. Cabang dari `main` terbaru.
2. Jalankan `npm run lint`, `npm run typecheck`, dan `npm test` sebelum membuka PR.
3. Judul dan deskripsi PR dalam Bahasa Indonesia.
4. Jangan commit secret, fixture yang dihapus, atau `data/sik/sik_aceh.db`.
5. Jangan mengarang kode perangkat Tatonas, zona KRB, atau angka korban. Aturan data: [`docs/pengembangan/00-protokol.md`](docs/pengembangan/00-protokol.md).
6. Buka pull request. Jangan merge kecuali pemilik meminta.

Agen Cursor: [`AGENTS.md`](AGENTS.md).

## Dokumentasi

Indeks per topik: [`docs/README.md`](docs/README.md).

- Deploy dan nama env: [`docs/vercel.md`](docs/vercel.md)
- Admin staf: [`docs/admin-setup.md`](docs/admin-setup.md)
- Laporan produksi: [`docs/laporan-production.md`](docs/laporan-production.md)
- Basemap: [`docs/basemap.md`](docs/basemap.md)
- Data Kejadian BPBA (berkas lokal): [`data/sik/README.md`](data/sik/README.md)
- Protokol dan status tiket: [`docs/pengembangan/00-protokol.md`](docs/pengembangan/00-protokol.md), [`docs/pengembangan/STATUS.md`](docs/pengembangan/STATUS.md)
- Keamanan: [`SECURITY.md`](SECURITY.md), [`docs/security/strix.md`](docs/security/strix.md)
