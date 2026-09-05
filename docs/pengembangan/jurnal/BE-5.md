# BE-5 — RLS PII memakai is_ops()

Agent: backend
Gelombang: 2
Status: selesai

## Niat

- Tujuan: SELECT identitas pelapor dan berkas laporan hanya untuk peran operasi (`is_ops()`), bukan seluruh staf (`is_staff()`). `admin_desa`, `penilai_pkd`, dan `admin_rr` tidak boleh membaca PII pelapor / antrean WA / objek `laporan-media`.
- Berkas:
  - `supabase/migrations/20260914_laporan_pii_is_ops.sql` (baru)
  - `src/lib/laporan/pii-is-ops.test.ts` — uji sumber migrasi (bukan mengubah fungsi SQL)
  - Tidak mengubah: definisi `is_ops()` / `is_staff()`, kebijakan `laporan_kejadian` / `laporan_penanganan`, insert anon, tabel juklak lain, migrasi lama
- Langkah:
  1. Migrasi baru saja. `DROP POLICY` lalu `CREATE POLICY` ulang untuk tiga permukaan:
     - `public.laporan_pelapor` — `laporan_pelapor_select_staff` — `USING (public.is_ops())`
     - `public.notifikasi_wa` — `notifikasi_wa_select_staff` — `USING (public.is_ops())`
     - `storage.objects` — `laporan_media_select_staff` — `USING (bucket_id = 'laporan-media' AND public.is_ops())`
  2. Nama kebijakan tetap (hanya predikat yang berubah) agar GRANT yang sudah ada tidak perlu diulang.
  3. SELECT tidak memakai `WITH CHECK` (tidak ada di kebijakan lama; tiket menyebut using/with check = predikat yang berlaku). Jangan menambah INSERT/UPDATE.
  4. Jangan `CREATE OR REPLACE FUNCTION` untuk `is_ops` / `is_staff`.
- Cara membuktikan:
  - Berkas migrasi baru ada; `git diff --name-only` tidak menampilkan `20260826`, `20260902`, `20260907`.
  - Isi SQL: ketiga kebijakan memakai `is_ops()`; tidak ada `create or replace function public.is_ops` / `is_staff`; tidak ada kebijakan `laporan_kejadian` / `laporan_penanganan`.
  - `npm test` lulus.
- Risiko:
  - `/api/admin/laporan` memakai service role setelah `requireStaffApi` — jalur API tidak berubah oleh RLS; penyempitan ini berlaku untuk akses PostgREST langsung. Tidak memperlebar `is_ops()`.
  - Migrasi tidak diterapkan ke basis jarak jauh pada tiket ini (hanya berkas).

## Bacaan ulang niat

Satu berkas SQL baru, tiga kebijakan SELECT, predikat `is_ops()`, tanpa menyentuh definisi fungsi atau tabel kejadian/penanganan. Bisa dijalankan tanpa tebakan. Uji sumber cukup untuk kriteria “migrasi baru + is_ops + tidak diperlebar”.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `supabase/migrations/20260914_laporan_pii_is_ops.sql` | SELECT `laporan_pelapor`, `notifikasi_wa`, `laporan-media` memakai `is_ops()` |
| `src/lib/laporan/pii-is-ops.test.ts` | Uji sumber: tiga predikat `is_ops()`; fungsi tidak diganti; migrasi lama utuh |

## Bukti

Putaran 1 gagal: uji menolak komentar yang menyebut `laporan_kejadian` / `laporan_penanganan`. Putaran 2: predikat uji diganti ke `on public.laporan_*` (kebijakan), bukan komentar.

```
node --import tsx --test src/lib/laporan/pii-is-ops.test.ts
# tests 2, pass 2
npm test
# tests 225, pass 225, fail 0
```

SQL: `using (public.is_ops())` pada ketiga kebijakan. Tidak ada `create or replace function`. `is_ops()` tetap `super_admin`, `admin`, `admin_provinsi`, `admin_kabkota` di `20260907_sik_operasional.sql`.

## Bacaan ulang bukti versus kriteria

- [x] Migrasi baru — `20260914_laporan_pii_is_ops.sql`
- [x] using untuk ketiga permukaan PII memakai `is_ops()`
- [x] `is_ops()` tidak diperlebar
- [x] `npm test` lulus (225)

## Keputusan

selesai
