# KOORD-G36 — rencana unggah berkas staf CMS

Agent: ecc
Gelombang: 36
Status: selesai

Tulisan koordinator. Bukan kode `src/`. Kontrak perilaku ada di [AN-49.md](AN-49.md). Jangan DATA-4. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan menimpa `POST /api/laporan/upload`. Jangan menimpa jurnal AN-45 / FE-50 yang sudah ada, atau C1 (AN-47 / BE-35 / AN-48).

## Niat

- Tujuan: Membuka gelombang pengembangan **unggah berkas staf** untuk foto sampul CMS, memakai pola yang sudah hidup pada laporan, tanpa mengulang BE-2 dan tanpa mencampur objek ke `laporan-media`.
- Berkas: jurnal ini; [AN-49.md](AN-49.md); baris G36 di `STATUS.md`, `00-protokol.md`, brief `01`–`04`. Tiket ini tidak menyunting `src/`.
- Langkah: riset search-first; kunci keputusan Adopt/Extend/Reject; tulis naskah AN-49; daftar tiket DATA/BE/FE/AN uji; baca ulang.
- Cara membuktikan: setiap keputusan di bawah merujuk berkas atau tiket yang sudah ada; agent wilayah tidak perlu menebak bucket, MIME, atau gerbang auth.
- Risiko: menaruh unggahan publik ke bucket PII; membuka TUS/Uppy tanpa kebutuhan; mengizinkan SVG/HTML; mengarang zona KRB lewat unggah poligon; menabrak ID yang sudah dipakai (AN-45, BE-34, FE-50).

## Bacaan ulang niat

G36 hanya foto sampul staf (JPEG/PNG/WebP) lewat `requireSuperAdminApi`. Laporan warga, video, PDF, katalog `krb_dokumen`, PMTiles, dan cron tile S3 tidak masuk gelombang ini. `sharp` dan magic bytes sudah ada; jangan menambah codec. ID: AN-49 / DATA-28 / BE-36 / FE-51 / AN-50.

## Search-first (pra-arsitektur)

| Saluran | Hasil |
| --- | --- |
| Repo | `POST /api/laporan/upload` + `magic-bytes` + `reencodeImageWithoutMeta` + bucket `laporan-media` + GC 48 jam. CMS menulis `foto_sampul_url` sebagai teks. |
| npm | `sharp` sudah di `package.json`. Tidak perlu `tus-js-client` / Uppy untuk cap ≤ 5 MiB. |
| Supabase Storage | Unggah standar + kebijakan bucket; TUS untuk >6 MiB. G36 di bawah ambang itu. Bucket publik = GET tanpa auth, tulis tetap perlu kebijakan. |
| Skill | `security-review` (ukuran/tipe/bukan `file.type` klien); `tdd-workflow` (RED/GREEN di AN-50); `aceh-pengembangan-protokol` (naskah dulu). |

| Kandidat | Keputusan |
| --- | --- |
| Pola laporan (FormData → Next → service role → UUID path) | **Extend** ke bucket baru `cms-media` |
| `sharp` + magic bytes | **Adopt** apa adanya; field CMS terpisah |
| TUS / Uppy / unggah langsung browser→Storage | **Reject** (deps baru, kebijakan anon, di luar cap) |
| Menaruh objek CMS di `laporan-media` | **Reject** (RLS `is_ops()`, GC laporan, PII) |
| PDF / SVG / video staf | **Reject** G36 (gelombang kemudian jika naskah baru) |

## Tiket (urutan)

1. AN-49 naskah (selesai sebagai tulisan).
2. DATA-28 migrasi bucket + kebijakan — jangan sunting SQL lama.
3. BE-36 `POST /api/admin/cms/upload` — setelah DATA-28.
4. FE-51 pemilih berkas pada kolom URL sampul — setelah BE-36.
5. AN-50 uji penerimaan + inventaris + tutup STATUS.

Jangan kode DATA/BE/FE sebelum AN-49 dibaca ulang. Jangan G32. Jangan DATA-4. Jangan C1.

## Perubahan

| Berkas | Isi |
| --- | --- |
| jurnal ini | keputusan + urutan |
| AN-49 | kontrak |
| DATA-28 / BE-36 / FE-51 / AN-50 | kerangka niat |
| STATUS / 00-protokol / brief 01–04 | Gelombang 36 |

## Bukti

Riset: rute laporan, CMS `requireSuperAdminApi`, kolom `foto_sampul_url`. Tidak ada unggah staf di pohon API selain laporan. ID G36 = AN-49 / DATA-28 / BE-36 / FE-51 / AN-50 agar tidak menimpa jurnal yang sudah ada. Tidak commit.

## Bacaan ulang bukti versus kriteria

- [x] Search-first tercatat; TUS ditolak dengan alasan ukuran
- [x] Bucket CMS terpisah dari laporan
- [x] Naskah AN-49 ada sebelum kode
- [x] DATA-4 / Juklak / overlay / Tatonas / C1 tidak dibuka

## Keputusan

selesai
