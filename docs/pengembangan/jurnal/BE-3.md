# BE-3 — ringkasan marker sepadan dengan endpoint marker

Agent: backend
Gelombang: 1
Status: selesai

## Niat

- Tujuan: Angka ringkasan memakai sumber yang sama dengan daftar marker: fixture/DB marker + laporan peta + kejadian operasi + pengungsian. Bukan hanya `mergeLaporanOverlays`.
- Berkas:
  - `src/app/api/layers/markers/load-public.ts` — satu helper yang merangkai `loadMarkers` → `mergeLaporanOverlays` → `mergeOperasiDisasterEvents` → `mergePengungsianOverlays` (urutan sama dengan GET marker).
  - `src/app/api/layers/markers/route.ts` — memakai helper itu.
  - `src/app/api/layers/markers/summary/route.ts` — menghitung `total` / `byLayer` dari koleksi yang sama.
  - `src/lib/laporan/markers-summary.test.ts` — uji murni: penghitung layer melihat `disasterEvents` dan `tendPoints`, bukan hanya laporan.
- Langkah:
  1. Pindahkan rantai merge dari GET marker ke helper bersama. Tidak menambah endpoint.
  2. Summary memanggil helper yang sama, lalu menghitung per `properties.layer`.
  3. Fungsi hitung diekspor agar uji tidak membutuhkan Supabase.
- Cara membuktikan:
  - Baca kedua rute: keduanya memanggil `loadPublicMarkerCollection`.
  - Uji: koleksi dengan laporan + ops + pengungsian → `byLayer.disasterEvents` dan `byLayer.tendPoints` terisi; total = jumlah fitur.
  - `npm test` lulus.
- Risiko:
  - Helper hanya merangkai fungsi yang sudah ada di `sik/public` dan `laporan/peta-features`. Tidak menebak angka korban atau zona KRB.

## Bacaan ulang niat

Sepadan = rantai merge identik, bukan meniru angka. Summary tidak boleh berhenti di `mergeLaporanOverlays`. Endpoint baru tidak dibuat. Uji mengunci bahwa layer operasi dan pengungsian ikut terhitung.

## Perubahan

| Berkas | Perubahan |
| --- | --- |
| `src/app/api/layers/markers/load-public.ts` | Rantai `loadMarkers` → laporan → operasi → pengungsian. |
| `src/app/api/layers/markers/route.ts` | Memakai `loadPublicMarkerCollection`. |
| `src/app/api/layers/markers/summary/route.ts` | Menghitung dari koleksi yang sama. |
| `src/lib/laporan/markers-summary.ts` | Penghitung `total` / `byLayer`. |
| `src/lib/laporan/markers-summary.test.ts` | Ops + pengungsian terhitung; kedua rute memakai loader yang sama. |

## Bukti

GET `/api/layers/markers` dan GET `/api/layers/markers/summary` keduanya memanggil `loadPublicMarkerCollection()`: `mergeLaporanOverlays` → `mergeOperasiDisasterEvents` → `mergePengungsianOverlays`. Tidak ada rute baru.

Uji: koleksi campuran `laporanKejadian` + `disasterEvents` + `tendPoints` → total 3, ketiga layer terhitung. Baca sumber memastikan `mergeOperasiDisasterEvents` dan `mergePengungsianOverlays` ada di loader.

```
node --import tsx --test src/lib/laporan/markers-summary.test.ts
# tests 2, pass 2
```

## Bacaan ulang bukti versus kriteria

- [x] Ringkasan menghitung kejadian operasi dan pengungsian, bukan hanya `mergeLaporanOverlays`.
- [x] Tidak ada endpoint baru. `npm test` 218 dan `npx tsc --noEmit` lulus.

## Keputusan

selesai
