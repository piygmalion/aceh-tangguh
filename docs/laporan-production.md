# Laporan masyarakat — langkah produksi

Formulir **Laporkan Kejadian** dan **Laporkan Penanganan** membutuhkan konfigurasi berikut sebelum go-live.

## 1. Migration Supabase

Jalankan di SQL Editor (urutan):

1. `supabase/migrations/20260825_laporan_masyarakat.sql`
2. `supabase/migrations/20260826_laporan_production.sql`
3. `supabase/migrations/20260829_map_layers_partisipasi.sql` — layer `laporanKejadian` / `laporanPenanganan` + SELECT publik penanganan
4. `supabase/migrations/20260902_harden_laporan_rls.sql` — **wajib**. Cabut INSERT anon, nomor laporan via sequence, CHECK koordinat penanganan, GRANT kolom anon tanpa `jawaban_json` / `pelapor_id`

Pastikan `20260825_admin_auth.sql` sudah diterapkan (fungsi `is_staff()`).

Verifikasi:

```bash
node --env-file=.env.local scripts/verify-laporan-setup.mjs
```

## 2. Enkripsi PII

Generate kunci produksi (simpan di secret manager / hosting env, **jangan commit**):

```bash
node scripts/generate-laporan-pii-key.mjs
```

| Variabel | Deskripsi |
|----------|-----------|
| `LAPORAN_PII_KEY` | 64 karakter hex (32 byte) — AES-256-GCM |
| `LAPORAN_PII_SALT` | Salt untuk hash NIK/telepon (SHA-256), **bukan** default `aceh-tangguh-dev` |

Produksi **gagal submit** jika kunci/salt belum di-set. Development tanpa Supabase masih boleh file-store `.data/` (folder ini di-gitignore).

## 3. Service role (wajib untuk tulis)

Insert laporan, pelapor, antrean WA, dan upload media memakai `SUPABASE_SERVICE_ROLE_KEY` di server saja. Anon key **tidak** boleh INSERT ke `laporan_*` / `notifikasi_wa` / `reports`.

Admin UI (moderasi/CMS) tetap anon + JWT staf.

## 4. Antrean WhatsApp

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

## 5. Upload media

Bucket `laporan-media` (private, max 10MB). `POST /api/laporan/upload` membatasi `laporan_tipe` (`kejadian`/`penanganan`), `field_key` (`foto`/`video`), MIME dari magic bytes, dan rate limit per IP.

Env wajib:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)

Path disimpan di `jawaban_json`. Staff melihat file via policy `laporan_media_select_staff`.

## 6. Peta publik

Dua layer Partisipasi, keduanya live-query dari tabel laporan (bukan sync ke `marker_features`):

| Layer key | Tabel | Syarat tampil |
|-----------|--------|----------------|
| `laporanKejadian` | `laporan_kejadian` | `status = approved` AND `tampil_di_peta = true` AND lat/lon ada |
| `laporanPenanganan` | `laporan_penanganan` | sama |

`GET /api/laporan/peta` mengembalikan kedua set (`?tipe=kejadian|penanganan` untuk satu sisi). **Tidak** mengembalikan `jawaban_json`. Anon PostgREST juga tidak punya GRANT pada `jawaban_json` / `pelapor_id`. `GET /api/layers/markers` menggabungkan overlay ini ke GeoJSON peta.

Key lama `citizenReports` **removed** (pola helipad): tidak ada di toolbar; `?layers=citizenReports` di-alias ke `laporanKejadian` saja. STATIC_EXPORT / tanpa data: array kosong — jangan seed titik dummy.

Setelah approve, set `status = approved` dan `tampil_di_peta = true`. Titik muncul pada fetch berikutnya. Tidak ada sync ke `marker_features`.

## 7. Moderasi

Moderator: **BPBA Pusdalops**. Konsol `/id/admin/moderasi`:

- tab **Kejadian** / **Penanganan** → tabel `laporan_*` (sumber titik Partisipasi)
- tab **Formulir lama** → tabel `reports` (legacy, bukan overlay peta)

Setujui → `status=approved`, `tampil_di_peta=true`, antrean WA `laporan_approved` (best-effort). Database explorer tetap bisa mengedit kolom yang sama.
