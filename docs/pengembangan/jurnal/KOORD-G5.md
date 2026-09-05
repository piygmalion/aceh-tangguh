# KOORD-G5 — bacaan ulang koordinator gelombang 5

Agent: koordinator
Gelombang: 5
Status: selesai

## Niat

Membaca ulang jurnal AN-8 sebagai kontrak, lalu mencocokkan DATA-5, BE-9, BE-10, dan FE-9 ke naskah itu. Tidak mengerjakan DATA-4. Tidak mengode AN-7 Destana. Tidak POST ke `data.bnpb.go.id`. Tidak membuka P2 Juklak (Damkar, cetak, analisis).

## Bacaan ulang niat

Verifikasi, bukan implementasi baru. FE-9 hanya sah setelah BE-9 dan BE-10 selesai — sudah terpenuhi sebelum FE-9 dijalankan.

## Bukti

Kontrak AN-8 §1–§6 versus kode:

- DATA-5: migrasi baru `20260917_sdb_daerah.sql`. Tiga tabel, check, FK, unique `(kunci, periode_label)`, indeks validasi `(kejadian_id, created_at desc)`. RLS terpisah: katalog SELECT `is_staff` / tulis `is_walidata`; validasi SELECT `is_staff` / INSERT `is_ops` tanpa UPDATE/DELETE; jadwal SELECT `is_staff` / tulis `is_walidata`. Tanpa `ALL`, tanpa anon. `is_walidata()` 20260908 dipakai apa adanya. Seed 12 kunci sama tabel AN-8; `sangat_rahasia` hanya di CHECK, bukan nilai seed. Tidak ada `ALTER` `kejadian_operasi` / `overlay_calon_kejadian`.
- BE-9: GET katalog `requireStaffApi`, buang `sangat_rahasia`; PATCH katalog `canLockStatis` + `rejectCrossOrigin`, allowlist lima field; GET/POST validasi `requireOpsApi` + scope, `diterima` = 400, append-only; GET/POST/PATCH jadwal `canLockStatis`, status awal `terbuka`, `terlambat` dihitung di respons tanpa persist. Tipe di `db-tables.ts`; `types.ts` tidak di-generate. Calon / `crypto.ts` / `overlay-live` / `fase/route.ts` bukan tiket ini.
- BE-10: `evaluateKunciStatis` delapan butir murni; `findJenisByKode` (bukan tabel baru); checklist sebelum `.update`; gagal = 400 tanpa `rekap_statis` / `diterima`; lolos = `buildRekapStatis` + insert `diterima`; buka `statis` → `diajukan` = `dikembalikan`; insert validasi gagal setelah update = 500 (bukan rollback diam-diam). GET peringatan `requireOpsApi` + `matchesKabScope` + hari `Asia/Jakarta`. PATCH dinamis tanpa checklist. Helper tidak memuat korban / SK / KRB.
- FE-9: banner hanya jika `count > 0`; 401/403 diam; halaman `/admin/sik/sdb` guard modul `kejadian`; tautan dari daftar, bukan item `AdminShell`; GET katalog baca saja; namespace `sikSdb` 21 kunci id+en; `CalonKejadianList` tidak berubah.
- `is_walidata` ⊂ `is_ops` (super_admin / admin / admin_provinsi), jadi insert `sdb_validasi` oleh walidata lolos RLS INSERT `is_ops()`.
- `npm test` 314 lulus; `tsc --noEmit` lulus (koordinator, 4 September 2026).
- Browser: tidak diverifikasi. Tidak ada sesi staf; server :3122 tidak menjawab pada tiket FE-9.

Penyimpangan yang diterima (satu perilaku, tertulis):

- AN-8 §4.2 menulis GET jadwal kosong sebagai `[]`. BE-9 memakai `{ items: [] }` agar sepadan dengan GET SIK lain. FE-9 tidak memakai jadwal. Koordinator mengunci bentuk `{ items: [] }`.

## Bacaan ulang bukti versus kriteria

- [x] Dual-track: dinamis tanpa checklist; kunci statis delapan butir; calon AN-4/AN-6 tidak dilanggar
- [x] Tidak ada peran baru; `is_ops()` / `is_staff()` / `is_walidata()` tidak diperlebar
- [x] Tidak ada kolom baru di `kejadian_operasi` / `overlay_calon_kejadian`
- [x] Tidak ada POST nasional / DIBI id / Destana / DATA-4
- [x] FE-8 dan sidebar tidak diubah
- [x] Uji hijau
- [x] P2 Damkar / cetak / analisis tidak dibuka

## Catatan terbuka (bukan blocker gelombang 5)

DATA-4 menunggu jawaban penyedia (AN-3). Jangan dikerjakan.

AN-7 Destana tetap `siap-kode` di gelombang kemudian. Jangan dikode sampai koordinator membuka gelombang itu.

`panduan.s8.body` (en) masih menyebut GET `/api/hazards`.

UI SDB / banner / calon belum dicoba di browser dengan sesi staf.

Produksi perlu: migrasi `20260913`–`20260917`; `OVERLAY_CRON_SECRET` / `OVERLAY_REFRESH_URL`; opsional `LAPORAN_PII_KEY_ID` / `LAPORAN_PII_KEYS`. Tabel `sdb_*` (`20260917`) wajib sebelum katalog/banner/kunci-statis berguna di produksi. Jika `20260917` belum hidup, kunci/buka yang lolos checklist akan 500 pada insert `sdb_validasi` (kebijakan BE-10, bukan rollback).

## Keputusan

selesai
