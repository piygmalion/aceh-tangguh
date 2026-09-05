# BE-8 — GET overlay live kosong sah vs 503

Agent: backend
Gelombang: 3
Status: selesai

## Niat

- Tujuan: Refresh hulu yang berhasil dengan 0 fitur Aceh adalah keadaan sah: HTTP 200, `features: []`, tanpa `stale`, tanpa `error: "upstream"`. Belum pernah refresh, hulu/persist gagal tanpa cache, atau ledger sukses berfitur tetapi baris sudah kosong = 503 + `OVERLAY_UPSTREAM_FAILURE_BODY`. Senter = tabel `overlay_live_refresh` per `layer_key`. Bukan baris sentinel di `overlay_live_features`.
- Kontrak: seluruh bagian BE-8 di `docs/pengembangan/jurnal/AN-5.md`. Tidak menambah opsi.
- Berkas:
  - `docs/pengembangan/jurnal/BE-8.md`
  - `supabase/migrations/20260916_overlay_live_refresh.sql` — baru; skema + RLS persis AN-5
  - `src/lib/overlay-live.ts` — ledger tulis/baca; `resolveOverlayLiveRead(rows, nowMs, ledger=null)`; `refreshOverlayLive` `ok` hanya persist+senter; `loadOverlayLive` kunci live baca fitur+ledger
  - `src/lib/overlay-live.test.ts` — uji wajib AN-5 + uji lama tanpa ledger
  - `docs/pengembangan/STATUS.md` — hanya baris BE-8
- Tidak diubah: `src/lib/supabase/types.ts` (cast ledger seperti `expires_at`); migrasi lama; FE-3; BE-7; rute GET overlay (tetap `loadOverlayLive` + `catch` 503); cron overlay (tetap `refreshAllOverlayLive`); `planOverlayLiveWrite` (tetap `clear` jika 0); `syncCalonDariOverlay` tetap hanya setelah persist sukses (termasuk `clear`); fixture statis tanpa ledger; `purge_expired_overlay_rows` tidak menulis ledger.
- Langkah:
  1. Migrasi baru `overlay_live_refresh`: PK `layer_key` + check lima kunci live; `refreshed_at timestamptz not null`; `ok boolean not null`; `feature_count integer not null check (>= 0)`; `error text null`. RLS ENABLE. `SELECT` `anon`+`authenticated` `using (true)`. Tidak ada kebijakan INSERT/UPDATE/DELETE/ALL staf (`is_staff` / `is_ops` / `is_super_admin`). Indeks selain PK tidak wajib. Tidak menyentuh `overlay_live_features`.
  2. Tipe ledger lokal + cast baris (jangan generate `types.ts`).
  3. `resolveOverlayLiveRead(rows, nowMs = Date.now(), ledger = null)` — delapan cabang AN-5. Uji lama tanpa argumen ketiga + baris kosong/`null` tetap 503. `ok === false` + ada baris = `resolveOverlayLiveFailure` ber-cache (200 `stale`, tanpa `error: "upstream"`), bukan `expires_at`. Kosong sah hanya `ok === true` && `feature_count === 0` && tidak ada baris. Ledger `feature_count === 0` + ada baris = ikuti `expires_at`, jangan dikosongkan paksa.
  4. `loadOverlayLive`: fixture `seismicSensors` / `maritimePorts` / non-live tetap 200 dari disk/kosong, tanpa SELECT ledger. Kunci live: `readStoredLive` + satu baris `overlay_live_refresh` (klien baca yang sama dengan fitur).
  5. `refreshOverlayLive`: fetch dulu. Fetch melempar → jangan persist/hapus cache; hitung sisa; tulis ledger `ok=false`. Fetch sukses → `persistLive` (0 fitur tetap `clear`). Baru kemudian tulis ledger. `feature_count` sukses = N hasil fetch. `feature_count` gagal = `COUNT(*)` sisa layer itu; COUNT gagal → 0, tetap `ok=false`. Persist sukses + tulis senter gagal → hasil refresh `ok: false`; jangan rollback fitur. Hasil `ok: true` hanya jika persist dan tulis senter berhasil.
  6. Sync calon: `shouldSyncCalonAfterRefresh(key, persisted, true)` setelah persist diketahui, sebelum/tanpa menunggu senter. Jangan sync jika fetch atau persist gagal.
- Cara membuktikan:
  - Uji murni semua butir “Uji wajib” AN-5, plus uji lama `resolveOverlayLiveRead(rows, nowMs)` tanpa ledger.
  - Sumber: migrasi skema+RLS tanpa write staf; `loadOverlayLive` live membaca ledger; fixture tidak; `planOverlayLiveWrite([],…)` = `clear`; refresh menulis senter setelah persist; tidak ada sentinel.
  - `npm test; npx tsc --noEmit` (PowerShell).
- Risiko:
  - Mengisi titik fiktif ke `overlay_live_features` — dilarang.
  - Memakai `now()` atau ketiadaan baris saja sebagai bukti gagal — dilarang.
  - 503 untuk “Aceh sepi” (ledger `ok` + `feature_count = 0` + kosong) — dilarang.
  - Generate `types.ts` — dilarang; cast.
  - Mengubah FE-3 / BE-7 / DATA-3 — dilarang.
  - `purge` mengosongkan layer yang `feature_count > 0` harus 503 sampai cron sukses berikutnya (perilaku tabel, bukan job purge baru).

## Bacaan ulang niat

Niat bisa dijalankan tanpa tebakan. Senter = satu baris per kunci live, ditulis setelah hasil persist/fetch diketahui. GET membedakan kosong sah dari 503 lewat ledger, bukan lewat `now()`. Delapan cabang AN-5 terkunci; uji lama tanpa ledger tetap 503 jika kosong. `persistLive` tetap boolean; pesan persist gagal = `"persist failed"`. Sync calon tetap berdasar persist, bukan tulis senter. Fixture tanpa ledger. `types.ts` tidak disentuh. Tidak ada kebijakan write staf pada tabel baru. Siap kode.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `supabase/migrations/20260916_overlay_live_refresh.sql` | Tabel ledger, RLS SELECT `anon`+`authenticated` `using (true)`, tanpa kebijakan write staf |
| `src/lib/overlay-live.ts` | `resolveOverlayLiveRead` + ledger; `refreshOverlayLive` menulis senter setelah persist; `ok` hanya persist+senter; `loadOverlayLive` live baca fitur+ledger |
| `src/lib/overlay-live.test.ts` | Delapan cabang + uji wajib AN-5 + skema migrasi + uji lama tanpa ledger |
| `docs/pengembangan/STATUS.md` | Baris BE-8 → selesai |

## Bukti

Putaran 1 — niat dari AN-5 BE-8. Bacaan ulang: senter tabel, bukan sentinel; `ok` refresh = persist dan tulis senter; uji lama tanpa ledger tetap 503.

Putaran 2 — migrasi + resolver + refresh + uji. `planOverlayLiveWrite([],…)` tetap `clear`. Fixture tidak membaca ledger. `types.ts` tidak di-generate; baris ledger di-cast.

```
node --import tsx --test src/lib/overlay-live.test.ts
# tests 18, pass 18, fail 0

npm test; npx tsc --noEmit
# tests 278, pass 278, fail 0
# tsc --noEmit exit 0
```

Uji wajib AN-5: ledger `ok`+0+`[]` → 200 tanpa stale/error; ledger `ok`+0+ada fitur → 200 `expires_at` (bukan dikosongkan); tanpa ledger + `[]` → 503 `upstream`; `ok: false` + `[]` → 503; `ok: false` + cache → 200 stale; `ok`+`feature_count > 0` + `[]` → 503; `planOverlayLiveWrite([],…)` = `{ action: "clear" }`.

Fetch gagal menulis ledger `ok=false` dan tidak memanggil persist. Persist sukses + senter gagal → `ok: false`, fitur tidak di-rollback.

## Bacaan ulang bukti versus kriteria

- [x] Migrasi baru `20260916_overlay_live_refresh.sql` persis skema AN-5
- [x] RLS SELECT anon+authenticated `using (true)`; tidak ada kebijakan write staf
- [x] `refreshOverlayLive` menulis ledger setelah persist diketahui; `ok: true` hanya persist dan tulis senter
- [x] Fetch gagal: cache tidak dihapus; ledger `ok=false`
- [x] `resolveOverlayLiveRead(rows, nowMs, ledger=null)` delapan cabang; uji lama tanpa ledger + kosong = 503
- [x] `loadOverlayLive` kunci live: fitur + ledger; fixture statis tanpa ledger
- [x] `planOverlayLiveWrite([],…)` tetap `clear`; tidak ada sentinel di `overlay_live_features`
- [x] Uji murni semua butir “Uji wajib” AN-5
- [x] `types.ts` tidak di-generate; ledger di-cast
- [x] `npm test` 278 + `tsc --noEmit` lulus
- [x] Hanya baris BE-8 di STATUS; bukan BE-7 / FE-3 / commit

## Keputusan

selesai

