# Instruksi penerapan job `daily-brief-daily`

Status: **belum diterapkan**. Berkas ini bukan izin. Jangan menjalankan SQL ini, jangan menulis basis hidup, dan jangan membuka Vault produksi dari PR draf #163.

Merge PR hanya setelah tiga hal ini ada sekaligus:

1. GO langsung Pak Pygmalion pada giliran itu, yang menyebut PR #163.
2. Backend OK pada gate server PR ini.
3. Migrasi di bawah sudah diterapkan, dan baris Vault bernama `daily_brief_cron_secret` sudah ada.

Ambang kesegaran tetap **usulan, belum dikunci** sampai OK Data. Instruksi ini tidak mengunci ambang dan tidak mengubah `vercel.json`, cron laporan WhatsApp, atau job overlay yang sudah hidup.

## Yang tidak boleh

- Jangan tempel nilai secret di git, PR, chat, atau log.
- Jangan membaca kolom nilai Vault. Jangan pilih `headers`, `content`, atau `net.http_request_queue` (antrean itu sempat memegang Bearer).
- Jangan ulangi `create extension` atau `grant` skema `cron`. Migrasi `20261027_overlay_live_pg_cron.sql` sudah memasangnya. Mengulang grant memicu `2BP01`.
- Jangan `drop extension` `pg_cron` atau `pg_net`.
- Jangan hapus baris `daily_briefs`.
- Jangan jalankan `supabase db push` yang memutar ulang migrasi lama.

## Urutan

Terapkan dari isi berkas di cabang ini sebelum merge. Merge lebih dulu menghapus jadwal Actions Daily Brief di default branch. Job `pg_cron` belum hidup, jadi kiriman otomatis berhenti.

1. Vault, lewat dasbor Supabase proyek produksi. Bukan lewat SQL di berkas ini.
2. Migrasi baru saja.
3. Bacaan verifikasi di bawah.
4. Merge #163 hanya setelah langkah 1–3 beres dan GO sudah tertulis.

Overlay sudah punya job `overlay-live-refresh`. Menghapus jadwal Actions overlay baru berlaku saat merge, dan tidak menunggu job Daily Brief.

## 1. Baris Vault

Di dasbor Supabase produksi, buka Vault, lalu tambah secret.

- **Name**, persis: `daily_brief_cron_secret`
- **Value**: salin dari env Vercel Production `DAILY_BRIEF_CRON_SECRET`. Jangan kirim nilai itu ke chat.

Cek keberadaan tanpa mencetak nilai. Hasil yang diharapkan: satu baris, kolom `name` saja.

```sql
select name
from vault.decrypted_secrets
where name = 'daily_brief_cron_secret'
  and decrypted_secret is not null
  and btrim(decrypted_secret) <> '';
```

Selama baris itu belum ada, job (kalau migrasi sudah hidup) selesai tanpa `net.http_post`.

## 2. Migrasi

Terapkan hanya `supabase/migrations/20261111_daily_brief_pg_cron.sql`, sebagai peran `postgres`, setelah GO.

Berkas itu:

- mencabut job `daily-brief-daily` bila nama itu sudah ada, lalu menjadwalkan `0 0 * * *` (00.00 UTC, 07.00 WIB);
- membaca nama Vault `daily_brief_cron_secret`, memakai `btrim`, dan kembali tanpa POST bila kosong;
- memanggil `POST https://aceh-tangguh.vercel.app/api/cron/daily-brief` dengan `timeout_milliseconds` 70000;
- tidak membuat ekstensi dan tidak memberi grant skema `cron`.

Rute menolak baris `daily_briefs` kedua untuk `brief_date` yang sama (`daily_briefs_date_unique`) dan hanya satu klaim `whatsapp_enqueued_at` yang kosong yang boleh mengirim.

## 3. Verifikasi, masih tanpa nilai secret

```sql
select jobid, jobname, schedule, active
from cron.job
where jobname = 'daily-brief-daily';
```

Harapan: satu baris, `schedule` = `0 0 * * *`, `active` = true.

```sql
select start_time, end_time, status
from cron.job_run_details
where jobid = (
  select jobid from cron.job where jobname = 'daily-brief-daily'
)
order by start_time desc
limit 5;
```

`status` = `succeeded` berarti SQL mengantri, bukan berarti HTTP 200. Run saat Vault masih kosong juga bisa `succeeded` tanpa POST.

```sql
select id, status_code, timed_out, error_msg, created
from net._http_response
order by created desc
limit 8;
```

Jangan tambah kolom `content` atau `headers`. Setelah Vault ada dan jam 07.00 WIB lewat, cari `status_code` 200 untuk kiriman Daily Brief yang utuh, atau 401 bila nilai Vault tidak sama dengan env Vercel (biasanya sisa baris baru). Jangan salin pesan itu ke chat bila memuat token.

```sql
select brief_date, count(*) as jumlah
from public.daily_briefs
group by brief_date
having count(*) > 1;
```

Harapan: tidak ada baris. Satu tanggal Jakarta satu brief.

## Rollback

Cabut job ini saja. Jangan cabut ekstensi. Jangan hapus brief.

```sql
select cron.unschedule(jobid)
from cron.job
where jobname = 'daily-brief-daily';
```

Perintah yang sama ada sebagai komentar di akhir berkas migrasi. Kalau PR sudah ter-merge, mencabut job tidak mengembalikan jadwal Actions. Itu butuh PR susulan, bukan suntingan produksi dari berkas ini.
