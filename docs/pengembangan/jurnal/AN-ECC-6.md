# AN-ECC-6 — naskah konsep caching

Agent: ecc
Gelombang: ECC-CACHE
Status: selesai

## Niat

- Tujuan: Menyatukan cara Aceh Tangguh menyimpan dan membaca umpan hidup, prakiraan, dan fixture — tanpa menambah Redis data cache, tanpa mengulang BE-4/BE-8, tanpa DATA-4.
- Berkas: jurnal ini; `docs/pengembangan/07-konsep-caching.md`; baris STATUS gelombang ECC-CACHE; sunting tipis `00-protokol.md`, `05-ecc.md`, `02-backend.md`, `04-analis.md`.
- Langkah: search-first di repo + codegraph overlay/maritim/PD; tulis empat lapisan L0–L3; baca ulang versus kriteria.
- Cara membuktikan: setiap lapisan punya berkas sumber; keputusan Adopt/Jangan tercatat; `src/` tidak berubah.
- Risiko: merancang ulang overlay live; menggabungkan cuaca resmi/inovasi; memakai Upstash sebagai store overlay.

## Bacaan ulang niat

Skema, bukan kode aplikasi. Empat agent wilayah tetap. C1 (GET PD baca L1) = AN-51 / BE-37 / AN-52 — jangan dikode dari tiket AN-ECC-6. Jangan memakai AN-47 untuk C1. Jangan menimpa G36. DATA-4 tertahan.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `docs/pengembangan/07-konsep-caching.md` | Empat lapisan, matriks baca, C1/C2 ditahan |
| `docs/pengembangan/STATUS.md` | Gelombang ECC-CACHE |
| `docs/pengembangan/00-protokol.md` | Baris gelombang ECC-CACHE |
| `docs/pengembangan/05-ecc.md` | Pointer AN-ECC-6 |
| `docs/pengembangan/02-backend.md` | Pointer konsep; C1 jangan dikode dulu |
| `docs/pengembangan/04-analis.md` | Pointer AN-45 usulan |
| `docs/pengembangan/jurnal/AN-ECC-6.md` | Jurnal ini |

`src/` tidak berubah.

## Bukti

Search-first (repo + codegraph; npm tidak menambah paket; Context.dev web-search dilewati — kuota habis; Next Data Cache memakai API yang sudah di `next@14.2.35`):

- L1: `overlay_live_features` / `overlay_live_refresh` (`overlay-live.ts`); `maritime_forecast_cache` (`maritime.ts`); `maritime_warning_cache` (BE-32); `weather_forecasts`; purge `20260913` + `20260928`.
- L2: `unstable_cache` di cuaca, maritim, DIBI, MAGMA, Sipongi, Tatonas. `revalidateTag("maritime-perairan")` di cron overlay; `revalidateTag("weather")` di refresh cuaca. Tag `peringatan-*` **tidak** di-revalidate cron.
- L3: `qk.overlay` di `MapOverlays`; staf `cache: "no-store"`.
- L0: `let cache` fixture di `anggaran.ts`, `kejadian.ts`, `publikasi.ts`, `markers.ts`, `irbi-by-kab.ts`, ringkasan R3P/PRRPKA, `panduan/knowledge.ts`.
- Bukan cache data: `@upstash/redis` hanya `rate-limit.ts`.
- Kontrak HTTP: AN-5 / AN-28 tidak diubah.

Keputusan: Adopt L1 Postgres + L2 Next tags. Jangan Redis overlay. Jangan paket cache baru.

## Bacaan ulang bukti versus kriteria

- [x] Riset lapisan ada sumber berkas
- [x] Skema punya L0–L3, matriks baca, larangan
- [x] `src/` tidak berubah
- [x] DATA-4 / Juklak / POST nasional / merge cuaca tidak dibuka
- [x] C1 tidak dikode

## Keputusan

selesai
