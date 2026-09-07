# DATA-24 — tabel Daily Brief

Agent: data
Gelombang: 31
Status: selesai

Kontrak: [AN-38](AN-38.md).

## Niat

- Tujuan: Tiga tabel baru untuk subscriber staf, snapshot harian, dan log WA. Bukan tabel `users`. Bukan suntingan migrasi lama.
- Berkas: `supabase/migrations/20260926_daily_brief.sql`, `src/lib/sik/db-tables.ts`, uji migrasi, jurnal ini.
- Langkah: PK uuid, `brief_date` unik, `phone_enc`, status check, RLS, revoke anon pada PII, SELECT publik hanya `daily_briefs`.
- Cara membuktikan: uji berkas SQL; tidak ada `create table users`; tidak menimpa `notifikasi_wa`.
- Risiko: grant anon pada nomor; campur `purge_expired_overlay_rows`.

## Bacaan ulang niat

Migrasi baru saja. Subscriber + log = service role / bukan anon. Snapshot harian boleh dibaca publik karena tanpa PII.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `supabase/migrations/20260926_daily_brief.sql` | tiga tabel |
| `src/lib/sik/db-tables.ts` | tipe |
| `src/lib/daily-brief/migration.test.ts` | uji SQL |

## Bukti

```
node --import tsx --test src/lib/daily-brief/migration.test.ts
# pass
```

Migrasi tidak diterapkan ke produksi dari tiket ini.

## Bacaan ulang bukti versus kriteria

- [x] Tiga tabel baru, bukan `users`
- [x] `phone_enc`; RLS; revoke anon pada PII
- [x] SELECT publik hanya `daily_briefs`
- [x] Tidak menimpa `notifikasi_wa` / overlay lama

## Keputusan

selesai
