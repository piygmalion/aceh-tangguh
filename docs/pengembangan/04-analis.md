# Brief agent analis

Anda mengunci kriteria, menutup celah uji, dan menulis naskah yang tidak boleh ditebak agen lain. Baca [00-protokol.md](00-protokol.md) lalu kerjakan tiket sesuai [STATUS.md](STATUS.md).

Anda boleh menambah uji dan memperbaiki CI. Anda tidak merancang skema overlay atau mengubah filter Aceh kecuali untuk menuliskan penerimaan.

## Tiket gelombang 1

### AN-1 — uji matriks otorisasi

Jurnal: `jurnal/AN-1.md`

**Niat yang harus tertulis.** Dua celah P0 review (DELETE kejadian lintas kabupaten; GET dampak lintas kabupaten) harus tertangkap jika guard dihapus.

**Berkas.** Uji baru di samping `src/lib/sik/roles.ts`, `src/lib/auth/admin.ts`, `src/lib/security/public-post.ts`. Ekstrak logika murni jika rute sulit diuji.

**Tabel wajib.**

| kasus | peran | wilayah | hasil |
| --- | --- | --- | --- |
| hapus kejadian kab lain | admin_kabkota | kab A, kejadian kab B | tolak |
| hapus kejadian kab sendiri | admin_kabkota | sama | izinkan jika fase mengizinkan |
| hapus fase statis | admin_kabkota | sama | 409 kecuali `canLockStatis` |
| baca dampak kab lain | admin_kabkota | kab A, kejadian kab B | tolak |
| GET laporan PII | admin_desa / penilai_pkd | — | tolak modul moderasi |
| GET laporan PII | admin_provinsi | — | izinkan |

**Kriteria.**

- Uji tabel lulus.
- `npm test` hijau.
- Tidak mengubah perilaku produksi kecuali mengekstrak fungsi murni tanpa mengubah aturan.

### AN-2 — Node CI = `engines`

Jurnal: `jurnal/AN-2.md`

**Berkas.** `.github/workflows/ci.yml`

**Kriteria.** `node-version` menjadi `22`, selaras `package.json` `engines.node`.

### AN-3 — naskah konfirmasi Tatonas

Jurnal: `jurnal/AN-3.md`

Ini tulisan, bukan kode.

**Niat.** Agent data tidak boleh menebak `kd_hardware`. Tulis pertanyaan untuk penyedia: arti kode 1, 2, 3, 4, 5, 8, 9; satuan `cm` versus `mm`; apakah AWLR selalu kode 1.

**Kriteria.**

- Naskah siap dikirim, bahasa Indonesia, tanpa usulan pemetaan spekulatif.
- STATUS menandai DATA-4 sebagai `menunggu-naskah` sampai jawaban penyedia masuk.

## Tiket gelombang 2 — naskah dulu

### AN-4 — naskah sinyal overlay → calon kejadian

Jurnal: `jurnal/AN-4.md`

Tulis sebelum backend mengerjakan BE-6.

Wajib diputuskan secara tertulis:

- Sinyal mana yang boleh menjadi calon: BMKG, MAGMA, Sipongi, Tatonas.
- Apakah otomatis, manual dari popup, atau keduanya.
- Status awal calon (draf, usulan, perlu tinjauan).
- Siapa yang boleh menerima/menolak.
- Apa yang disalin ke `kejadian_operasi` dan apa yang hanya tautan `external_id`.
- Apa yang terjadi jika sinyal hulu hilang.

Backend tidak mulai BE-6 sebelum naskah ini berstatus `siap-kode` setelah bacaan ulang.

### AN-6 — naskah UI calon kejadian

Jurnal: `jurnal/AN-6.md`. Gelombang 4. Tulisan, bukan kode UI.

API sudah ada (BE-6): `GET/POST /api/sik/calon-kejadian`, `…/[id]/terima`, `…/[id]/tolak`. AN-4 tetap kontrak otorisasi dan field. Tiket ini mengunci **permukaan** saja.

Wajib diputuskan secara tertulis, satu perilaku per butir:

- Di halaman mana daftar calon hidup (rute konsol, bukan modul sidebar baru kecuali alasan tertulis).
- Siapa yang melihat tautan (modul `kejadian` yang sama dengan AN-4).
- Kolom daftar dan filter status.
- Form terima/tolak: field mana yang tampil, kapan wajib (kabupaten untuk `admin_kabkota` belum terikat; `waktu_kejadian` jika `waktu_sinyal` kosong; `kode_jenis` jika usulan kosong).
- Ke mana petugas diarahkan setelah terima.
- Apakah tombol popup peta masuk tiket FE-8 atau ditunda. Jika ditunda, tulis “bukan FE-8”.
- Namespace i18n baru (hanya menambah kunci).

Jangan menambah peran, jangan membuat kejadian `aktif`, jangan popup publik menulis calon, jangan menebak Tatonas/KRB/korban. Jika API sudah cukup, jangan membuat tiket backend. Frontend tidak mulai FE-8 sebelum naskah ini `siap-kode`.

### AN-8 — Satu Data Bencana daerah

Jurnal: `jurnal/AN-8.md`

Tulis sebelum DATA-5 / BE-9 / BE-10 / FE-9. Jangan menabrak AN-6 (permukaan calon) atau FE-7 (sisa hazards).

Wajib diputuskan secara tertulis (sudah di jurnal):

- Dual-track Pasal 32/33 di atas calon + `fase_data`, bukan peran posko.
- Katalog 12 kunci, kelas akses, kode referensi.
- Jejak `sdb_validasi` dan kalender `sdb_jadwal_kirim` sebagai tabel baru.
- Checklist kunci statis (delapan butir) tanpa kolom baru di `kejadian_operasi`.
- Lampiran Juklak: P2 tutup celah tidak dibuka ulang.
- Non-tujuan: POST nasional, DIBI id, Destana skor, DATA-4, perluasan `is_ops()`.

Pelaksana tidak merancang skema di luar naskah. Gelombang 5 sudah mengerjakan DATA-5 / BE-9 / BE-10 / FE-9. Jangan menulis ulang naskah kecuali koordinator membuka celah.

### AN-9 — naskah penerimaan produksi G2–G5

Jurnal: `jurnal/AN-9.md`. Gelombang 6. Selesai. Jangan diulang. Tulisan + uji inventaris. Tidak mengubah rumus PKD, overlay, atau `crypto.ts`.

Wajib satu daftar:

- Migrasi yang harus hidup di produksi sebelum UI calon / SDB / kunci statis berguna (`20260913`–`20260917`).
- Secret overlay dan env rotasi PII (nama saja, bukan nilai).
- Rute staf/cron yang wajib tercatat di `security/attack-surface.md` (kontrak untuk BE-11).
- Perilaku 500 jika `sdb_validasi` belum ada (BE-10).
- Non-tujuan: DATA-4, AN-7, POST nasional, P2 Juklak.

Uji: berkas tes yang gagal jika `panduan.s8.body` masih mengklaim `GET /api/hazards` hidup, dan gagal jika attack-surface tidak memuat path SDB / calon / peringatan / cron overlay. Tunggu FE-10 dan BE-11 merapikan teks itu, atau tulis tes dulu dan biarkan merah sampai mereka selesai — jangan merapikan pesan/attack-surface sendiri (itu FE-10 / BE-11).

### AN-10 — uji locale staf

Jurnal: `jurnal/AN-10.md`. Gelombang 7. Selesai. Jangan diulang. Uji sumber saja. Jangan menyunting komponen atau `messages/**` (itu FE-11).

Tes baru gagal jika `KejadianOpsList.tsx`, `KejadianOpsDetail.tsx`, atau `CalonKejadianList.tsx` masih memuat `toLocaleString("id-ID")`. Gagal jika `KejadianOpsList` masih memuat header JSX `"KIB"` (bukan `colKib`). Jangan Destana. Jangan DATA-4.

### AN-11 — rapikan status naskah

Jurnal: `jurnal/AN-11.md`. Gelombang 8. Selesai. Jangan diulang.

### AN-12 — uji string hardcoded detail

Jurnal: `jurnal/AN-12.md`. Gelombang 8. Selesai. Jangan diulang.

## Tiket gelombang kemudian

### AN-7 — Destana dua instrumen

Jurnal: `jurnal/AN-7.md`

Tulisan. Tidak mengubah rumus PKD. Korespondensi 32 indikator → Pasal 8 huruf a–q + SI Pasal 20. Pelaksana: DATA-6 / BE-12 / FE-13 / AN-13 di gelombang 9.

### AN-13 — uji kontrak Destana

Jurnal: `jurnal/AN-13.md`. Gelombang 9. Selesai. Jangan diulang.

### AN-14 — naskah penerimaan G9 + uji Destana publik

Jurnal: `jurnal/AN-14.md`. Gelombang 10. Selesai. Jangan diulang.

Tulisan + uji berkas. Jangan menerapkan SQL. Jangan menyunting halaman (itu FE-14). Jangan menulis prosedur serangan. Jangan DATA-4.

### AN-15 — naskah kunci staging + uji berkas

Jurnal: `jurnal/AN-15.md`. Gelombang 11. Selesai. Jangan diulang.

Tulisan + uji berkas. Jangan menerapkan SQL. Jangan menyunting migrasi (itu DATA-8). Jangan menulis prosedur serangan. Jangan DATA-4.

### AN-16 — naskah revoke RPC definer tulis

Jurnal: `jurnal/AN-16.md`. Gelombang 12. Selesai. Jangan diulang.

Tulisan + uji berkas. Jangan menerapkan SQL. Jangan menyunting migrasi (itu DATA-9). Jangan menulis prosedur serangan. Jangan DATA-4. Jangan merevoke fungsi peran di naskah sebagai tugas tiket ini.

### AN-17 — naskah overlay env + uji halaman publik

Jurnal: `jurnal/AN-17.md`. Gelombang 13. Tulisan + uji berkas. Jangan menerapkan secret. Jangan menyunting `.env.example` (itu BE-13) atau halaman (itu FE-15). Jangan menulis nilai secret. Jangan DATA-4. Jangan POST ke cron.

### AN-18 — naskah penerimaan loop overlay

Jurnal: `jurnal/AN-18.md`. Gelombang 14. Tulisan + uji berkas. Jangan menyunting rute (itu BE-14). Jangan menulis nilai secret. Jangan DATA-4. Jangan POST nasional. Jangan membuka P2 Juklak. Naskah: daftar berkas G14; setelah deploy satu `workflow_dispatch` (bukan skip / 404 / 503 not configured); GET kunci live 200 atau 503 upstream. Non-tujuan: tiles, MapOverlays, FAQ, dump RPC.

### AN-19 — naskah rute overlay + GET maritim baca saja

Jurnal: `jurnal/AN-19.md`. Gelombang 15. Tabel path vektor; kontrak GET maritim baca saja. Uji path helper + cron memuat `maritime` tanpa nilai secret. Jangan menyunting rute (itu BE-16) atau hook (itu FE-17) kecuali helper path. Jangan DATA-4.

### AN-20 — naskah fail-closed kab + matriks resource

Jurnal: `jurnal/AN-20.md`. Gelombang 16. Jangan dikode sebelum G15 ditutup. Jangan merevoke `is_staff` / `is_ops`.

### AN-21 — uji matriks kab + resource

Jurnal: `jurnal/AN-21.md`. Gelombang 16. Setelah BE-17. Tutup STATUS G16.

### AN-22 — naskah moderasi scoped + undangan 23 kab

Jurnal: `jurnal/AN-22.md`. Gelombang 17. Jangan dikode rute sebelum naskah. Jangan merevoke `is_staff` / `is_ops`. Jangan mengarang email.

### AN-23 — uji matriks moderasi + staf

Jurnal: `jurnal/AN-23.md`. Gelombang 18. Setelah BE-18/BE-19/FE-18. Tutup STATUS G17/G18. Jangan menandai 23 akun hidup tanpa undangan operator.

### AN-24 — naskah resmi vs inovasi cuaca

Jurnal: `jurnal/AN-24.md`. Gelombang 19. Tulisan, bukan kode UI/API. Kontrak pemisahan BMKG vs WeatherNext 3. Jangan DATA-4. Jangan membuka P2 Juklak.

### AN-25 — uji regresi jalur resmi + inovasi

Jurnal: `jurnal/AN-25.md`. Gelombang 19. Setelah DATA-13 / BE-20 / FE-19. `/api/weather` dan `scoreKab` tidak membaca WN3. Tutup STATUS G19. DATA-4 tetap tertahan.

### AN-29 — naskah halaman Analisis data

Jurnal: `jurnal/AN-29.md`. Gelombang 20. Tulisan, bukan kode UI/API. Kunci rute, URL, API, DIBI terpisah, teaser, i18n. Jangan memakai AN-26. Jangan DATA-4.

### AN-30 — uji penerimaan Analisis data

Jurnal: `jurnal/AN-30.md`. Gelombang 20. Setelah BE-28 / FE-25. Agregat, kosong vs 503, i18n, Tanggapi. Tutup STATUS G20. DATA-4 tetap tertahan. Jangan menandai ECC-S selesai.

### AN-31 — naskah bahaya InaRISK jadi poligon kelas

Jurnal: `jurnal/AN-31.md`. Gelombang 21. Tulisan, bukan kode UI/API. Kontrak ImageServer `exportImage` amplop `ACEH_BBOX` → poligon sedang/tinggi. ID data = DATA-20 (DATA-14 sudah registri kab ECC-S2). Jangan menimpa AN-19 / DATA-11 / FE-17. Jangan DATA-4.

### AN-32 — naskah IRBI/KRB pada Analisis data

Jurnal: `jurnal/AN-32.md`. Gelombang 22. Tulisan, bukan kode UI. Dua variabel kab × ancaman; analogi historis; isolasi KPI. Jangan memakai AN-31. Jangan DATA-4.

### AN-33 — uji penerimaan IRBI/KRB analisis

Jurnal: `jurnal/AN-33.md`. Gelombang 22. Setelah FE-27. Pidie Jaya × gempabumi = TINGGI 26,4; copy bukan prediksi; KPI tidak memuat skor IRBI. Tutup STATUS G22. DATA-4 tetap tertahan.

### AN-34 — naskah Histori Kejadian + Proyeksi Dampak

Jurnal: `jurnal/AN-34.md`. Gelombang 23. Tulisan. Proyeksi empiris dari katalog; IRBI hanya pemilih skenario. Jangan PAGER. Jangan DATA-4.

### AN-35 — uji penerimaan Proyeksi Dampak

Jurnal: `jurnal/AN-35.md`. Gelombang 23. Setelah FE-28. Label, parser magnitudo/air, Pidie Jaya × banjir jiwa historis, gempa pita M tanpa rumah karangan.

## Tiket gelombang ECC-S — kerapian

Kontrak: [06-skema-kerapian.md](06-skema-kerapian.md). Jangan DATA-4. Jangan membuka P2 Juklak.

### AN-26 — uji lubang i18n + rute S1

Jurnal: `jurnal/AN-26.md`. Setelah FE-20/FE-21. Kunci ada; path terdaftar; `npm test` hijau.

### AN-27 — naskah registri kab + ruang Aceh (S2)

Jurnal: `jurnal/AN-27.md`. Tulisan dulu. Jangan mengubah `matchesKabScope` di naskah menjadi tebakan.

### AN-28 — naskah 200 kosong vs 503 (S3)

Jurnal: `jurnal/AN-28.md`. Static, maritime, weather, inovasi. Jangan merge jalur cuaca.

## Saat menutup tiket

Perbarui [STATUS.md](STATUS.md). Baca ulang naskah AN-3, AN-4, AN-6, dan AN-8 keesokan putaran sebelum menandai `siap-kode` ulang. Jangan commit kecuali diminta. Jangan membuka P2 `tutup_celah_juklak`.
