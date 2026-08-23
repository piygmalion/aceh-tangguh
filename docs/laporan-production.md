# Laporan masyarakat — langkah produksi

Formulir **Laporkan Kejadian** dan **Laporkan Penanganan** membutuhkan konfigurasi berikut sebelum go-live.

## 1. Migration Supabase

Jalankan di SQL Editor (urutan):

1. `supabase/migrations/20260825_laporan_masyarakat.sql`
2. `supabase/migrations/20260826_laporan_production.sql`

Pastikan `20260825_admin_auth.sql` sudah diterapkan (fungsi `is_staff()`).

Verifikasi:

```bash
node scripts/verify-laporan-setup.mjs
```

## 2. Enkripsi PII

Generate kunci produksi (simpan di secret manager / hosting env, **jangan commit**):

```bash
node scripts/generate-laporan-pii-key.mjs
```

| Variabel | Deskripsi |
|----------|-----------|
| `LAPORAN_PII_KEY` | 64 karakter hex (32 byte) — AES-256-GCM |
| `LAPORAN_PII_SALT` | Salt untuk hash NIK/telepon (SHA-256) |

Tanpa `LAPORAN_PII_KEY`, dev memakai hash deterministik (tidak bisa didekripsi untuk moderasi/WA).

## 3. Antrean WhatsApp

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

Di development tanpa gateway, pesan hanya di-log; antrean dev tanpa `LAPORAN_PII_KEY` ditandai `skipped`.

## 4. Upload media

Bucket `laporan-media` (private, max 10MB). Upload via `POST /api/laporan/upload` (server memakai `SUPABASE_SERVICE_ROLE_KEY`).

Env wajib untuk upload:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, tidak di bundle browser)

Path disimpan di `jawaban_json` (field `foto` / `video`). Staff melihat file via policy `laporan_media_select_staff`.

## 5. Peta publik

Hanya laporan kejadian dengan `status = approved` dan `tampil_di_peta = true` digabung ke layer `citizenReports`. Penanganan **tidak** di peta.

## 6. Moderasi

Moderator: **BPBA Pusdalops**. Staff console (`is_staff`) dapat SELECT/UPDATE `laporan_kejadian` dan `laporan_penanganan`. UI moderasi laporan baru dapat ditambahkan di `/admin/moderasi` (legacy `reports` masih ada).

Setelah approve kejadian, set `status = approved`, `tampil_di_peta = true`, dan enqueue WA `laporan_approved` (manual atau API admin).
