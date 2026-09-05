# KOORD-G10 — bacaan ulang koordinator gelombang 10

Agent: koordinator
Gelombang: 10
Status: selesai

## Niat

Membaca ulang DATA-7, FE-14, AN-14. Menerapkan migrasi yang sudah ada ke produksi. i18n Destana publik. Tidak DATA-4. Tidak POST nasional. Tidak menyunting SQL.

## Bacaan ulang niat

Satu gelombang: remote mengejar repo, halaman `/destana` berlocale. Bukan pemetaan Tatonas.

## Bukti

- DATA-7: sepuluh nama migrasi hidup di `whojoxrbcdyotrpolgav`; 15 pelabuhan; XB005 = 0; `destana_si` / `sdb_katalog` / `panduan_faq` ada.
- FE-14: `/id/destana` = Desa Tangguh Bencana; `/en/destana` = Disaster-Resilient Village + Home + Not assessed. `instrumentTransisi` utuh. `pkd.ts` tidak berubah.
- AN-14: naskah lima butir; `destana-acceptance.test.ts` hijau.
- `npm test` 345; `tsc` hijau.
- `_tmp_profil_sheet_apply` RLS tetap mati (di luar niat; nasihat keamanan ke koordinator).

## Bacaan ulang bukti versus kriteria

- [x] Migrasi repo diterapkan, tidak disunting
- [x] `/en/destana` bukan judul Indonesia
- [x] Naskah + uji Destana
- [x] DATA-4 / POST nasional / P2 tidak dikode

## Keputusan

selesai
