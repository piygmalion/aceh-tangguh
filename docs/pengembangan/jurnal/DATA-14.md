# DATA-14 — registri kab kanonik

Agent: data
Gelombang: ECC-S2
Status: selesai

## Niat

- Tujuan: Satu fixture 23 baris (`kode_sik`, `adm2`, `slug`, `nama`, `is_kota`) dari juklak + weather yang sudah ada. Bukan tebakan kode baru. `ACEH_KABUPATEN` turunan registri.
- Berkas: `public/fixtures/aceh-kabupaten-registry.json`, `src/lib/aceh-kabupaten.ts`, `src/lib/aceh-kabupaten.test.ts`, `src/lib/sik/juklak.ts`, `src/lib/krb-by-kab.ts`.
- Tidak diubah: `matchesKabScope`; `20260923`; DATA-4.

## Bacaan ulang niat

Naskah AN-27. Empat pasang tertulis. Join lewat `sikKodeToAdm2` / `resolveAdm2`, bukan `toDottedKabKode` sebagai identitas. Siap kode.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `aceh-kabupaten-registry.json` | 23 baris kanonik |
| `aceh-kabupaten.ts` | helper `sikKodeToAdm2` / `adm2ToSikKode` / `resolveAdm2` |
| `juklak.ts` | `ACEH_KABUPATEN` turunan registri; urutan + 23 kode sama |
| `krb-by-kab.ts` | `lookup*` memakai `resolveAdm2` |

## Bukti

Uji `aceh-kabupaten.test.ts`: 23 baris = juklak; Tamiang `1114` → `11.16`; weather `adm2`/`slug` = registri. `matchesKabScope` tidak diubah di tiket ini (perilaku tetap, ekstrak di BE-23).

## Bacaan ulang bukti versus kriteria

- [x] 23 baris; kode staf tidak ditukar
- [x] Empat pasang gagal jika `toDottedKabKode` dipakai sebagai identitas
- [x] Juklak turunan; urutan sama

## Keputusan

selesai
