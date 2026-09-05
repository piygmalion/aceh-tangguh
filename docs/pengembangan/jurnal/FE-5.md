# FE-5 — fixture catalog + meta

Agent: frontend
Gelombang: 3
Status: selesai

## Niat

- Tujuan: Pratinjau statis tidak boleh 503 untuk `GET /api/layers/catalog` dan `GET /api/layers/meta/*`. Tanpa cabang di `public-api.ts`, kedua path jatuh ke `STATIC_UNAVAILABLE`.
- Berkas:
  - `src/lib/preview/public-api.ts` — dua cabang baru.
  - `src/lib/preview/public-api.test.ts` — uji 200, bukan 503.
- Tidak diubah: rute server `src/app/api/layers/**` (sudah punya fallback tanpa Supabase), `public/fixtures` (tidak mengarang berkas meta desa), Supabase, overlay-live.
- Langkah:
  1. `path === "/api/layers/catalog"` → `{ items: enabledMapLayersCatalog(), source: "catalog" }` — sama dengan fallback rute server tanpa Supabase. `mergeMapLayersCatalog` tidak dipakai di sini karena tidak ada baris remote pada pratinjau statis.
  2. `path` diawali `/api/layers/meta/` → potong `layerKey`. Jika kosong: 400 seperti rute server. Coba `GET /fixtures/layers/meta/${layerKey}.json` bila ada. Jika berkas tidak ada atau gagal: `{ items: [], layerKey, source: "fixture" }` status 200. Jangan mengisi nama desa/kabupaten dari tebakan.
  3. Jika berkas ada dan berbentuk array atau `{ items: array }`, pakai array itu apa adanya; selain itu anggap tidak ada berkas.
- Cara membuktikan:
  - `STATIC_EXPORT=1` + `fetchPublicApi("/api/layers/catalog")` status 200, `items` array, `source === "catalog"`, bukan 503. Isi sama `enabledMapLayersCatalog()`.
  - `fetchPublicApi("/api/layers/meta/villageDistribution")` status 200, `items: []`, `source: "fixture"`. Tidak ada field desa karangan.
  - `fetchPublicApi("/api/layers/meta/")` status 400.
  - Grep `resolveStaticGet`: kedua path ditangani sebelum `return jsonResponse(STATIC_UNAVAILABLE, 503)`.
  - `npm test` (PowerShell `;`).
- Risiko:
  - Mengarang meta desa dari GeoJSON area — dilarang; kosong jika tidak ada berkas.
  - `mergeMapLayersCatalog` tanpa remote tidak menambah apa pun vs `enabledMapLayersCatalog()`; memakai yang kedua agar tidak menyiratkan ada data Supabase.

## Bacaan ulang niat

Niat bisa dijalankan tanpa menebak data resmi. Catalog memakai fungsi lokal yang sudah ada (fallback rute server). Meta kosong + `source: "fixture"` jika tidak ada berkas — tidak 503, tidak mengarang desa. Tidak menyentuh rute server, Supabase, atau commit.

## Perubahan

| Berkas | Ubah |
| --- | --- |
| `src/lib/preview/public-api.ts` | cabang `/api/layers/catalog` (`enabledMapLayersCatalog`, `source: "catalog"`); cabang `/api/layers/meta/*` (berkas opsional, else `items: []` + `source: "fixture"`) |
| `src/lib/preview/public-api.test.ts` | tiga uji catalog/meta |

## Bukti

Putaran 1.

`STATIC_EXPORT=1` `fetchPublicApi("/api/layers/catalog")` → 200, `source: "catalog"`, `items` = `enabledMapLayersCatalog()`. Bukan 503.

`fetchPublicApi("/api/layers/meta/villageDistribution")` → 200, `items: []`, `source: "fixture"`, tidak ada `name`/`desa` karangan. Tidak ada berkas `public/fixtures/layers/meta/*`.

`fetchPublicApi("/api/layers/meta/")` → 400.

`node --import tsx --test src/lib/preview/public-api.test.ts` — tests 4, pass 4.

`npx tsc --noEmit` — exit 0. `npm test` — tests 266, pass 266, fail 0.

## Bacaan ulang bukti versus kriteria

- [x] Catalog pratinjau 200, bukan 503 — `source: "catalog"`, items lokal.
- [x] Meta pratinjau 200, items [] + source fixture jika tidak ada berkas.
- [x] Tidak mengarang meta desa — body hanya `items`, `layerKey`, `source`.
- [x] `npm test` 266/266.

## Keputusan

selesai
