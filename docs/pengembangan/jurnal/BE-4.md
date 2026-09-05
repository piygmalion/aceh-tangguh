# BE-4 — GET overlay live hanya membaca tabel

Agent: backend
Gelombang: 2
Status: selesai

## Niat

- Tujuan: GET publik `/api/overlay/{liveKey}` tidak lagi scrape BMKG/MAGMA/Sipongi/Tatonas. Cron mengisi `overlay_live_features` lengkap dengan `expires_at`. Klien tetap membedakan cache kedaluwarsa (200 + `stale`) dari tabel kosong (503 + `error: "upstream"`).
- Berkas:
  - `src/lib/overlay-live.ts` — pecah baca vs refresh; `persistLive` mengisi `expires_at`; keberhasilan kosong menghapus baris layer.
  - `src/lib/overlay-live.test.ts` — cabang baca-saja vs refresh; TTL; pemetaan baris → 200/503.
  - `src/app/api/overlay/[key]/route.ts` — tetap `loadOverlayLive` saja; tidak memanggil refresh.
  - `src/app/api/cron/overlay-live/route.ts` — baru; Bearer `OVERLAY_CRON_SECRET`.
  - `.github/workflows/overlay-live-refresh.yml` — baru; meniru job `refresh-supabase` di `weather-refresh.yml`.
  - `docs/vercel.md`, `security/attack-surface.md` — daftar secret/rute cron baru.
  - `src/lib/security/production-config.ts` — peringatan jika `OVERLAY_CRON_SECRET` kosong (sama pola cuaca).
  - Tidak mengubah: `scripts/**`, `messages/**`, `src/components/**`, migrasi lama, `src/lib/tatonas/service.ts`, fixture `seismicSensors` / `maritimePorts`.
- Langkah:
  1. Ekspor kunci live cron: `bmkgQuakes`, `magmaQuakes`, `magmaVolcanoes`, `sipongiHotspots`, `tatonasStations`.
  2. TTL (dari konstanta yang sudah ada, bukan angka korban):
     - `tatonasStations`: `TATONAS_STALE_MS` = 15 menit (`src/lib/tatonas/types.ts`). Alasan: ambang stale stasiun yang sudah dipakai parser.
     - `bmkgQuakes`, `magmaQuakes`, `magmaVolcanoes`, `sipongiHotspots`: 2 jam, sama dengan `expires_at` cron cuaca di `src/app/api/weather/refresh/route.ts`.
  3. `persistLive` selalu menulis `expires_at = now + TTL`. Tipe generated belum punya kolom ini (DATA-1 hanya SQL) — cast di `overlay-live.ts`, jangan sunting `types.ts`.
  4. **Keberhasilan kosong:** refresh hulu sukses dengan 0 fitur Aceh → `DELETE` semua baris `layer_key` itu. Jangan `return` diam-diam (itu yang menumpuk gempa/hotspot lama). Jangan sisipkan titik fiktif. Konsekuensi GET: tanpa baris → 503 via `resolveOverlayLiveFailure`. "Aceh sepi" dan "belum pernah diisi" tidak dibedakan di jalur baca-saja; GET tidak boleh fetch hulu untuk memastikan kosong.
  5. Refresh sukses dengan N>0 fitur → upsert + hapus baris layer yang `id`-nya tidak ada di hasil baru (daftar hulu menyusut juga tidak boleh menumpuk).
  6. `loadOverlayLive` untuk kunci live: hanya `SELECT` tabel. Ada fitur → 200; `stale: true` jika tidak ada baris dengan `expires_at > now()` (`expires_at` null = belum di-stempel cron → stale). Nol baris → 503. Fixture `seismicSensors` / `maritimePorts` tetap dari disk.
  7. Tatonas di refresh: jangan pakai `loadTatonasMarkerFeatures` (menelan galat jadi `[]` lalu akan menghapus snapshot). Panggil klien/parser Tatonas yang melempar; galat = jangan persist.
  8. `refreshOverlayLive(key)` / `refreshAllOverlayLive()`: fetch + persist. Cron `POST /api/cron/overlay-live`: secret unset → 503, Bearer salah → 401, secret `OVERLAY_CRON_SECRET` (jangan reuse). Setelah refresh, `purge_expired_overlay_rows()`. `maxDuration` 60 (Hobby).
  9. Workflow baru: `vars.OVERLAY_REFRESH_URL` + `secrets.OVERLAY_CRON_SECRET`; skip jika URL kosong / secret kosong; `curl` POST Bearer. Tidak memakai Node (job cuaca `refresh-supabase` juga tidak).
- Cara membuktikan:
  - Uji murni: baris kosong → 503; ada fitur kedaluwarsa → 200 stale; ada `expires_at` masa depan → 200 tanpa stale; rencana persist kosong = hapus; TTL Tatonas = `TATONAS_STALE_MS`, lainnya = 2 jam.
  - Baca sumber: `loadOverlayLive` (kunci live) tidak memanggil fetch/persist; rute GET tidak mengimpor refresh; rute cron memakai `OVERLAY_CRON_SECRET` + 503/401.
  - `node --import tsx --test src/lib/overlay-live.test.ts`; `npx tsc --noEmit`; `npm test`.
- Risiko:
  - Tabel kosong setelah refresh 0 fitur = 503, bukan 200 kosong. Sesuai kriteria 4–5; FE-3 yang menampilkan stale/gagal.
  - `loadTatonasMarkerFeatures` tetap menelan galat di jalur lain (peringatan dini) — tidak diubah.
  - Cast `expires_at` karena `types.ts` di luar tiket.

## Bacaan ulang niat

Niat bisa dijalankan tanpa menebak data resmi atau angka korban. TTL hanya dari `TATONAS_STALE_MS` dan 2 jam cuaca. Keputusan kosong = hapus baris (bukan sentinel, bukan expire-lalu-sajikan-lama). GET live tidak fetch. Fixture disk tetap. Secret baru, tidak reuse. Workflow meniru `refresh-supabase` tanpa Node. `types.ts` dan `tatonas/service.ts` tidak disunting.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `src/lib/overlay-live.ts` | `loadOverlayLive` hanya baca tabel; `refreshOverlayLive` / `refreshAllOverlayLive` fetch + persist + `expires_at`; keberhasilan kosong = `DELETE` layer; Tatonas via klien yang melempar |
| `src/lib/overlay-live.test.ts` | Cabang baca vs refresh, TTL, rencana persist kosong, cron Bearer |
| `src/app/api/cron/overlay-live/route.ts` | `OVERLAY_CRON_SECRET`; unset 503; salah 401 |
| `.github/workflows/overlay-live-refresh.yml` | `vars.OVERLAY_REFRESH_URL` + `secrets.OVERLAY_CRON_SECRET` |
| `docs/vercel.md`, `security/attack-surface.md` | Secret + rute cron baru |
| `src/lib/security/production-config.ts` | Peringatan jika secret overlay kosong |

## Bukti

Putaran 1.

TTL: `tatonasStations` = `TATONAS_STALE_MS` (15 menit); layer live lain = 2 jam (cron cuaca).

`loadOverlayLive` untuk kunci live hanya `readStoredLive` → `resolveOverlayLiveRead`. Tidak memanggil fetch/persist. Rute GET tidak mengimpor refresh.

`persistLive` menulis `expires_at`. Rencana `features.length === 0` = `clear` (DELETE `layer_key`). Refresh sukses N>0 upsert lalu hapus `id` yang tidak ada di hasil baru.

```
npx tsc --noEmit
# exit 0
node --import tsx --test src/lib/overlay-live.test.ts
# tests 9, pass 9
npm test
# tests 223, pass 223, fail 0
```

## Bacaan ulang bukti versus kriteria

- [x] GET `/api/overlay/{liveKey}` tidak memanggil BMKG/MAGMA/Sipongi/Tatonas — `loadOverlayLive` hanya baca tabel; uji sumber mengunci tubuh fungsi
- [x] Cron mengisi tabel + `expires_at` — `refreshOverlayLive` + `persistLive` + rute `POST /api/cron/overlay-live` + workflow
- [x] Uji overlay-live tetap lulus; cabang baca-saja vs refresh — 9/9
- [x] `npm test` (223) dan `npx tsc --noEmit` lulus

## Keputusan

selesai
