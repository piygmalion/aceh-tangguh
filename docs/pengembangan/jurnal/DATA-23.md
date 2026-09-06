# DATA-23 — SIK GPS: `--accept-gps-quarantine` (tanpa timpa GPS)

Agent: data
Gelombang: GO SIK apply GPS (langkah 3; langkah 1 dry-run tertahan di VM)
Status: draf

## Niat

- Tujuan: Izinkan `--write-fixtures` ketika ada baris GPS quarantine **hanya** jika koordinat yang sudah ada tetap dipakai (SIK desimal >100 m tidak menimpa). Tanpa bendera, gerbang tulis tetap menolak. Hitung quarantine dicatat di `metadata.sik_merge`. Konflik atribut tetap non-blocking. Jangan mengarang GPS. Jangan `--apply` produksi. Jangan menulis fixture dari master yang tidak ada di VM.
- Berkas:
  - `scripts/lib/sik-apply.mjs` — parse `--accept-gps-quarantine`; gerbang tulis; `sik_merge.gpsConflicts`
  - `scripts/lib/sik-merge.mjs` — helper `quarantineKeepsExistingGps` (bukti keep-existing)
  - `scripts/import-sik-aceh.py` — teruskan bendera ke apply
  - `scripts/lib/sik-merge.test.mjs` — uji gerbang + keep GPS + metadata
  - `scripts/sik/SCHEMA.md`, `data/sik/README.md`, `README.md` — dokumentasi bendera
- Langkah:
  1. Langkah 1 (diminta dulu): dry-run `python3 scripts/import-sik-aceh.py` **tanpa** `--write-fixtures` / `--apply`. Jika `data/sik/sik_aceh.db` absen, catat blocker; jangan mengarang baris SIK.
  2. Langkah 3 (PR kecil): `--write-fixtures` + GPS conflict tanpa bendera → tetap exit 2.
  3. `--write-fixtures --accept-gps-quarantine` lolos **hanya** jika setiap baris `gpsConflicts` masih memakai GPS existing (bukan SIK).
  4. `metadata.sik_merge.gpsConflicts` = jumlah quarantine. Atribut conflict tidak memblokir.
  5. Jangan menghapus gerbang diam-diam. Jangan seed Supabase. Jangan invent koordinat.
- Cara membuktikan:
  - Perintah dry-run pada VM ini: error `sik_db_missing` (bukan angka merge karangan).
  - Uji baru: refuse tanpa bendera; tulis+keep GPS dengan bendera; metadata mencatat hitungan; overwrite SIK tetap ditolak meski bendera ada.
  - `node --test scripts/lib/sik-merge.test.mjs` hijau.
- Risiko:
  - Menghapus gerbang tanpa bendera akan menulis GPS SIK jauh — dilarang.
  - Bendera yang menimpa GPS SIK >100 m — dilarang; helper keep-existing wajib.
  - Dry-run sungguhan tidak bisa di VM tanpa `sik_aceh.db` — jangan isi hitungan dari tebakan.

## Bacaan ulang niat

Niat bisa dijalankan tanpa tebakan GPS: dry-run sungguhan hanya jika berkas db ada; jika tidak, blocker + PR gerbang saja. Kebijakan quarantine sudah terkunci di `classifyGps` (`decimal_gps_gt_100m` → `action: "quarantine"` → GPS existing tidak diubah). Bendera hanya membuka tulis fixture, bukan mengubah aturan GPS. `attributeConflicts` tetap tercatat dan tidak memblokir. Tidak ada `--apply`. Tidak ada DATA-4 / Tatonas / KRB.

## Perubahan

|

## Bukti

```
```

## Bacaan ulang bukti versus kriteria

- [ ] Dry-run langkah 1: db ada → hitungan matched/new/fillNull/gpsUpgrades/gpsConflicts/attributeConflicts + id `decimal_gps_gt_100m`; db absen → blocker jelas
- [ ] `--write-fixtures` tanpa `--accept-gps-quarantine` tetap ditolak jika ada GPS quarantine
- [ ] `--accept-gps-quarantine` mengizinkan tulis hanya jika GPS existing dipertahankan
- [ ] `sik_merge.gpsConflicts` mencatat jumlah quarantine
- [ ] Tidak ada `--apply` produksi; tidak ada GPS karangan

## Keputusan

lanjut
