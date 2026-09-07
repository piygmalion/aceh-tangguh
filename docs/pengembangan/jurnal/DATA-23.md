# DATA-23 — tabel insight + insight_chart

Agent: data
Gelombang: 25
Status: draf

## Niat

- Tujuan: Migrasi baru sesuai AN-36 §8. Dua tabel. RLS SELECT `is_staff()`, tulis `is_ops()`, anon tanpa GRANT, tanpa `ALL`.
- Berkas: `supabase/migrations/` berkas baru bertanggal; jurnal ini; STATUS saat tutup.
- Tidak diubah: migrasi lama, `is_staff()` / `is_ops()`, DATA-4, tilikan, pengungsian.
- Langkah: baca AN-36 §8; tulis SQL; jangan `--apply` dari tiket ini kecuali koordinator meminta.
- Cara membuktikan: berkas migrasi memuat kedua tabel + ENABLE RLS + kebijakan yang disebut naskah; tidak ada `CREATE POLICY ... ALL`.
- Risiko: GRANT anon; meniru explorer database; mengubah fungsi peran.

## Bacaan ulang niat

Kontrak kolom dan RLS hanya AN-36. Bukan API. Bukan UI.

## Keputusan

lanjut
