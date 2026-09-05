# KOORD-G12 — bacaan ulang koordinator gelombang 12

Agent: koordinator
Gelombang: 12
Status: selesai

## Niat

Membaca ulang DATA-9 dan AN-16. Cabut Data API pada dua RPC definer tulis. Jangan merevoke fungsi peran. Jangan DATA-4.

## Bacaan ulang niat

Dua fungsi tulis. Bukan secret cron. Bukan Tatonas.

## Bukti

- DATA-9: `20260920` hidup; anon/authenticated tidak EXECUTE `next_laporan_nomor` / `upsert_marker_features`; service_role tetap; `is_staff`/`is_ops` tidak berubah.
- AN-16: dua uji sumber hijau.
- `npm test` 350; `tsc` hijau.

## Bacaan ulang bukti versus kriteria

- [x] Data API tidak EXECUTE RPC tulis
- [x] Fungsi peran utuh
- [x] DATA-4 / POST nasional / P2 tidak dikode

## Keputusan

selesai
