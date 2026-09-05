# KOORD-G7 — bacaan ulang koordinator gelombang 7

Agent: koordinator
Gelombang: 7
Status: selesai

## Niat

Membaca ulang FE-11 dan AN-10. `tsc` sudah hijau saat gelombang dibuka — bukan tiket ini. Tidak mengerjakan DATA-4. Tidak mengode AN-7 Destana. Tidak meni18n-kan seluruh halaman detail.

## Bacaan ulang niat

Verifikasi sisa i18n yang KOORD-G6 catat (header KIB + tanggal `id-ID`). Destana dan Tatonas tetap tertahan.

## Bukti

- FE-11: `admin.colKib` / `admin.labelBelowThreshold` saja. Daftar: header `t("colKib")`; status empat kunci `admin`; `fase_data` mentah. Calon: `useLocale()` tanpa kunci `sikCalon` baru. Detail: tanggal locale + suffix bencana/ambang; tombol fase/cetak/error tetap hardcoded.
- AN-10: `src/lib/sik/staff-locale.test.ts` mengunci `toLocaleString("id-ID")` di tiga komponen dan header JSX `KIB`.
- `npm test` 324 lulus; `tsc --noEmit` hijau (koordinator, 5 September 2026).
- Browser: 307 ke login; tidak diverifikasi.

## Bacaan ulang bukti versus kriteria

- [x] Header KIB dan tanggal staf lewat locale / kunci `admin`
- [x] `sikCalon` tidak ditambah kunci
- [x] Seluruh `KejadianOpsDetail` tidak di-i18n
- [x] Uji sumber hijau
- [x] DATA-4 / AN-7 / POST nasional / P2 tidak dikode

## Catatan terbuka (bukan blocker gelombang 7)

DATA-4 menunggu AN-3. AN-7 Destana tetap `siap-kode` di gelombang kemudian.

`KejadianOpsDetail` masih banyak string Indonesia hardcoded (tombol fase, error, cetak). Di luar G7.

Produksi: migrasi `20260913`–`20260917` + secret overlay masih wajib.

## Keputusan

selesai
