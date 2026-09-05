# KOORD-G6 — bacaan ulang koordinator gelombang 6

Agent: koordinator
Gelombang: 6
Status: selesai

## Niat

Membaca ulang FE-10, BE-11, dan AN-9. Mencocokkan salinan metodologi, i18n daftar kejadian, inventaris attack-surface, dan naskah penerimaan produksi. Tidak mengerjakan DATA-4. Tidak mengode AN-7 Destana. Tidak POST ke `data.bnpb.go.id`. Tidak membuka P2 Juklak. Tidak memperbaiki `tsc` di berkas di luar tiket ini.

## Bacaan ulang niat

Verifikasi, bukan implementasi baru. Destana dan Tatonas tetap tertahan.

## Bukti

- FE-10: kunci JSON sisa hazards adalah `metodologi.s8.body` (bukan namespace GuideBot `panduan`). Kalimat penutup tidak lagi mengklaim `GET /api/hazards` hidup; `?hazard=` tetap alias filter jenis peta. Fakta tiga kartu Peringatan Dini tidak ditimpa. `KejadianOpsList` memakai `admin.statusAktif` / `statusSelesai` / `statusDiarsipkan` / `labelIsBencana`; tanggal memakai `useLocale()`. Banner SDB, tautan calon, fetch tidak diubah. `CalonKejadianList` / `AdminShell` tidak disentuh.
- BE-11: `security/attack-surface.md` mencatat calon, SDB katalog/jadwal, validasi (`diterima` = 400), peringatan dinamis, overlay publik GET, env `LAPORAN_PII_KEY_ID` / `LAPORAN_PII_KEYS`. Cron overlay-live tidak diduplikasi. `src/` tidak diubah. Bukan prosedur serangan.
- AN-9: naskah lima butir (migrasi `20260913`–`20260917`, secret overlay + PII opsional, 500 tanpa rollback, path wajib, non-tujuan). Tes `src/lib/security/attack-surface-inventory.test.ts` mengunci klaim hazards dan substring path.
- `npm test` 322 lulus (koordinator, 5 September 2026).
- `tsc --noEmit` gagal di luar tiket G6: `src/app/api/sik/public/route.ts` (Json vs string), `src/lib/panduan/match.test.ts`, `src/lib/panduan/page-context.ts`. Bukan berkas FE-10 / BE-11 / AN-9. Tidak diperbaiki di gelombang ini.
- Browser: tidak diverifikasi (tidak ada sesi staf).

## Bacaan ulang bukti versus kriteria

- [x] Klaim `GET /api/hazards` hidup hilang dari `metodologi.s8.body` id+en
- [x] Label status/bencana daftar kejadian lewat i18n; `?hazard=` tetap
- [x] Inventaris mencatat rute G2–G5 + env PII tanpa exploit
- [x] Naskah produksi mengunci migrasi, secret, 500, non-tujuan
- [x] Uji inventaris hijau
- [x] DATA-4 / AN-7 / POST nasional / P2 tidak dikode

## Catatan terbuka (bukan blocker gelombang 6)

DATA-4 menunggu jawaban penyedia (AN-3). AN-7 Destana tetap `siap-kode` di gelombang kemudian.

`tsc --noEmit` merah di rute publik SIK dan panduan (bukan tiket G6).

UI staf (calon / SDB / daftar kejadian) belum dicoba di browser dengan sesi.

Produksi: tetap butuh migrasi `20260913`–`20260917` plus secret overlay sebelum calon/SDB/kunci-statis berguna. Jika `20260917` belum hidup, kunci statis yang lolos checklist = 500 (AN-9 §3).

Kolom header `KIB` di daftar kejadian masih hardcoded — di luar FE-10.

## Keputusan

selesai
