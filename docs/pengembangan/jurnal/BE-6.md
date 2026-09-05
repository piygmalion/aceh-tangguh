# BE-6 — sinyal overlay menjadi calon kejadian

Agent: backend
Gelombang: 2
Status: selesai

## Niat

- Tujuan: Membuat calon kejadian dari `overlay_live_features` yang sudah ada, tanpa scrape hulu, tanpa ambang/peran/jenis baru, dan tanpa menulis `kejadian_operasi` sebelum operator menerima. Setelah diterima, kejadian lahir `draft` + `dinamis` + `is_bencana` false — bukan `aktif`.
- Berkas:
  - `docs/pengembangan/jurnal/BE-6.md`
  - `supabase/migrations/20260915_overlay_calon_kejadian.sql` (baru; kolom/check/indeks/RLS persis AN-4)
  - `src/lib/overlay-calon.ts` — kelayakan murni, cuplikan, dedup, wilayah, `syncCalonDariOverlay`
  - `src/lib/overlay-calon.test.ts` — uji tabel + sumber migrasi/rute
  - `src/app/api/sik/calon-kejadian/route.ts` — GET daftar, POST manual
  - `src/app/api/sik/calon-kejadian/[id]/terima/route.ts`
  - `src/app/api/sik/calon-kejadian/[id]/tolak/route.ts`
  - `src/lib/overlay-live.ts` — hanya memanggil sync setelah persist layer sukses di `refreshOverlayLive` (`ok: true`); tidak dari `loadOverlayLive`
  - `src/lib/sik/db-tables.ts` — tipe baris `overlay_calon_kejadian`
  - `docs/pengembangan/STATUS.md` — baris BE-6 setelah bukti lolos
- Langkah:
  1. Migrasi baru `overlay_calon_kejadian` persis naskah AN-4. Jangan sunting migrasi lama. Jangan memperlebar `is_ops()`.
  2. Fungsi murni kelayakan + dedup + tautan putus/utuh. `syncCalonDariOverlay(layer_key)` baca tabel overlay, buat/perbarui `draf`, tandai `putus` hanya setelah fetch layer itu berhasil.
  3. API: `requireOpsApi`, `rejectCrossOrigin` pada tulis, wilayah `admin_kabkota` butir 4 AN-4.
  4. Terima: insert `kejadian_operasi` draft+dinamis+`is_bencana` false; Tatonas wajib `kode_jenis` di body; waktu wajib (bukan `now()`); `allocateKib` seperti POST kejadian; jangan `kejadian_dampak`.
  5. Panggil sync hanya jika `persistLive` sukses dan `refreshOverlayLive` `ok: true` serta `layer_key` diizinkan. `magmaVolcanoes` bukan calon.
- Cara membuktikan:
  - Uji tabel: dedup `draf`; `ditolak` + `updated_at` lebih baru; Tatonas `AMAN` bukan calon; `magmaVolcanoes` ditolak; 503/`upstream` bukan putus.
  - Sumber migrasi: kolom, check, indeks unik parsial `draf`, RLS `is_ops`, tanpa `CREATE OR REPLACE` `is_ops`.
  - Sumber rute: `rejectCrossOrigin` + `requireOpsApi` pada tulis; GET default `draf`; terima tidak mengisi `aktif` / dampak / `now()`.
  - Sumber overlay-live: sync hanya di `refreshOverlayLive` setelah persist; `loadOverlayLive` tidak memanggil sync.
  - `npm test` dan `npx tsc --noEmit` lulus.
- Risiko:
  - Menulis calon ke `kejadian_operasi` sebelum terima, atau men-set `aktif`.
  - Menandai `putus` saat GET 503 / cache stale / `error: "upstream"`.
  - Memakai `loggerKind` / `kd_hardware` / title sebagai kabupaten / magnitudo minimum / korban.
  - Memanggil sync dari `loadOverlayLive` atau saat persist/fetch gagal.

## Bacaan ulang niat

Satu tiket, kontrak AN-4. Tabel baru menampung `draf`/`ditolak`/`diterima`; `kejadian_operasi` hanya saat terima dan tetap `draft`. Ambang hanya yang sudah di overlay (Sipongi medium/high sudah terfilter; Tatonas `AWAS`/`WASPADA`). Sync baca tabel, bukan scrape. Job otomatis hanya setelah persist layer sukses pada jalur refresh. `admin_kabkota` melihat scope atau belum terikat; terima calon belum terikat wajib isi kabupaten scope sendiri. Tidak ada peran baru, tidak ada kolom baru di `kejadian_operasi`. Bisa dijalankan tanpa tebakan.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `supabase/migrations/20260915_overlay_calon_kejadian.sql` | Tabel baru, unik parsial `draf`, indeks, RLS `is_ops`, tanpa anon SELECT |
| `src/lib/overlay-calon.ts` | Kelayakan, cuplikan, dedup, wilayah, terima/tolak, `syncCalonDariOverlay` |
| `src/lib/overlay-calon.test.ts` | Uji tabel + sumber migrasi/rute/refresh |
| `src/app/api/sik/calon-kejadian/route.ts` | GET daftar (default `draf`), POST manual |
| `src/app/api/sik/calon-kejadian/[id]/terima/route.ts` | Terima → `kejadian_operasi` draft |
| `src/app/api/sik/calon-kejadian/[id]/tolak/route.ts` | Tolak tanpa kejadian |
| `src/lib/overlay-live.ts` | `persistLive` mengembalikan sukses; sync hanya di `refreshOverlayLive` |
| `src/lib/sik/db-tables.ts` | Tipe `overlay_calon_kejadian` (masuk `Database` lewat `SikTables`) |
| `docs/pengembangan/STATUS.md` | BE-6 → selesai |

## Bukti

Putaran 1 — niat dari AN-4. Bacaan ulang: tanpa tebakan ambang/peran/`loggerKind`.  
Putaran 2 — kode + uji. `tsc` gagal pada `.eq("status")` / `.eq("source")` (string vs union). Diperbaiki dengan narrowing.  
Putaran 3 — bacaan ulang versus AN-4: sync tidak dari GET; `magmaVolcanoes` dilewati; Tatonas `AMAN` bukan calon; 503 bukan putus; terima bukan `aktif`.

```
npm test
# tests 255, pass 255, fail 0

npx tsc --noEmit
# exit 0
```

`shouldSyncCalonAfterRefresh("magmaVolcanoes", true, true) === false`. `shouldMarkTautanPutus({ layerRefreshOk: false }) === false`. `loadOverlayLive` tidak menyebut `syncCalonDariOverlay`.

## Bacaan ulang bukti versus kriteria

- [x] Migrasi baru persis AN-4; `is_ops` tidak diperlebar
- [x] Kelayakan + sync + uji tabel (dedup, ditolak+baru, AMAN, gunung, 503)
- [x] GET/POST calon dan terima/tolak sesuai tabel API AN-4
- [x] Terima: draft+dinamis+`is_bencana` false; Tatonas `kode_jenis`; waktu wajib; `allocateKib`; tanpa dampak
- [x] Sync hanya setelah persist/refresh sukses; bukan dari GET
- [x] `npm test` dan `npx tsc --noEmit`

## Keputusan

selesai
