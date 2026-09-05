# AN-3 — naskah konfirmasi Tatonas

Agent: analis
Gelombang: 1
Status: selesai

## Niat

- Tujuan: Menyediakan naskah pertanyaan berbahasa Indonesia, siap dikirim ke penyedia Tatonas, agar agent data tidak memetakan `kd_hardware` / kode perangkat dari tebakan. DATA-4 (`loggerKind`) tetap menunggu jawaban tertulis.
- Berkas:
  - `docs/pengembangan/jurnal/AN-3.md` — naskah saja
  - Baris AN-3 di `STATUS.md` (setelah tiket ini ditutup)
  - Tidak mengubah kode, uji, overlay, ETL, atau `messages`
- Langkah:
  1. Tulis surat singkat: arti resmi kode 1, 2, 3, 4, 5, 8, 9; nama field resmi yang memuat kode itu; satuan `cm` versus `mm`; apakah AWLR selalu kode 1.
  2. Jangan mengusulkan tabel pemetaan, jangan menuliskan arti yang “kami duga”, jangan mencontohkan jenis perangkat per kode.
  3. Baca ulang naskah sebagai orang yang tidak menulisnya; hapus kalimat yang menyiratkan pemetaan.
  4. Jangan membuat `AN-4.md`.
- Cara membuktikan:
  - Naskah lengkap, formal, bisa disalin ke surel.
  - Memuat semua butir brief; tidak memuat usulan pemetaan.
  - Bahasa Indonesia.
- Risiko:
  - Menyelipkan pemetaan dari kode yang sudah ada di repositori — dilarang.
  - Menandai DATA-4 selesai — tidak; DATA-4 `menunggu-naskah` sampai jawaban penyedia.

## Bacaan ulang niat

Niat tulisan murni. Pertanyaan “apakah AWLR selalu kode 1” adalah pertanyaan ya/tidak dari brief, bukan usulan bahwa kode 1 = AWLR. Nama field diminta kepada penyedia; tidak diasumsikan. DATA-4 tidak dikerjakan.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `docs/pengembangan/jurnal/AN-3.md` | Naskah siap kirim (bagian di bawah) |

## Naskah (siap kirim)

**Perihal:** Permintaan konfirmasi resmi arti kode perangkat dan satuan sensor Tatonas

Yth. Tim teknis Tatonas,

Kami dari tim pengelola data Aceh Tangguh (sistem informasi kebencanaan Aceh) merujuk data pemantauan yang disediakan Tatonas. Sebelum kami menyimpan atau menampilkan jenis perangkat di sistem, kami memerlukan keterangan resmi dari penyedia. Kami **tidak** akan menyusun pemetaan kode sendiri.

Mohon kesediaan Bapak/Ibu menjawab secara tertulis pertanyaan berikut.

**1. Nama field resmi**  
Pada data perangkat/stasiun yang kami terima dari Tatonas, terdapat nilai numerik 1, 2, 3, 4, 5, 8, dan 9. Mohon konfirmasi nama field resmi yang memuat nilai-nilai tersebut. Apakah field itu bernama `kd_hardware`, atau nama field lain yang Anda tetapkan? Kami membutuhkan nama field yang sah agar tidak salah merujuk.

**2. Arti resmi tiap kode**  
Untuk **masing-masing** nilai berikut, mohon dijelaskan arti resmi menurut Tatonas (jenis perangkat, fungsi, atau kategori yang Anda tetapkan):

- kode **1**
- kode **2**
- kode **3**
- kode **4**
- kode **5**
- kode **8**
- kode **9**

Mohon jawaban berupa daftar atau tabel dari pihak Tatonas. Jika suatu kode tidak dipakai, atau artinya bergantung pada konteks lain, mohon dijelaskan. Jika ada kode lain di luar daftar di atas yang wajib kami ketahui, mohon ditambahkan.

**3. Satuan `cm` dan `mm`**  
Pada data sensor, label satuan `cm` dan `mm` muncul. Mohon konfirmasi:

- Besaran atau jenis sensor mana yang memakai satuan `cm`?
- Besaran atau jenis sensor mana yang memakai satuan `mm`?
- Apakah angka nilai (`value`) sudah dinyatakan dalam satuan yang tertulis pada field satuan, atau ada konversi yang wajib kami terapkan?
- Apakah ada aturan resmi jika satuan tidak diisi atau berbeda dari `cm`/`mm`?

**4. AWLR dan kode 1**  
Apakah perangkat atau stasiun **AWLR selalu** memakai kode **1**?  
Jika ya, mohon nyatakan itu secara tegas.  
Jika tidak, mohon sebutkan: (a) kode resmi yang dipakai AWLR; (b) apakah kode 1 dipakai juga untuk jenis perangkat lain.

Kami akan menunda pemetaan jenis perangkat di sisi kami sampai jawaban tertulis ini diterima. Jawaban Bapak/Ibu akan menjadi acuan tunggal.

Atas perhatian dan konfirmasinya, kami ucapkan terima kasih.

Hormat kami,  
Tim data Aceh Tangguh

---

Petunjuk kirim (internal): salin naskah ke surel/kontak teknis Tatonas yang sudah dipakai proyek. Jangan menambahkan tabel atau contoh pemetaan dari pihak kami.

## Bukti

Putaran 1 — naskah ditulis.  
Putaran 2 — bacaan ulang: frasa “tampaknya menandai jenis perangkat atau logger” dihapus karena menyiratkan tebakan. Tidak ada tabel pemetaan, tidak ada arti per kode dari pihak kami, tidak ada rujukan ke pemetaan di repositori.

Naskah memuat: field resmi (termasuk apakah `kd_hardware`); kode 1, 2, 3, 4, 5, 8, 9; `cm` vs `mm` dan apakah `value` sudah dalam satuan itu; pertanyaan ya/tidak “apakah AWLR selalu kode 1”. Bahasa Indonesia, bisa disalin ke surel.

DATA-4 tidak dikerjakan. Pemetaan `loggerKind` menunggu jawaban penyedia (`menunggu-naskah`). AN-4 tidak dibuat.

## Bacaan ulang bukti versus kriteria

- [x] Naskah siap dikirim, bahasa Indonesia
- [x] Tanpa usulan pemetaan spekulatif (dibaca ulang; frasa spekulatif dihapus)
- [x] Memuat kode 1,2,3,4,5,8,9; `cm` vs `mm`; AWLR selalu kode 1
- [x] DATA-4 tetap menunggu jawaban penyedia

## Keputusan

selesai
