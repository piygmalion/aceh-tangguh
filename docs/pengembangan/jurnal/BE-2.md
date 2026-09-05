# BE-2 — hapus metadata EXIF unggahan laporan

Agent: backend
Gelombang: 1
Status: selesai

## Niat

- Tujuan: Foto pelapor tidak boleh menyimpan GPS atau perangkat. Buffer yang masuk `storage.upload` harus hasil enkode ulang, bukan salinan byte-identik JPEG ber-EXIF.
- Berkas:
  - `src/lib/laporan/strip-image-meta.ts` — helper enkode ulang JPEG/PNG/WebP.
  - `src/lib/laporan/strip-image-meta.test.ts` — fixture JPEG kecil ber-EXIF; unggahan non-gambar ditolak.
  - `src/app/api/laporan/upload/route.ts` — panggil helper sebelum `storage.upload`; video tetap setelah magic bytes.
- Dependensi (belum ada di `package.json`): menambah `sharp`. Tidak ada codec gambar di dependensi langsung. Satu pustaka menutup JPEG/PNG/WebP, membuang EXIF/GPS secara bawaan, dan `.rotate()` menerapkan orientasi sebelum metadata dibuang agar foto tetap tegak. Alternatif lebih ringan (`jpeg-js`) tidak menutup WebP. Tidak mengubah kebijakan bucket.
- Langkah:
  1. Validasi magic bytes tetap di rute (tipe, ukuran, field).
  2. Jika MIME gambar (jpeg/png/webp): `sharp(buffer).rotate()` lalu enkode ulang ke MIME yang sama tanpa `.withMetadata()`.
  3. Jika enkode ulang gagal, atau field `foto` tetapi hasil bukan gambar: HTTP 400, tidak diunggah.
  4. Video: tidak dienkode ulang; tetap ditolak jika magic bukan video.
  5. `storage.upload` memakai buffer hasil enkode (gambar) atau buffer asli (video). Respons `size`/`mime` mengikuti buffer yang diunggah.
- Cara membuktikan:
  - Uji: JPEG 8×8 dengan EXIF/GPS → buffer keluaran ≠ byte-identik; tidak mengandung segmen `Exif` / GPS.
  - Uji: PNG/WebP ikut terenkode ulang (bukan salinan mentah) atau setidaknya JPEG memenuhi kriteria brief.
  - Uji: buffer non-gambar (`foto` / helper) ditolak / mengembalikan null.
  - `npm test` lulus.
- Risiko:
  - `sharp` native; CI harus punya biner. Next 14 + Node 22 umumnya didukung.
  - Kualitas JPEG dienkode ulang (bukan lossless). Privasi lebih penting daripada bit-identik.
  - Video tidak dilucuti metadata (di luar brief).

## Bacaan ulang niat

Niat bisa dijalankan tanpa tebakan. Dependensi `sharp` tertulis sebelum instal. Magic bytes tidak dihapus. Kebijakan bucket tidak diubah. Kriteria wajib: JPEG ber-EXIF tidak diunggah apa adanya; non-gambar tetap ditolak. WebP/PNG ikut dienkode karena brief menyebut ketiganya, bukan karena menambah lingkup.

## Perubahan

| Berkas | Perubahan |
| --- | --- |
| `package.json` / `package-lock.json` | Dependensi `sharp` (dicatat di niat sebelum instal). |
| `src/lib/laporan/strip-image-meta.ts` | Enkode ulang JPEG/PNG/WebP; metadata dibuang. |
| `src/lib/laporan/strip-image-meta.test.ts` | Fixture JPEG 8×8 + APP1 EXIF/GPS; non-gambar ditolak. |
| `src/app/api/laporan/upload/route.ts` | Gambar dienkode ulang sebelum `storage.upload`. Video tetap setelah magic bytes. |

## Bukti

Rute unggah: magic bytes dulu; JPEG/PNG/WebP lewat `reencodeImageWithoutMeta` (`sharp().rotate()` tanpa `withMetadata`); gagal enkode → 400; `storage.upload` memakai buffer hasil. Kebijakan bucket tidak diubah.

Uji fixture: JPEG 8×8 + segmen APP1 `Exif` + string GPS. Keluaran ≠ byte-identik, MIME tetap JPEG, tidak mengandung `Exif` / `GPSLatitude`.

```
node --import tsx --test src/lib/laporan/strip-image-meta.test.ts
# tests 2, pass 2
```

Non-gambar: helper mengembalikan `null` untuk `video/mp4` dan JPEG rusak; `detectMimeFromMagic` tetap `null` untuk PDF. Field `foto` yang gagal enkode di rute → 400.

## Bacaan ulang bukti versus kriteria

- [x] Buffer unggahan bukan byte-identik JPEG ber-EXIF (uji fixture 8×8).
- [x] Unggahan non-gambar tetap ditolak (magic + helper null + rute 400).
- [x] `npm test` 218 lulus. `npx tsc --noEmit` lulus setelah `Buffer.from` pada hasil enkode (tipe `Buffer<ArrayBufferLike>` vs `Buffer<ArrayBuffer>`).

## Keputusan

selesai
