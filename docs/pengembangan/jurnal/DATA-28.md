# DATA-28 — bucket Storage `cms-media`

Agent: data
Gelombang: 36
Status: selesai

Jangan dikode sebelum bacaan ulang [AN-49.md](AN-49.md). Jangan sunting migrasi lama. Jangan DATA-4. Jangan menyentuh kebijakan citizen-report media.

## Niat

- Tujuan: Bucket `cms-media` ada di Postgres/Storage dengan batas 5 MiB dan MIME gambar, tanpa hak tulis anon.
- Berkas: `supabase/migrations/20260929_cms_media.sql`
- Langkah:
  1. `insert` ke `storage.buckets` untuk `cms-media` (`public` true, `file_size_limit` 5 MiB, MIME jpeg/png/webp).
  2. Kebijakan SELECT objek `cms-media`; tidak ada INSERT/UPDATE/DELETE untuk peran RLS. Tulis BE-36 lewat service role.
- Cara membuktikan: uji `src/lib/cms/upload-media.test.ts` suite DATA-28.
- Risiko: meniru kebijakan laporan; mengubah bucket lama.

## Bacaan ulang niat

Satu berkas SQL baru. Tidak ada TypeScript pada tiket ini. BE-36 yang mengunggah.

## Perubahan

| Berkas | Perubahan |
| --- | --- |
| `supabase/migrations/20260929_cms_media.sql` | Bucket publik-baca `cms-media` 5 MiB |

## Bukti

```
node --import tsx --test src/lib/cms/upload-media.test.ts
# DATA-28 cms-media migration pass
```

Migrasi belum di-apply ke produksi dari tiket kode.

## Apply remote (9 September 2026)

Proyek: `aceh-tangguh` (`whojoxrbcdyotrpolgav`). Isi berkas `20260929_cms_media.sql` apa adanya. Berkas SQL repo tidak disunting.

```
apply_migration name=20260929_cms_media success=true
list_migrations memuat 20260929_cms_media (version 20260908182500)

storage.buckets:
cms-media public=true file_size_limit=5242880 jpeg/png/webp
laporan-media public=false 10MiB jpeg/png/webp/mp4/mov (tidak berubah)

pg_policies storage.objects:
cms_media_select SELECT {public}
laporan_media_select_staff SELECT {authenticated} is_ops()
```

Tidak ada kebijakan INSERT/UPDATE/DELETE `cms-media` untuk klien. Tulis tetap service role di BE-36.

## Bacaan ulang bukti versus kriteria

- [x] Migrasi baru, bukan suntingan lama
- [x] `cms-media` publik-baca, tanpa tulis anon
- [x] Kebijakan citizen-report media tidak di-drop

## Keputusan

selesai
