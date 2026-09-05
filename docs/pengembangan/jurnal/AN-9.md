# AN-9 — naskah penerimaan produksi G2–G5

Agent: analis
Gelombang: 6
Status: selesai

## Niat

- Tujuan: Mengunci penerimaan produksi gelombang 2–5 (migrasi, secret, 500 `sdb_validasi`, inventaris path, non-tujuan) plus uji inventaris. Tiket ini tulisan + tes baca berkas. Tidak mengubah rumus PKD, overlay, `crypto.ts`, UI, migrasi, `messages/**`, atau `security/attack-surface.md`.
- Berkas:
  - `docs/pengembangan/jurnal/AN-9.md` — niat + naskah + bukti
  - `src/lib/security/attack-surface-inventory.test.ts` — uji inventaris baru
  - Baris AN-9 saja di `docs/pengembangan/STATUS.md`
- Tidak diubah: `crypto.ts`, overlay, PKD, UI, migrasi, `messages/**`, `security/attack-surface.md`, Destana (AN-7), DATA-4, FE-10, BE-11.
- Langkah:
  1. Tulis niat lima butir wajib + uji, tanpa langkah serangan.
  2. Baca ulang niat; hapus tebakan SQL, nilai secret, Destana, POST nasional.
  3. Tulis naskah satu perilaku per butir (nama berkas migrasi, nama env, 500 BE-10, path inventaris, non-tujuan).
  4. Tulis tes yang gagal jika `metodologi.s8.body` id+en (brief: `panduan.s8.body`) masih mengandung `GET /api/hazards`, dan gagal jika `security/attack-surface.md` tidak memuat path SDB / calon / peringatan / cron overlay.
  5. `npm test` ; `npx tsc --noEmit`. Jangan merapikan pesan/attack-surface jika tes merah (itu FE-10 / BE-11).
  6. STATUS: `siap-kode` jika naskah lengkap; `selesai` hanya jika tes hijau.
- Cara membuktikan:
  - Naskah punya tepat lima butir, satu perilaku masing-masing.
  - Tes baru ada di wilayah analis (`src/lib/security/attack-surface-inventory.test.ts`).
  - Tes tidak menulis langkah serangan, payload, atau PoC.
  - `git diff` tiket ini tidak menyentuh `messages/**`, `security/attack-surface.md`, `crypto.ts`, overlay, PKD, UI, migrasi.
- Risiko:
  - Merapikan `panduan.s8.body` atau attack-surface sendiri — dilarang (FE-10 / BE-11).
  - Mengulang isi SQL migrasi — dilarang; sebut nama berkas.
  - Menulis nilai secret atau langkah exploit — dilarang.
  - Membuka DATA-4, AN-7 Destana, POST `data.bnpb.go.id`, P2 Damkar/cetak/analisis, perluasan `is_ops()`, kolom baru `kejadian_operasi` — dilarang.

## Bacaan ulang niat

Niat bisa dijalankan tanpa tebakan. Lima butir = daftar penerimaan, bukan opsi. Migrasi = nama berkas `20260913`–`20260917` di `supabase/migrations/`, bukan cuplikan SQL. Secret = nama `OVERLAY_CRON_SECRET`, `OVERLAY_REFRESH_URL`, `LAPORAN_PII_KEY_ID`, `LAPORAN_PII_KEYS`. Perilaku 500 = kebijakan BE-10 yang sudah ada di `fase/route.ts` (insert `sdb_validasi` setelah update; gagal → 500, bukan rollback diam-diam) jika `20260917_sdb_daerah.sql` belum hidup. Path = kontrak teks untuk BE-11, bukan prosedur uji tembus. Uji boleh merah sampai FE-10/BE-11 merapikan teks. Jangan Destana. Jangan DATA-4.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `docs/pengembangan/jurnal/AN-9.md` | Naskah penerimaan + bukti |
| `src/lib/security/attack-surface-inventory.test.ts` | Uji `panduan.s8.body` + substring path attack-surface |
| `docs/pengembangan/STATUS.md` | Hanya baris AN-9 |

## Naskah (penerimaan produksi G2–G5)

Satu perilaku per butir. Jangan menambah opsi. Jangan menulis langkah serangan.

### 1. Migrasi wajib sebelum calon / SDB / kunci-statis berguna

**Perilaku.** Produksi tidak berguna untuk UI calon, katalog/banner SDB, atau kunci-statis sampai kelima berkas migrasi ini diterapkan di proyek Supabase produksi. Sebut nama berkas; jangan mengulang isi SQL.

| Berkas |
| --- |
| `supabase/migrations/20260913_overlay_live_ttl.sql` |
| `supabase/migrations/20260914_laporan_pii_is_ops.sql` |
| `supabase/migrations/20260915_overlay_calon_kejadian.sql` |
| `supabase/migrations/20260916_overlay_live_refresh.sql` |
| `supabase/migrations/20260917_sdb_daerah.sql` |

Tanpa `20260915_overlay_calon_kejadian.sql`, calon tidak punya tabel. Tanpa `20260917_sdb_daerah.sql`, katalog / jadwal / insert `sdb_validasi` (kunci-statis) tidak punya tabel. Kelima berkas adalah satu gerbang penerimaan: jangan menandai produksi siap calon/SDB/kunci-statis jika salah satu belum diterapkan.

### 2. Secret overlay dan env PII opsional

**Perilaku.** Cron overlay live memakai dua nama env, tanpa nilai di naskah ini: `OVERLAY_CRON_SECRET` (Bearer `POST /api/cron/overlay-live`) dan `OVERLAY_REFRESH_URL` (variabel GitHub Actions, URL target cron). Rotasi PII memakai dua nama opsional: `LAPORAN_PII_KEY_ID` dan `LAPORAN_PII_KEYS`. Jangan menulis nilai. Jangan menulis cara menebak atau mengganti secret.

`OVERLAY_CRON_SECRET` kosong → rute cron 503; workflow melewati POST. Itu konfigurasi, bukan celah yang diuji di tiket ini.

### 3. `20260917` belum hidup → 500, bukan rollback diam-diam

**Perilaku.** Jika `supabase/migrations/20260917_sdb_daerah.sql` belum diterapkan, `POST /api/sik/kejadian/[id]/fase` ke `statis` yang sudah lolos checklist delapan butir tetap meng-update `fase_data`, lalu gagal pada insert `sdb_validasi` `diterima`. Respons = HTTP 500 (pesan `fase sudah statis tetapi sdb_validasi gagal: …`). Bukan 200. Bukan mengembalikan fase ke `dinamis` diam-diam. Kebijakan BE-10; jangan diubah di tiket ini.

Cabang buka kunci (`statis` → `diajukan`) memakai kebijakan yang sama: insert `sdb_validasi` `dikembalikan` gagal → 500 (`fase sudah dibuka tetapi sdb_validasi gagal: …`).

### 4. Path wajib di `security/attack-surface.md`

**Perilaku.** Inventaris harus memuat path berikut (kontrak teks untuk BE-11). Bukan prosedur serangan.

| Path yang wajib tertulis |
| --- |
| `/api/sik/calon-kejadian` |
| `/api/sik/sdb/katalog` |
| `/api/sik/sdb/jadwal` |
| `/api/sik/kejadian/[id]/validasi` |
| `/api/sik/kejadian/peringatan-dinamis` |
| `/api/cron/overlay-live` |

Analis tidak menyunting `security/attack-surface.md`. Jika substring belum ada, uji inventaris merah sampai BE-11 menulisnya.

### 5. Non-tujuan

**Perilaku.** Tiket ini dan penerimaan G2–G5 tidak mengerjakan:

- DATA-4 (pemetaan `loggerKind` Tatonas; menunggu jawaban AN-3)
- AN-7 Destana
- POST ke `data.bnpb.go.id`
- P2 Juklak Damkar / cetak / analisis
- Perluasan `is_ops()`
- Kolom baru pada `kejadian_operasi`

### Uji inventaris

Berkas: `src/lib/security/attack-surface-inventory.test.ts`.

| Gagal jika | Syarat |
| --- | --- |
| Klaim rute hazards hidup | `metodologi.s8.body` di `messages/id.json` **atau** `messages/en.json` mengandung `GET /api/hazards` (brief/KOORD menyebut kunci ini `panduan.s8.body`; namespace JSON-nya `metodologi`) |
| Inventaris path kurang | `security/attack-surface.md` tidak memuat substring `/api/sik/sdb/katalog`, `/api/sik/sdb/jadwal`, `/api/sik/calon-kejadian`, `/api/sik/kejadian/peringatan-dinamis`, `/api/cron/overlay-live` |

`?hazard=` sebagai alias filter peta boleh tetap ada. Tes tidak menulis langkah serangan. Jika FE-10 / BE-11 belum merapikan teks, tes boleh merah; analis tidak memperbaiki pesan atau attack-surface.

## Bukti

Putaran 1 — niat + naskah lima butir. Putaran 2 — tes inventaris; kunci JSON `metodologi.s8.body` (brief: `panduan.s8.body`). Putaran 3 — `assert.equal(typeof …)` tidak menarrow tipe; diganti `if (typeof body !== "string") throw`.

FE-10 sudah merapikan `metodologi.s8.body` (id+en): tidak ada `GET /api/hazards`; `?hazard=` tetap alias filter. BE-11 sudah menulis path wajib di `security/attack-surface.md` (termasuk `/api/sik/kejadian/[id]/validasi` dan env `LAPORAN_PII_KEY_ID` / `LAPORAN_PII_KEYS`). Analis tidak menyunting kedua permukaan itu.

```
npm test
# tests 316
# pass 316
# fail 0

npx tsc --noEmit
# TEST_EXIT=0
# TSC_EXIT=2
# src/lib/panduan/context.ts(57,3): error TS2741: Property 'tatonasEmpty' is missing
```

Uji AN-9 (dua subtes) lulus. `tsc` merah di `src/lib/panduan/context.ts` — `GuideContext.peringatan` menuntut `tatonasEmpty`, `summarizePeringatan` tidak mengisinya. Bukan berkas AN-9. Tidak diperbaiki di tiket ini.

Tidak diubah: `crypto.ts`, overlay, PKD, UI, migrasi, `messages/**`, `security/attack-surface.md`.

## Bacaan ulang bukti versus kriteria

- [x] Butir 1 — nama berkas migrasi `20260913`–`20260917`, bukan isi SQL
- [x] Butir 2 — nama secret overlay + PII opsional saja
- [x] Butir 3 — 500 insert `sdb_validasi`, bukan rollback diam-diam
- [x] Butir 4 — path wajib tercatat untuk BE-11
- [x] Butir 5 — non-tujuan DATA-4 / AN-7 / POST nasional / P2 / `is_ops()` / kolom baru
- [x] Uji inventaris ada; tidak merapikan `messages/**` atau attack-surface
- [x] `npm test` hijau (316/316), termasuk dua subtes AN-9
- [ ] `npx tsc --noEmit` — gagal di luar tiket (`src/lib/panduan/context.ts`)

## Keputusan

selesai — naskah lengkap; tes inventaris hijau. Blocker `tsc` tercatat, bukan milik AN-9.
