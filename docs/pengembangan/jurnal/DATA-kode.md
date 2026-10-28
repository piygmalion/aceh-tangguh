# DATA-kode — Kemendagri kunci join, kode_bps, betulkan 4 kode_sik

Agent: data
Gelombang: keputusan pemilik 2026-10-28 (di luar gelombang terbuka)
Status: selesai

## Niat

- Tujuan: Kunci join kabupaten adalah Kemendagri. Tambah `kode_bps` pada registri yang sudah ada. Selaraskan empat `kode_sik` yang tertukar terhadap `adm2`. Jangan mengarang kode. Jangan tulis basis data, jangan bangun ulang ubin, jangan menambah baris.
- Berkas: `public/fixtures/aceh-kabupaten-registry.json`, `src/lib/aceh-kabupaten.ts` (tipe dan konstanta registri), `scripts/check-kab-kode.mjs`, `scripts/check-kab-kode.test.mjs`, uji yang mengunci pasangan lama, `docs/pengembangan/jurnal/data-kode-scheme/keputusan.md`, penunjuk di `usulan.md`.
- Langkah: Cocokkan nama registri ke `boundaries-aceh-kab.geojson`. Isi `kode_bps` hanya jika padanan unik. Tukar hanya Tamiang 1114→1116, Jaya 1116→1114, Langsa 1173→1174, Lhokseumawe 1174→1173. Biarkan fungsi join apa adanya.
- Cara membuktikan: `node scripts/check-kab-kode.mjs` keluar 0. Uji registri dan KRB yang menyentuh empat kode itu lulus.
- Risiko: Profil staf yang menyimpan `1114` = Aceh Tamiang tidak dimigrasi. `resolveAdm2("1114")` sekarang mengenai Aceh Jaya. Tilikan sekarang mengikuti `adm2` registri.

## Bacaan ulang niat

Niat bisa dijalankan tanpa menebak. BPS diambil dari `kode_kab` berkas batas yang namanya cocok, bukan dari aritmetika Kemendagri. Empat nilai baru adalah `adm2` yang sudah ada, tanpa titik. Fungsi `resolveAdm2` dan saringan kecamatan tidak disunting. Ubin, SQL, dan baris fixture lain di luar registri tidak disentuh.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `public/fixtures/aceh-kabupaten-registry.json` | Empat `kode_sik` diselaraskan; kolom `kode_bps`; metadata bukan lagi label BPS |
| `src/lib/aceh-kabupaten.ts` | Tipe dan konstanta yang sama. Peta cari tidak memakai `kode_bps` |
| `scripts/check-kab-kode.mjs` | Pemeriksaan baca-saja |
| `src/lib/aceh-kabupaten.test.ts`, `src/lib/krb-by-kab.test.ts` | Harapan uji mengikuti registri yang sudah selaras |
| `docs/pengembangan/jurnal/data-kode-scheme/keputusan.md` | Keputusan 2026-10-28 |
| `supabase/migrations/20261028_overlay_calon_kode_kemendagri.sql` | UPDATE idempoten empat pasangan lama di `overlay_calon_kejadian`. Tidak dijalankan ke basis data hidup |
| `src/lib/overlay-calon.ts` | Penulis `kode_kabupaten` memakai digit `adm2`, bukan `kode_sik` |

## Bukti

```
node scripts/check-kab-kode.mjs
# check-kab-kode: 23 kab/kota, unique Kemendagri, unique kode_bps, kode_sik aligned

npm test
# tests 1027
# pass 1027
# fail 0
```

Padanan nama batas: 23/23 unik. Tidak ada `kode_bps` null.

## Bacaan ulang bukti versus kriteria

- [x] 23 kab/kota
- [x] Kemendagri (`adm2`) unik dan tidak diubah
- [x] `kode_bps` unik dan sama dengan `kode_kab` batas
- [x] `kode_sik` tidak lagi tertukar terhadap Kemendagri
- [x] Tidak ada tulis DB, ubin, atau baris baru

## Keputusan

selesai
