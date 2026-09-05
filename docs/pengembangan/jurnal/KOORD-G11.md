# KOORD-G11 — bacaan ulang koordinator gelombang 11

Agent: koordinator
Gelombang: 11
Status: selesai

## Niat

Membaca ulang DATA-8 dan AN-15. Kunci staging `_tmp_profil_sheet_apply`. Jangan hapus baris. Jangan DATA-4. Jangan merevoke fungsi peran.

## Bacaan ulang niat

Satu celah ERROR Data API. Bukan audit seluruh SECURITY DEFINER.

## Bukti

- DATA-8: `20260919_tmp_profil_sheet_rls.sql` hidup; RLS nyala; grant Data API kosong; 300 baris utuh; purge tidak EXECUTE oleh anon/authenticated.
- Advisor `rls_disabled_in_public` hilang. INFO `rls_enabled_no_policy` disengaja.
- AN-15: tiga uji sumber hijau.
- `npm test` 348; `tsc` hijau.

## Bacaan ulang bukti versus kriteria

- [x] Staging terkunci tanpa kebijakan Data API
- [x] Baris tidak dihapus
- [x] DATA-4 / POST nasional / P2 tidak dikode

## Keputusan

selesai
