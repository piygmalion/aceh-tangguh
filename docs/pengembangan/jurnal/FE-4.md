# FE-4 — HazardStatusStrip mati/pasang

Agent: frontend
Gelombang: 3
Status: selesai

## Niat

- Tujuan: Jangan biarkan `HazardStatusStrip` dan `GET /api/hazards` hidup sebagai kode mati. Pilih satu: hapus, atau pasang di satu halaman dengan alasan.
- Keputusan (sebelum kode): **hapus komponen dan hapus rute**. Alasan:
  - `src/components/HazardStatusStrip.tsx` tidak diimpor halaman mana pun.
  - Beranda (`src/app/[locale]/page.tsx`) sudah memasang `PeringatanDiniSection`, yang memakai `id="status"` (tautan hero `#status` tetap sah).
  - Teks panduan (`messages/*/panduan`) sudah menyatakan strip Hazard diganti Peringatan Dini.
  - `GET /api/hazards` hanya dipanggil komponen itu + cabang pratinjau statis. Tidak ada pemakai API lain.
  - Memasang ulang akan menduplikasi status di beranda dan membaca tabel `hazard_status`, bukan umpan hidup MAGMA/Sipongi/cuaca yang sudah dipakai Peringatan Dini.
  - `?hazard=` di URL peta tetap lewat `parseHazardKind` / `HAZARD_TO_DISASTER_JENIS` — itu alias filter jenis, bukan pemakai rute `/api/hazards`.
- Berkas:
  - Hapus `src/components/HazardStatusStrip.tsx`.
  - Hapus `src/app/api/hazards/route.ts` (dan folder rute jika kosong).
  - `src/lib/preview/public-api.ts` — cabang 200 `/api/hazards` dihapus; path itu menjawab **503 eksplisit** (`STATIC_UNAVAILABLE`), bukan fixture palsu.
  - `src/lib/preview/fallbacks.ts` — hapus `HAZARD_STATUS_FALLBACK` jika tidak terpakai lagi.
- Tidak diubah (luar wilayah atau masih dipakai): `qk.hazards`, namespace `messages` `hazards` (hanya boleh menambah), `HazardKind` / `HazardStatus` / `hazard-kinds.ts` / `?hazard=`, README, `security/attack-surface.md`.
- Langkah:
  1. Hapus komponen.
  2. Hapus rute.
  3. Preview: mapping 200 dibersihkan; `/api/hazards` → 503 eksplisit.
  4. Hapus fallback yang hanya untuk rute itu.
- Cara membuktikan:
  - Grep `HazardStatusStrip` di `src/` = tidak ada impor/komponen.
  - Berkas `src/app/api/hazards/route.ts` tidak ada.
  - Grep `fetchPublicApi("/api/hazards")` / `HAZARD_STATUS_FALLBACK` = tidak ada.
  - Dengan `STATIC_EXPORT=1`, `fetchPublicApi("/api/hazards")` status 503.
  - `npm test` (PowerShell: `;` bukan `&&`).
  - UI: tidak memasang strip baru; `#status` tetap bagian Peringatan Dini. Tidak perlu browser untuk hapus kode mati.
- Risiko:
  - Tautan `#status` putus jika `id` hanya di strip — dicegah: `PeringatanDiniSection` sudah `id="status"`.
  - Dokumentasi README/attack-surface masih menyebut `/api/hazards` — luar wilayah; dicatat di bukti, tidak disunting.
  - `qk.hazards` sisa tidak terpakai — luar wilayah (`src/lib/qk.ts`).

## Bacaan ulang niat

Niat bisa dijalankan tanpa menebak data resmi. Keputusan hapus tertulis sebelum kode. Rute dihapus karena tidak ada pemakai selain komponen mati; alias `?hazard=` bukan pemakai rute. Preview tidak boleh terus mengembalikan hitungan fixture seolah rute masih hidup — 503 eksplisit. Namespace i18n `hazards` dibiarkan (aturan hanya tambah). Tidak menyentuh Supabase, overlay-live, atau commit.

## Perubahan

| Berkas | Ubah |
| --- | --- |
| `src/components/HazardStatusStrip.tsx` | dihapus |
| `src/app/api/hazards/route.ts` | dihapus |
| `src/lib/preview/public-api.ts` | cabang 200 `/api/hazards` diganti 503 `STATIC_UNAVAILABLE` |
| `src/lib/preview/fallbacks.ts` | `HAZARD_STATUS_FALLBACK` dihapus |
| `src/lib/preview/public-api.test.ts` | uji 503 pratinjau (baru) |

## Bukti

Putaran 1.

Keputusan hapus tertulis di Niat sebelum kode.

Grep `HazardStatusStrip` di `src/` = satu komentar sisa di `map-url-aliases.ts` (luar wilayah; `?hazard=` tetap). Tidak ada impor komponen.

`src/components/HazardStatusStrip.tsx` tidak ada. `src/app/api/hazards/**` tidak ada. `HAZARD_STATUS_FALLBACK` tidak ada.

`node --import tsx --test src/lib/preview/public-api.test.ts` — tests 1, pass 1: `STATIC_EXPORT=1` → `/api/hazards` status 503, `error: not_available_on_static_preview`.

`#status` tetap di `PeringatanDiniSection`. Tidak memasang strip baru.

Sisa luar wilayah (tidak disunting): `qk.hazards`, namespace `messages.hazards`, README, `security/attack-surface.md`.

`npx tsc --noEmit` — exit 0. `npm test` — tests 266, pass 266, fail 0.

## Bacaan ulang bukti versus kriteria

- [x] Keputusan hapus/pasang tertulis di niat sebelum kode — hapus komponen + rute.
- [x] Tidak ada kode mati: komponen dan rute dihapus; tidak dipasang di halaman.
- [x] Preview `/api/hazards` = 503 eksplisit, bukan fixture 200.
- [x] `npm test` 266/266.

## Keputusan

selesai
