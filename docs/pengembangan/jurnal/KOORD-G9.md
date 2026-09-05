# KOORD-G9 — bacaan ulang koordinator gelombang 9

Agent: koordinator
Gelombang: 9
Status: selesai

## Niat

Membaca ulang DATA-6, BE-12, FE-13, AN-13 versus AN-7. Tidak mengubah rumus PKD. Tidak DATA-4. Tidak POST nasional.

## Bacaan ulang niat

Satu gelombang pelaksana Destana. Kuesioner 128 tetap.

## Bukti

- DATA-6: `20260918_destana_dua_instrumen.sql` — dua tabel, sebaran = kode, RLS staf baca / desa+super tulis, tanpa DELETE, tanpa seed.
- BE-12: helper a–q + peta 32; GET/PATCH/PUT `/api/sik/destana/program`; 500 jika tabel error; NIK 16 digit ditolak; attack-surface diperbarui.
- FE-13: teks instrumen persis AN-7 di `/destana` id+en; form 17 huruf di konsol; kuesioner PKD tetap.
- AN-13: 6 subtes kontrak.
- Browser: `/id/destana` = `Instrumen transisi Perka BNPB 1/2012`; `/en/destana` = `Transitional instrument: BNPB Regulation 1/2012`; admin menampilkan huruf a–q.
- `npm test` 342; `tsc` hijau.

## Bacaan ulang bukti versus kriteria

- [x] Dua instrumen, tanpa skor baru
- [x] 17 huruf + SI Pasal 20
- [x] PKD tidak diubah
- [x] DATA-4 / POST nasional / P2 tidak dikode

## Keputusan

selesai
