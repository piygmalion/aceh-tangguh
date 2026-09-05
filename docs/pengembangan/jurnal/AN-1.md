# AN-1 — uji matriks otorisasi

Agent: analis
Gelombang: 1
Status: selesai

## Niat

- Tujuan: Mengunci dua celah P0 (DELETE kejadian lintas kabupaten; GET dampak lintas kabupaten) dan tabel peran/modul di brief, lewat uji fungsi murni. Jika `matchesKabScope`, `canLockStatis`, atau `canAccessModule("moderasi")` dihapus atau dilonggarkan menjadi selalu izinkan, uji harus gagal.
- Berkas:
  - `src/lib/sik/roles.ts` — hanya jika perlu mengekstrak fungsi murni yang merumuskan keputusan DELETE/GET dampak, tanpa mengubah aturan yang sudah ada di rute
  - `src/lib/sik/roles.test.ts` — uji tabel `matchesKabScope` / `canLockStatis` / keputusan hapus dan baca dampak
  - `src/lib/auth/admin.ts` — hanya jika perlu mengekstrak keputusan modul staf (GET laporan PII = modul `moderasi`)
  - `src/lib/auth/admin.test.ts` — uji `canAccessModule("moderasi")` / keputusan modul
  - `src/lib/security/public-post.test.ts` — uji bahwa `guardPublicPost` hanya origin + kuota, bukan gerbang PII moderasi
  - Tidak mengubah rute API, overlay, ETL, `messages`, atau komponen UI
- Langkah:
  1. Ekstrak (jika rute sulit diuji) fungsi murni yang menyalin urutan keputusan rute: cek `matchesKabScope` dulu, lalu kunci `fase_data === "statis"` lewat `canLockStatis`. GET dampak hanya `matchesKabScope` pada header kejadian.
  2. Tulis uji tabel sesuai brief (enam baris). Kabupaten contoh: kode `1101` versus `1171` (sudah dipakai uji Juklak; bukan tebakan data baru).
  3. Hapus kejadian kab sendiri: izinkan jika fase bukan `statis`; `statis` → 409 kecuali `canLockStatis`.
  4. GET laporan PII: `admin_desa` dan `penilai_pkd` ditolak modul `moderasi`; `admin_provinsi` diizinkan. Tidak menambah peran ke tabel.
  5. Uji kehadiran panggilan `matchesKabScope` pada rute DELETE kejadian dan GET dampak, supaya menghapus guard di rute juga menggagalkan uji.
  6. Tidak mengerjakan AN-4 (naskah sinyal→kejadian) di gelombang 1.
- Cara membuktikan:
  - `npm test` hijau, termasuk berkas uji baru.
  - Enam baris tabel brief tertutup oleh asser.
  - Menghapus atau membalik `matchesKabScope` / `canLockStatis` / `canAccessModule("moderasi")` akan meruntuhkan uji (dibuktikan oleh asser yang menuntut tolak pada lintas kab dan desa/PKD).
  - `git diff` rute API dan komponen UI kosong untuk tiket ini.
- Risiko:
  - Mengubah aturan produksi saat mengekstrak — dihindari: salin urutan dan pesan yang sudah ada di rute, jangan “memperbaiki” kab tanpa kode wilayah.
  - Menguji rute lewat HTTP — dihindari; rute sulit diuji tanpa Next/Supabase.
  - Menebak pemetaan Tatonas atau mengerjakan AN-4 — tidak.

## Bacaan ulang niat

Niat bisa dijalankan tanpa tebakan data resmi. Dua P0 = `matchesKabScope` gagal pada kab A vs kejadian kab B; hapus `statis` = 409 kecuali `canLockStatis`. PII = modul `moderasi`, bukan `guardPublicPost`. Ekstraksi hanya menyalin aturan rute. Uji kehadiran guard di berkas rute boleh membaca sumber rute, bukan mengubahnya. AN-4 tidak dibuat.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `src/lib/sik/roles.ts` | Ekstrak `authorizeKejadianDelete` dan `authorizeDampakRead` — urutan dan status sama dengan rute |
| `src/lib/sik/roles.test.ts` | Tabel brief + uji kehadiran guard di rute DELETE/GET dampak |
| `src/lib/auth/admin.ts` | Ekstrak `authorizeStaffModule`; `requireModuleApi` memanggilnya (403 `forbidden` tetap) |
| `src/lib/auth/admin.test.ts` | PII = modul `moderasi`; desa/PKD tolak, provinsi izinkan |
| `src/lib/security/public-post.test.ts` | `guardPublicPost` = origin + kuota, bukan gerbang PII |

## Bukti

Putaran 1.

```
node --import tsx --test src/lib/sik/roles.test.ts src/lib/auth/admin.test.ts src/lib/security/public-post.test.ts
# tests 15
# pass 15
# fail 0
```

Tabel brief:

| kasus | asser |
| --- | --- |
| hapus kab lain | `matchesKabScope` false; `authorizeKejadianDelete` 403 |
| hapus kab sendiri, fase dinamis/diajukan | `authorizeKejadianDelete` ok |
| hapus `statis` | kabkota 409 (`canLockStatis` false); provinsi/legacy `admin` ok |
| baca dampak kab lain | `authorizeDampakRead` 403; kab sendiri ok |
| GET PII desa / PKD | `canAccessModule(..., "moderasi")` false; `authorizeStaffModule` 403 |
| GET PII provinsi | `canAccessModule` / `authorizeStaffModule` true |

Rute DELETE dan GET dampak masih memuat `matchesKabScope` (DELETE juga `canLockStatis`). Rute laporan GET masih `requireModuleApi("moderasi")`. Fungsi baru menyalin pesan/status rute; rute tidak disunting pada tiket ini.

## Bacaan ulang bukti versus kriteria

- [x] Uji tabel lulus (enam baris brief) — 15 uji, 0 gagal
- [x] Dua celah P0 tertangkap jika guard dihapus — uji menuntut tolak lintas kab; uji sumber menuntut panggilan `matchesKabScope` di kedua rute
- [x] `npm test` hijau — 214 lulus, 0 gagal (setelah AN-2/AN-3)
- [x] Tidak mengubah perilaku produksi kecuali ekstraksi — `requireModuleApi` tetap 403 `forbidden`; rute API tidak disunting

## Keputusan

selesai
