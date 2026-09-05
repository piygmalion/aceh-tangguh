# BE-1 — kegagalan overlay bukan keberhasilan kosong

Agent: backend
Gelombang: 1
Status: selesai

## Niat

- Tujuan: Klien harus bisa membedakan "tidak ada kejadian" dari "sumber mati". Galat tak tertangani dan sumber live yang gagal tanpa cache sah tidak boleh tampak sebagai FeatureCollection kosong sukses (HTTP 200 tanpa `stale`).
- Berkas:
  - `src/app/api/overlay/[key]/route.ts` — ubah `catch` 200 → 503; cabang live memakai hasil yang membedakan gagal/kosong.
  - `src/lib/overlay-live.ts` — tipe hasil live (sukses / stale-cache / gagal) tanpa memindahkan scrape ke cron.
  - `src/lib/overlay-live.test.ts` — uji pemetaan hasil → status/badan, tanpa jaringan.
- Langkah:
  1. Ekstrak fungsi murni yang memetakan "live gagal + ada/tidak cache" ke `{ status, body }`. Gagal tanpa cache → HTTP 503, `FeatureCollection` kosong, `stale: true`, `error: "upstream"`. Ada cache (meski kedaluwarsa) → HTTP 200 + `stale: true` + fitur cache.
  2. `loadOverlayLive` tidak lagi menelan galat lalu mengembalikan koleksi kosong. Sukses (termasuk nol fitur Aceh) → 200 tanpa `stale`. Gagal → baca `overlay_live_features` untuk `layer_key` itu; pakai baris yang ada sebagai stale; jika tidak ada baris → gagal upstream.
  3. BMKG: gagal hanya jika semua endpoint TEWS gagal (bukan 200). Satu endpoint hidup dengan daftar gempa kosong = kosong sah.
  4. MAGMA gunung: jangan menelan galat menjadi `[]`.
  5. `catch` di rute: selalu 503 + badan di atas. Cabang fixture statis (`loadOverlayVector`, pelabuhan, perairan) tetap 200 jika koleksi kosong; jangan menandai `stale` hanya karena kosong.
  6. Tidak menambah kolom `expires_at` (itu DATA-1). Cache "ada" = ada baris untuk layer itu. Tidak mengubah `tatonas/service.ts` (di luar wilayah); Tatonas yang sudah menelan galat ke `[]` tidak dipaksa jadi 503 di sini.
- Cara membuktikan:
  - Uji unit: gagal tanpa cache → 503 + `stale` + `error: "upstream"`; gagal dengan cache → 200 + `stale`; sukses kosong → 200 tanpa `stale`/`error`.
  - Baca `route.ts`: `catch` memakai status 503, bukan 200.
  - Cabang `inariskSumateraFault` / `inariskMegathrust` / `seismicSensors` tetap `fc ?? { type, features: [] }` tanpa `stale`.
  - `npx tsc --noEmit` dan `npm test`.
- Risiko:
  - Tanpa `expires_at`, cache lama tetap dilayani sebagai 200 stale — sesuai brief, bukan 503.
  - Tatonas tetap bisa tampak kosong jika `loadTatonasMarkerFeatures` menelan galat (wilayah lain). Tidak diisi tebakan.
  - Frontend gelombang 1 belum wajib menampilkan 503 (FE-3 menunggu BE-1).

## Bacaan ulang niat

Niat bisa dijalankan tanpa menebak data resmi. "Cache sah" di sini = baris `overlay_live_features` untuk layer itu ada; bukan TTL baru. Kosong sah hanya dari fetch yang berhasil. `catch` rute dan `loadOverlayLive` yang menelan galat adalah dua jalur yang sama-sama harus berhenti menyamar sebagai 200 kosong. Tidak menyentuh cron, migrasi, atau komponen peta.

## Perubahan

| Berkas | Perubahan |
| --- | --- |
| `src/lib/overlay-live.ts` | Tipe `OverlayLiveResult`; `loadOverlayLive` tidak menelan galat menjadi koleksi kosong; BMKG gagal jika semua TEWS mati; MAGMA gunung tidak menelan galat; fallback cache `overlay_live_features`. |
| `src/app/api/overlay/[key]/route.ts` | `catch` → 503 + `error: "upstream"`; cabang live memakai `result.status`. Cabang fixture statis tidak berubah. |
| `src/lib/overlay-live.test.ts` | Uji gagal/kosong/stale dan `catch` bukan 200. |

## Bukti

`catch` di `src/app/api/overlay/[key]/route.ts` kini `NextResponse.json(OVERLAY_UPSTREAM_FAILURE_BODY, { status: 503 })`. Badan: `{ type: "FeatureCollection", features: [], stale: true, error: "upstream" }`. Bukan 200.

Cabang fixture `inariskSumateraFault` / `inariskMegathrust` / `seismicSensors` tetap `fc ?? { type, features: [] }` tanpa `stale`.

`loadOverlayLive` mengembalikan `OverlayLiveResult`. Sukses (termasuk nol fitur) = 200 tanpa `stale`. Gagal + cache = 200 `stale: true`. Gagal tanpa cache = 503 + `error: "upstream"`. BMKG melempar jika semua TEWS mati. MAGMA gunung tidak menelan galat.

```
node --import tsx --test src/lib/overlay-live.test.ts
# tests 4, pass 4
npx tsc --noEmit
# exit 0
```

`npm test` penuh dijalankan setelah BE-3.

## Bacaan ulang bukti versus kriteria

- [x] `catch` di `api/overlay/[key]` tidak lagi membalas 200 untuk galat tak tertangani.
- [x] FeatureCollection kosong tanpa `stale` hanya untuk data sah yang memang kosong (`overlayLiveOk([])` tidak menyetel `stale`; fixture statis tidak berubah).
- [x] `npx tsc --noEmit` lulus. `npm test` 218 lulus (termasuk `overlay-live.test.ts`).

## Keputusan

selesai
