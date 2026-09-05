# Laporan masyarakat — langkah produksi

Formulir **Laporkan Kejadian** dan **Laporkan Penanganan** membutuhkan konfigurasi berikut sebelum go-live.

## 1. Migration Supabase

Jalankan di SQL Editor (urutan):

1. `supabase/migrations/20260825_laporan_masyarakat.sql`
2. `supabase/migrations/20260826_laporan_production.sql`
3. `supabase/migrations/20260829_map_layers_partisipasi.sql` — layer `laporanKejadian` / `laporanPenanganan` + SELECT publik penanganan
4. `supabase/migrations/20260902_harden_laporan_rls.sql` — **wajib**. Cabut INSERT anon, nomor laporan via sequence, CHECK koordinat penanganan, GRANT kolom anon tanpa `jawaban_json` / `pelapor_id`
5. `supabase/migrations/20260904_harden_laporan_auth_select.sql` — **wajib** setelah 20260902. Samakan GRANT SELECT `authenticated` dengan daftar kolom anon (tanpa `jawaban_json` / `pelapor_id`)

Pastikan `20260825_admin_auth.sql` sudah diterapkan (fungsi `is_staff()`).

Verifikasi:

```bash
npm run verify:laporan
```

Script ini juga mengecek RLS (anon INSERT diblokir) dan kolom GRANT (`jawaban_json`, `pelapor_id`).

## 2. Rate limit terdistribusi (Upstash)

Jika Supabase / laporan masyarakat diaktifkan, produksi **wajib** Upstash Redis agar rate limit berlaku di semua instance server:

| Variabel | Deskripsi |
|----------|-----------|
| `UPSTASH_REDIS_REST_URL` | REST URL dari database Upstash |
| `UPSTASH_REDIS_REST_TOKEN` | Token REST |

Buat database gratis di [upstash.com](https://upstash.com). Tanpa env ini (saat Supabase dikonfigurasi), POST publik `/api/laporan/*` mengembalikan **503** di produksi. Deploy tanpa Supabase tidak memerlukan Upstash.

## 3. Enkripsi PII

Generate kunci produksi (simpan di secret manager / hosting env, **jangan commit**):

```bash
node scripts/generate-laporan-pii-key.mjs
```

| Variabel | Deskripsi |
|----------|-----------|
| `LAPORAN_PII_KEY` | 64 karakter hex (32 byte) — kunci tulis AES-256-GCM saat ini |
| `LAPORAN_PII_KEY_ID` | Id kunci tulis. Opsional; default `k1`. Ciphertext baru: `v2:<id>:<iv>:<data>:<tag>` |
| `LAPORAN_PII_KEYS` | Kunci lama untuk dekripsi saja. Opsional. Format `k1=<64hex>,k0=<64hex>` — tanpa nilai secret di berkas ini |
| `LAPORAN_PII_SALT` | Salt untuk hash NIK/telepon (SHA-256), **bukan** default `aceh-tangguh-dev` |

Setup yang hanya punya `LAPORAN_PII_KEY` tetap sah: tulis memakai id `k1`; baris `v1:` lama dibaca dengan kunci primer. Saat rotasi, ganti `LAPORAN_PII_KEY` + `LAPORAN_PII_KEY_ID`, lalu pindahkan kunci lama ke `LAPORAN_PII_KEYS` agar `v2:` lama dan `v1:` tetap terbuka.

Produksi **gagal submit** jika kunci/salt belum di-set. Development tanpa Supabase masih boleh file-store `.data/` (folder ini di-gitignore). Jangan commit nilai kunci.

## 4. Service role (wajib untuk tulis)

Insert laporan, pelapor, antrean WA, dan upload media memakai `SUPABASE_SERVICE_ROLE_KEY` di server saja. Anon key **tidak** boleh INSERT ke `laporan_*` / `notifikasi_wa` / `reports`.

Sesi staf tetap JWT (`requireStaffApi`). `/api/admin/laporan` membaca/mengubah `laporan_*` lewat service role setelah cek itu — Postgres GRANT berlaku per role, bukan per `is_staff()`, jadi JWT tidak boleh punya kolom PII.

## 5. Antrean WhatsApp

Set env:

| Variabel | Deskripsi |
|----------|-----------|
| `LAPORAN_CRON_SECRET` | Bearer token untuk cron |
| `WHATSAPP_GATEWAY_URL` | Endpoint HTTP gateway (Fonnte/Wablas/custom) |
| `WHATSAPP_GATEWAY_TOKEN` | Token gateway (opsional) |

Cron endpoint: `POST /api/cron/laporan-wa` dengan header `Authorization: Bearer <LAPORAN_CRON_SECRET>`.

Manual / GitHub Actions:

```bash
LAPORAN_CRON_SECRET=... node scripts/process-laporan-wa.mjs
```

Di development tanpa gateway, pesan hanya di-log; antrean tanpa PII key yang bisa didekripsi ditandai `skipped`.

## 6. Upload media

Bucket `laporan-media` (private, max 10MB). `POST /api/laporan/upload` membatasi `laporan_tipe` (`kejadian`/`penanganan`), `field_key` (`foto`/`video`), MIME dari magic bytes, dan rate limit per IP.

Env wajib:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)

Path disimpan di `jawaban_json`. Staff melihat file via policy `laporan_media_select_staff`.

### Cleanup orphan (unggah tanpa submit)

File diunggah **sebelum** submit formulir. Objek di `laporan-media` yang tidak direferensikan di `jawaban_json` dan berusia **> 48 jam** dihapus oleh:

- Endpoint: `POST /api/cron/laporan-media-gc` (Bearer `LAPORAN_CRON_SECRET`)
- Dry-run: tambahkan `?dry_run=1`
- GitHub Actions: set repository variable `LAPORAN_MEDIA_GC_URL` (mis. `https://your-domain/api/cron/laporan-media-gc`) + secret `LAPORAN_CRON_SECRET`

## 7. Peta publik

Dua layer Partisipasi, keduanya live-query dari tabel laporan (bukan sync ke `marker_features`):

| Layer key | Tabel | Syarat tampil |
|-----------|--------|----------------|
| `laporanKejadian` | `laporan_kejadian` | `status = approved` AND `tampil_di_peta = true` AND lat/lon ada |
| `laporanPenanganan` | `laporan_penanganan` | sama |

`GET /api/laporan/peta` mengembalikan kedua set (`?tipe=kejadian|penanganan` untuk satu sisi). **Tidak** mengembalikan `jawaban_json`. Anon **dan** authenticated PostgREST memakai daftar kolom overlay yang sama — tidak ada GRANT pada `jawaban_json` / `pelapor_id`. Overlay published (`status = approved` AND `tampil_di_peta`) tetap SELECT-able. `GET /api/layers/markers` menggabungkan overlay ini ke GeoJSON peta.

Key lama `citizenReports` **removed** (pola helipad): tidak ada di toolbar; `?layers=citizenReports` di-alias ke `laporanKejadian` saja. STATIC_EXPORT / tanpa data: array kosong — jangan seed titik dummy.

Setelah approve, set `status = approved` dan `tampil_di_peta = true`. Titik muncul pada fetch berikutnya. Tidak ada sync ke `marker_features`.

## 8. Moderasi

Moderator: **BPBA Pusdalops**. Konsol `/id/admin/moderasi`:

- tab **Kejadian** / **Penanganan** → tabel `laporan_*` (sumber titik Partisipasi)
- tab **Formulir lama** → tabel `reports` (legacy, bukan overlay peta; publik `GET/POST /api/reports` sudah **410 Gone**)

Setujui → `status=approved`, `tampil_di_peta=true`, antrean WA `laporan_approved` (best-effort). Database explorer tetap bisa mengedit kolom yang sama.
