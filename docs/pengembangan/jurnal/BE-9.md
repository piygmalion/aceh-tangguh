# BE-9 — API katalog, jadwal, validasi

Agent: backend
Gelombang: 5
Status: selesai

## Niat

- Tujuan: Mengekspos katalog, jejak validasi, dan kalender kirim persis `jurnal/AN-8.md` §2–§4 API. Jangan mengubah rute calon, `crypto.ts`, `overlay-live.ts`, `fase/route.ts`, atau `is_ops()`. Jangan generate `supabase/types.ts`.
- Berkas (hanya ini):
  - `src/lib/sik/db-tables.ts` — tipe baris `sdb_katalog`, `sdb_validasi`, `sdb_jadwal_kirim` di `SikTables`
  - `src/lib/sik/sdb.ts` — filter kelas akses staf, hitung `terlambat`, parser body
  - `src/lib/sik/sdb.test.ts` — tes sumber rute + tes murni filter/jadwal
  - `src/app/api/sik/sdb/katalog/route.ts` — GET
  - `src/app/api/sik/sdb/katalog/[kunci]/route.ts` — PATCH
  - `src/app/api/sik/sdb/jadwal/route.ts` — GET + POST
  - `src/app/api/sik/sdb/jadwal/[id]/route.ts` — PATCH `terkirim`
  - `src/app/api/sik/kejadian/[id]/validasi/route.ts` — GET + POST
  - `docs/pengembangan/jurnal/BE-9.md`
  - `docs/pengembangan/STATUS.md` — hanya baris BE-9
- Tidak diubah: `calon-kejadian/**`, `overlay-live.ts`, `crypto.ts`, `fase/route.ts`, `roles.ts` (`is_ops` / `canAccessModule` / `canLockStatis` tetap), migrasi, FE, `supabase/types.ts`.
- Skema tabel: kontrak AN-8 §3–§4 / DATA-5. Tiket ini tidak menulis SQL. Jika migrasi belum ada di repo, API tetap diketik di `SikTables`; klien `from(...)` memakai tipe itu (bukan generate `types.ts`).
- Langkah:
  1. GET `/api/sik/sdb/katalog` — `requireStaffApi` (staf termasuk desa/penilai/RR). Query opsional `kelas_akses=terbuka|terbatas|rahasia`. Nilai lain = 400. Selalu buang `sangat_rahasia` di filter (meski suatu saat ada baris). Tanpa GET publik. Respons `{ items }`.
  2. PATCH `/api/sik/sdb/katalog/[kunci]` — `rejectCrossOrigin` lalu `requireStaffApi` lalu `canLockStatis`. Body hanya `judul`, `konsep`, `definisi`, `satuan`, `periode_kirim`. Field lain (termasuk `kelas_akses`, `kunci`, `klaster`, `produsen`, `kode_referensi`, `tabel_sumber`) = 400. `periode_kirim` harus enum AN-8: `harian|bulanan|triwulan|semester|tahunan|insidental`. Minimal satu field sah.
  3. GET `/api/sik/kejadian/[id]/validasi` — `requireOpsApi` + `matchesKabScope` pada header kejadian. 404 jika kejadian tidak ada.
  4. POST `/api/sik/kejadian/[id]/validasi` — `rejectCrossOrigin` + `requireOpsApi` + scope. Body `{ status, catatan? }`. `status=diterima` = 400 (hanya otomatis BE-10). `status=diajukan` = scope + `fase_data` kejadian harus `diajukan`; insert append. `status=dikembalikan` = `canLockStatis` + `catatan` wajib (trim tidak kosong); insert append. Jangan UPDATE baris validasi lama. Jangan mengubah `fase_data` dari rute ini.
  5. GET `/api/sik/sdb/jadwal` — `requireStaffApi` + `canLockStatis`. Kosong = `{ items: [] }`. Jika `jatuh_tempo` (tanggal) `<` hari ini `Asia/Jakarta` dan status masih `terbuka`, tampilkan `status: "terlambat"` di respons. Hitung di GET; jangan persist; jangan cron.
  6. POST `/api/sik/sdb/jadwal` — `rejectCrossOrigin` + `canLockStatis`. Status awal `terbuka`. Unique `(kunci, periode_label)` → 409 jika bentrok. Body hanya `kunci`, `periode_label`, `jatuh_tempo`.
  7. PATCH `/api/sik/sdb/jadwal/[id]` — `rejectCrossOrigin` + `canLockStatis`. Hanya `status=terkirim`. Field lain atau `status` lain = 400. Jangan mengunci `fase_data` kejadian.
- Cara membuktikan:
  - Tes sumber: GET katalog memakai `requireStaffApi` (bukan `requireOpsApi` / `canLockStatis`). PATCH katalog / GET·POST·PATCH jadwal memakai `canLockStatis` + `rejectCrossOrigin` pada tulis. GET/POST validasi memakai `requireOpsApi` + `matchesKabScope`; POST memakai `rejectCrossOrigin`. POST `diterima` = 400. POST validasi tidak `.update(` pada `sdb_validasi`. Jadwal/validasi tidak menulis `fase_data`.
  - Tes murni: filter membuang `sangat_rahasia`; query tiga kelas staf; `terlambat` hanya jika `terbuka` dan `jatuh_tempo < today` Jakarta; hari ini masih `terbuka`.
  - Grep tiket: tidak menyentuh `calon-kejadian`, `crypto.ts`, `overlay-live`, `is_ops(`.
  - `npm test; npx tsc --noEmit` (PowerShell: `;` bukan `&&`).
- Risiko:
  - Membuka katalog ke anon — dilarang; hanya `requireStaffApi`.
  - Memperlebar `is_ops()` atau menambah peran — dilarang.
  - Menulis validasi `diterima` dari POST staf — 400.
  - Mengunci fase dari jatuh tempo jadwal — dilarang.
  - Persist `terlambat` atau cron G4 — dilarang.
  - Generate `types.ts` — dilarang.

## Bacaan ulang niat

AN-8 §4.2 menulis GET kosong sebagai `[]`; kontrak eksekusi tiket ini memakai `{ items: [] }` agar sepadan dengan GET dampak/SIK lain dan butir API wajib. GET katalog tidak memuat `sangat_rahasia` meskipun kolom CHECK DATA-5 mengizinkan nilai itu. `requireStaffApi` untuk katalog (desa/penilai boleh baca); `canLockStatis` untuk ubah katalog/jadwal; `requireOpsApi`+scope untuk validasi. `diterima` dan checklist delapan butir milik BE-10. UI calon milik FE-8. Migrasi DATA-5 bukan berkas tiket ini. Tidak commit. Tidak DATA-4. Tidak POST `data.bnpb.go.id`.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `src/lib/sik/db-tables.ts` | Tipe + `SikTables` untuk `sdb_katalog`, `sdb_validasi`, `sdb_jadwal_kirim` |
| `src/lib/sik/sdb.ts` | Filter kelas staf, `todayJakarta`, `terlambat` di respons, parser body |
| `src/lib/sik/sdb.test.ts` | Tes murni + tes sumber gerbang |
| `src/app/api/sik/sdb/katalog/route.ts` | GET `requireStaffApi` |
| `src/app/api/sik/sdb/katalog/[kunci]/route.ts` | PATCH walidata |
| `src/app/api/sik/sdb/jadwal/route.ts` | GET + POST walidata |
| `src/app/api/sik/sdb/jadwal/[id]/route.ts` | PATCH `terkirim` |
| `src/app/api/sik/kejadian/[id]/validasi/route.ts` | GET + POST append-only |
| `docs/pengembangan/STATUS.md` | Baris BE-9 → selesai |

## Bukti

Putaran 1 — niat dari AN-8 §2–§4 + API wajib tiket. Bacaan ulang: `{ items: [] }` untuk jadwal kosong; `sangat_rahasia` selalu dibuang; `diterima` 400; tanpa persist `terlambat`; tanpa generate `types.ts`.

Putaran 2 — tipe `SikTables`, helper `sdb.ts`, lima rute, tes murni + sumber.

```
node --import tsx --test src/lib/sik/sdb.test.ts
# tests 17, pass 17, fail 0

npx tsc --noEmit
# exit 0

npm test
# tests 314, pass 312, fail 2
# kedua gagal: src/lib/sik/kunci-statis.test.ts (BE-10 sumber rute —
# checklist fase + GET peringatan-dinamis). Bukan berkas tiket ini.
```

GET katalog: `requireStaffApi`, filter `sangat_rahasia`, query tiga kelas. PATCH katalog menolak `kelas_akses`. POST validasi `diterima` = 400; insert saja. GET jadwal menandai `terlambat` tanpa UPDATE. Tidak ada perubahan `calon-kejadian`, `crypto.ts`, `overlay-live.ts`, `fase/route.ts`, `roles.ts`, `types.ts`.

## Bacaan ulang bukti versus kriteria

- [x] Empat rute AN-8 §3.2 + §4 tanpa GET publik katalog
- [x] GET katalog `requireStaffApi`; filter `sangat_rahasia` keluar
- [x] PATCH katalog menolak field di luar lima yang diizinkan
- [x] POST validasi `diterima` = 400; append-only
- [x] GET jadwal kosong `{ items: [] }`; `terlambat` dihitung di respons
- [x] Calon / `crypto.ts` / `overlay-live` / `is_ops()` / `fase/route.ts` tidak berubah
- [x] Tes BE-9 + `tsc` hijau. `npm test` repo: 2 gagal milik BE-10 (`kunci-statis.test.ts`), di luar tiket
- [x] STATUS.md hanya baris BE-9

## Keputusan

selesai

