# Dokumentasi SIK Aceh

Indeks berkas yang sudah ada. Path di bawah tidak dipindah: banyak rujukan di kode, Actions, uji, dan jurnal memakai path persis ini. `docs/vercel.md` juga disebut aturan env repositori.

`public/docs/` bukan folder ini. Isinya PDF yang disajikan situs (`Kepgub_Renduk_PRRPKA_26-28.pdf`).

## Operasi

| Berkas | Isi |
| --- | --- |
| [vercel.md](vercel.md) | Deploy Vercel, nama env, URL cron. Tanpa nilai secret |
| [admin-setup.md](admin-setup.md) | Konsol staf `/id/admin` dan migrasi auth |
| [laporan-production.md](laporan-production.md) | Laporan masyarakat di produksi |
| [basemap.md](basemap.md) | PMTiles Aceh, Sentinel, dan ubin overlay |
| [../SECURITY.md](../SECURITY.md) | Lapor kerentanan dan daftar periksa produksi |
| [../security/attack-surface.md](../security/attack-surface.md) | Inventaris halaman dan API. Path dibaca uji |
| [security/strix.md](security/strix.md) | Runbook Strix Cloud |
| [../security/strix-instructions.md](../security/strix-instructions.md) | Aturan engagement |
| [../security/strix-baseline.md](../security/strix-baseline.md) | Status baseline |

Dua folder keamanan sengaja terpisah. `security/` di root menyimpan inventaris yang dikunci uji. `docs/security/` menyimpan runbook operator.

## Pengembangan

| Berkas | Isi |
| --- | --- |
| [pengembangan/00-protokol.md](pengembangan/00-protokol.md) | Protokol tiket dan larangan data |
| [pengembangan/STATUS.md](pengembangan/STATUS.md) | Status tiket |
| [pengembangan/01-data.md](pengembangan/01-data.md) sampai [05-ecc.md](pengembangan/05-ecc.md) | Wilayah agent |
| [pengembangan/06-skema-kerapian.md](pengembangan/06-skema-kerapian.md) | Skema kerapian data, tampilan, dan backend |
| [pengembangan/07-konsep-caching.md](pengembangan/07-konsep-caching.md) | Konsep cache |
| [pengembangan/visual/SPEK-TERKUNCI.md](pengembangan/visual/SPEK-TERKUNCI.md) | Spesifikasi visual yang dikunci |
| [pengembangan/jurnal/](pengembangan/jurnal/) | Jurnal tiket. Jangan ditulis ulang hanya untuk mengganti path |

## Data dan keputusan

| Berkas | Isi |
| --- | --- |
| [opendata-aceh-quality.md](opendata-aceh-quality.md) | Putusan: portal OpenData Aceh tidak dipakai sebagai sumber SIK |
| [playbook-analisis-sistem-kebencanaan.md](playbook-analisis-sistem-kebencanaan.md) | Playbook analis, bukan tiket kode |
| [../data/sik/README.md](../data/sik/README.md) | Berkas lokal Data Kejadian BPBA (`sik_aceh.db`, tidak di-commit) |
| [../scripts/sik/SCHEMA.md](../scripts/sik/SCHEMA.md) | Pemetaan kolom impor |
| [../data/drive-clean/README.md](../data/drive-clean/README.md) | Salinan kerja sheet |

## Uji, manual, agen

| Berkas | Isi |
| --- | --- |
| [testing/](testing/) | Naskah uji tiket (`*.tdd.md`) |
| [manual/](manual/) | Sumber manual dan gambar |
| [agents/skills/](agents/skills/) | Salinan prosedur agen. Atribusi di [agents/skills/ATRIBUSI.md](agents/skills/ATRIBUSI.md) |
| [../AGENTS.md](../AGENTS.md) | Konteks agen di repo ini |
| [../.github/workflows/](../.github/workflows/) | `ci.yml` (job `quality`) dan cron penyegaran |

## Catatan ubin

`public/tiles/aceh-osm.pmtiles` terlacak git, bersama `irbi-2025.pmtiles`, `kecamatan-r3p.pmtiles`, dan `village-r3p.pmtiles`. Kalimat di `scripts/basemap/README.md` yang menyebut berkas OSM itu diabaikan git tidak sesuai dengan pohon yang di-commit. Jangan menghapus arsip yang sudah terlacak.
