# DATA-1 — masa berlaku data live dan cache maritim

Agent: data
Gelombang: 1
Status: selesai

## Niat

- Tujuan: Menambah kolom kedaluwarsa pada snapshot overlay live dan cache prakiraan maritim, plus fungsi SQL yang hanya menghapus baris yang sudah lewat masa berlaku. Backend yang mengisi `expires_at` belakangan (gelombang 2); tiket ini tidak menyentuh TypeScript.
- Berkas:
  - `supabase/migrations/20260913_overlay_live_ttl.sql` (baru)
  - Tidak mengubah `supabase/migrations/20260910_overlay_layers.sql` atau migrasi lain yang sudah ada
  - Tidak mengubah `src/lib/overlay-live.ts`, `src/lib/maritime.ts`, atau tipe generated
- Langkah:
  1. Buat migrasi baru `20260913_overlay_live_ttl.sql`.
  2. `alter table public.overlay_live_features add column if not exists expires_at timestamptz` (nullable).
  3. Indeks `(layer_key, expires_at)` pada `overlay_live_features`.
  4. `alter table public.maritime_forecast_cache add column if not exists expires_at timestamptz` (nullable).
  5. Fungsi `public.purge_expired_overlay_rows()` menghapus baris di kedua tabel hanya jika `expires_at is not null` dan `expires_at < now()`. Baris `expires_at` null dibiarkan.
  6. Komentar SQL menyatakan backend mengisi `expires_at` pada gelombang 2; migrasi ini tidak mengisi nilai TTL.
- Cara membuktikan:
  - Berkas migrasi baru ada; `git diff --name-only` tidak menampilkan migrasi lama atau berkas `.ts` yang disentuh tiket ini.
  - Isi SQL memuat kedua `add column … expires_at`, indeks `(layer_key, expires_at)`, dan `purge_expired_overlay_rows`.
  - Predikat hapus memuat `expires_at is not null` dan `expires_at < now()` — bukan `expires_at is null`.
  - `npm test` tetap hijau (tiket ini tidak menambah uji TypeScript).
- Risiko:
  - Menebak nilai TTL di migrasi — dihindari; kolom nullable, isi dikosongkan.
  - Fungsi purge terpanggil oleh anon dan menghapus cache — `revoke all … from public` setelah create.
  - `NULL < now()` sudah unknown di SQL, tetapi predikat `is not null` tetap ditulis agar kriteria “jangan hapus null” terbaca tanpa tebakan.

## Bacaan ulang niat

Niat sudah cukup dijalankan: satu berkas baru, dua kolom nullable, satu indeks, satu fungsi hapus dengan predikat ketat, tanpa TypeScript. Perbaikan: sebutkan `revoke` di langkah bukti agar tidak tampak seperti lingkup ekstra; itu bagian dari aman-fungsi, bukan tiket baru. Tidak menebak kode Tatonas, zona KRB, atau angka korban. Tidak mengisi `expires_at` di sini.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `supabase/migrations/20260913_overlay_live_ttl.sql` | Kolom `expires_at` di `overlay_live_features` + `maritime_forecast_cache`; indeks `(layer_key, expires_at)`; `purge_expired_overlay_rows()`; komentar gelombang 2; revoke PUBLIC |

## Bukti

Putaran 1.

```
git status --short -- supabase/migrations src/lib/overlay-live.ts src/lib/maritime.ts src/lib/supabase/types.ts
?? supabase/migrations/20260913_overlay_live_ttl.sql
# overlay-live.ts / maritime.ts / 20260910–12 sudah untracked sebelum tiket; tiket ini tidak menyuntingnya.
# types.ts sudah M sebelum tiket; tiket ini tidak menyuntingnya.

Select-String … 20260913_overlay_live_ttl.sql
alter table public.overlay_live_features
add column if not exists expires_at timestamptz;
create index if not exists overlay_live_features_layer_expires_idx
on public.overlay_live_features (layer_key, expires_at);
alter table public.maritime_forecast_cache
add column if not exists expires_at timestamptz;
create or replace function public.purge_expired_overlay_rows()
delete from public.overlay_live_features
where expires_at is not null
and expires_at < now();
delete from public.maritime_forecast_cache
where expires_at is not null
and expires_at < now();
revoke all on function public.purge_expired_overlay_rows() from public;

git diff --name-only -- supabase/migrations/20260910_overlay_layers.sql supabase/migrations/20260912_overlay_prune_non_aceh.sql
(kosong — migrasi lama tidak disentuh)
```

Migrasi tidak diterapkan ke basis data jarak jauh pada tiket ini (hanya berkas baru). Predikat hapus tidak menyentuh `expires_at is null`.

```
npm test
# tests 210
# pass 210
# fail 0
```

## Bacaan ulang bukti versus kriteria

- [x] Migrasi baru, bukan suntingan berkas lama — `20260913_overlay_live_ttl.sql` untracked; diff migrasi 20260910/20260912 kosong
- [x] `expires_at` ada di kedua tabel — kedua `add column if not exists expires_at timestamptz` (nullable, tanpa NOT NULL)
- [x] Fungsi purge hanya menyentuh baris kedaluwarsa — `expires_at is not null and expires_at < now()` di kedua tabel
- [x] Tidak ada perubahan TypeScript pada tiket ini — tidak ada suntingan `.ts` oleh agent data

## Keputusan

selesai
