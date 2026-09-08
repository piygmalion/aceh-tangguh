# Konsep caching Aceh Tangguh

Sumber: skill `search-first` + `aceh-ecc` (9 September 2026) atas pohon `src/`, `supabase/migrations/`, dan kontrak AN-4 / AN-5 / AN-19 / AN-28 / AN-36. Jurnal: [jurnal/AN-ECC-6.md](jurnal/AN-ECC-6.md).

Ini skema, bukan izin mengulang tiket yang sudah `selesai`. DATA-4, P2 Juklak, dan POST nasional tetap tertahan. Jalur cuaca resmi dan inovasi tetap terpisah (AN-24). Upstash Redis **bukan** cache data — hanya rate limit POST publik.

## Keputusan search-first

| Kebutuhan | Kandidat | Keputusan |
| --- | --- | --- |
| Sumber kebenaran umpan hidup | Tabel Postgres (`overlay_live_features`, `overlay_live_refresh`, `maritime_*_cache`, `weather_forecasts`) | **Adopt** — sudah kontrak GET baca / cron tulis |
| Memori GET panas di Vercel | `unstable_cache` + `revalidateTag` (Next 14 Data Cache) | **Adopt** — sudah dipakai cuaca, maritim, DIBI, PD |
| Cache lintas instance untuk overlay | `@upstash/redis` (sudah di `package.json`) | **Jangan** — Redis hanya `src/lib/security/rate-limit.ts` |
| Paket cache baru | `lru-cache`, `keyv`, Redis overlay | **Jangan** — menambah sumber kebenaran |
| Fixture JSON | `public/fixtures/**` + `let cache` modul | **Adopt** untuk data statis/disk; **bukan** untuk umpan hidup |

## Empat lapisan

```
Hulu (BMKG / MAGMA / Sipongi / Tatonas / DIBI / Open-Meteo)
        │  hanya cron / skrip ingest  (fetch cache: "no-store")
        ▼
L1  Postgres  — baris + expires_at + ledger overlay_live_refresh
        │  GET publik hanya SELECT
        ▼
L2  Next Data Cache  — unstable_cache(tag, revalidate detik)
        │  cron: revalidateTag setelah tulis L1
        ▼
L3  Browser  — TanStack Query (qk.overlay, qk.weather, …)
        │  staf/mutasi: fetch cache: "no-store"
        ▼
L0  Fixture  — jika L1 kosong atau hulu belum pernah sukses
```

`stale: true` adalah sinyal **L1 kedaluwarsa atau fallback**, bukan chip UI sembarang. Kontrak HTTP tetap AN-5 / AN-28: overlay hidup gagal tanpa baris = 503; sepi sah = 200 kosong tanpa `stale`.

## L1 — Postgres (sumber kebenaran)

| Tabel / objek | Penulis | Pembaca | TTL |
| --- | --- | --- | --- |
| `overlay_live_features` + `overlay_live_refresh` | `POST /api/cron/overlay-live` | `GET /api/overlay/{kunci-hidup}` | 2 jam (Tatonas: `TATONAS_STALE_MS`) |
| `maritime_forecast_cache` | cron overlay (`refreshMaritimeForecasts`) | GET overlay maritim | 2 jam `expires_at` |
| `maritime_warning_cache` | cron overlay (`refreshMaritimeWarnings`) | GET PD maritim + properti overlay | `expires_at` buletin |
| `weather_forecasts` | `POST /api/weather/refresh` (+ alias `/api/cron/weather`) | `GET /api/weather` | sama jendela overlay |
| `weather_inovasi_snapshot` | skrip/cron inovasi terpisah | `GET /api/weather/inovasi` | jangan merge tabel resmi |
| `purge_expired_overlay_rows()` | cron overlay setelah refresh | — | hapus `expires_at < now()`; `null` tidak dihapus |

Aturan:

1. Pengunjung **tidak** menulis L1 (AN-19, BE-16, BE-32).
2. Fetch hulu gagal **tidak** menghapus baris lama (BE-8).
3. `expires_at` null = belum kedaluwarsa (DATA-1).
4. Jangan memakai bbox sebagai cache kunci wilayah.

## L2 — Next Data Cache

Tag yang sudah ada (harus di-revalidate dari penulis L1):

| Tag | Pengisi `unstable_cache` | `revalidate` | Siapa yang `revalidateTag` hari ini |
| --- | --- | --- | --- |
| `maritime-perairan` | `getCachedAcehWaterForecasts` | 3600 s | cron overlay |
| `weather` | `getCachedForecasts` | 3600 s | refresh cuaca |
| `peringatan-magma` | `getCachedMagmaLive` | 600 s | **tidak** — GET masih scrape hulu |
| `peringatan-sipongi` | `getCachedSipongiLive` | 600 s | **tidak** — GET masih scrape hulu |
| `peringatan-tatonas` | `getCachedTatonasLive` | 600 s | **tidak** — GET masih scrape hulu |
| `dibi` | `getCachedDibiAceh` | 600 s | tidak (hulu publik + fixture) |
| `tatonas-dashboard-key` | kunci tanda tangan | 3600 s | bukan data overlay |

Fetch Data Cache HTTP: `next: { revalidate }` pada BMKG cuaca / Open-Meteo / Sentinel (6 jam). Umpan overlay di cron tetap `cache: "no-store"` agar ingest tidak memakai salinan CDN.

**Celah konsep (bukan tiket kode di naskah ini):** kartu PD MAGMA / Sipongi / Tatonas masih scrape pada GET lewat L2, sementara overlay peta untuk sumber yang sama sudah L1-only. Sasaran C1: GET PD membaca L1 (atau turunan yang sama) + cron `revalidateTag` tag `peringatan-*`. Jangan mengarang titik. Jangan DATA-4. Jangan menimpa G36 (AN-49 / BE-36 / FE-51 unggah CMS).

## L3 — klien

- Overlay peta: `qk.overlay(key)` dibagi toolbar dan vektor (FE-3).
- Staf, CMS, SIK mutasi: `cache: "no-store"`.
- Jangan `key={basemap}` pada peta (merusak cache MapLibre; `docs/basemap.md`).
- Ubin / PMTiles: CDN + `check:tiles`; bukan Redis.

## L0 — memori proses dan fixture

`let cache` di modul fixture (`anggaran`, `kejadian`, `publikasi`, `markers`, `irbi-by-kab`, `r3p-summary`, `prrpka-summary`, `panduan/knowledge`) sah: data disk, satu proses, tanpa TTL hulu.

Jangan pola itu untuk gempa/hotspot/prakiraan hidup — itu menelan 503 menjadi kosong.

## Matriks baca

| Permintaan | Sukses segar | Sukses sepi | Gagal + L1 ada | Gagal tanpa L1 |
| --- | --- | --- | --- | --- |
| Overlay hidup | 200, tanpa `stale` | 200 kosong, ledger `ok`+0 | 200 + `stale` | 503 + `error: "upstream"` |
| Overlay static / maritim | 200 | fixture + boleh `stale` | 200 + `stale` | 200 + `stale` + `[]` (AN-28) |
| Cuaca resmi | 200 BMKG/cached | — | baris L1 | fixture / Open-Meteo sesuai AN-24 |
| Cuaca inovasi | 200 `official: false` | `unconfigured` | snapshot | jangan isi suhu karangan |
| PD maritim | cache B | `unavailable` + `stale` | cache B stale | `unavailable` + `stale` (bukan 503 kartu) |
| Admin/staf GET | selalu segar | — | — | error, bukan daftar kosong palsu |

## Gelombang kemudian (jangan dikode dari tiket naskah)

Kerjakan hanya setelah AN-ECC-6 `selesai` di STATUS dan koordinator membuka baris tiket.

### ECC-C1 — GET PD sama dengan overlay (naskah analis dulu)

ID di bawah **bukan** AN-47 (keparahan vs katalog) dan **bukan** G36 (AN-49 / DATA-28 / BE-36 / FE-51 / AN-50).

| id | agent | isi |
| --- | --- | --- |
| AN-51 | analis | Kapan kartu MAGMA/Sipongi/Tatonas boleh `live` vs `stale` vs `unavailable`; jangan scrape GET; jangan DATA-4 |
| BE-37 | backend | GET `/api/peringatan-dini` baca L1; perkaya properties cron; `revalidateTag` `peringatan-*` |
| AN-52 | analis | Uji: GET tidak memanggil hulu; cron tetap `no-store`; `npm test` |

Jangan membuka kode BE-37 sebelum AN-51 `siap-kode`. Jangan menulis nilai secret. Jangan merge `/api/weather`. Jangan menimpa unggah `cms-media`.

### ECC-C2 — katalog tag (opsional)

Satu modul `src/lib/cache-tags.ts` (wilayah backend) yang mengekspor string tag. Jangan wrapper Redis. Jangan mengubah TTL overlay.

## Larangan

- Jangan cache PII laporan atau GPS unggahan.
- Jangan `force-cache` pada GET overlay hidup.
- Jangan purge baris dengan `expires_at` null.
- Jangan Upstash sebagai store overlay.
- Jangan mengulang BE-4 / BE-8 / BE-16 / BE-32.
