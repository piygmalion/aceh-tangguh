# Protokol pengembangan Aceh Tangguh

Sumber: review sistem 4 September 2026. Perbaikan P0/P1 yang sudah masuk kode tidak dikerjakan ulang.

Pengembangan dijalankan oleh empat agent. Setiap agent hanya mengerjakan klusternya. Output dianggap selesai hanya jika tulisan kerja dan bukti sudah dibaca ulang sampai kriteria penerimaan terpenuhi.

## Agent

| Agent | Brief | Wilayah berkas |
| --- | --- | --- |
| data | [01-data.md](01-data.md) | `scripts/**`, `public/fixtures/**`, migrasi SQL baru di `supabase/migrations/` |
| backend | [02-backend.md](02-backend.md) | `src/app/api/**`, `src/lib/overlay-live.ts`, `src/lib/laporan/**`, `src/lib/security/**`, `src/lib/maritime.ts` |
| frontend | [03-frontend.md](03-frontend.md) | `src/components/**`, `src/hooks/**`, `messages/**`, `src/app/[locale]/**` |
| analis | [04-analis.md](04-analis.md) | uji otorisasi, `.github/workflows/ci.yml`, naskah penerimaan, [STATUS.md](STATUS.md) |

Jangan mengedit berkas di luar wilayah kecuali brief menuliskan pengecualian. Migrasi lama tidak diubah; selalu berkas baru.

## Siklus tulis–baca ulang

Satu tiket = satu jurnal di `docs/pengembangan/jurnal/<id>.md`.

1. **Tulis niat.** Isi bagian Niat sebelum mengubah kode: tujuan, berkas, langkah, cara membuktikan, risiko.
2. **Baca ulang niat.** Baca niat dari awal sebagai orang yang tidak menulisnya. Perbaiki yang kabur, bertentangan, atau menebak data resmi. Jangan mulai kode sebelum niat bisa dijalankan tanpa tebakan.
3. **Kerjakan.** Ubah hanya berkas yang disebut di niat.
4. **Tulis bukti.** Catat perintah, hasil, dan keputusan. Jika UI berubah, sebut rute yang dicoba dan apa yang terlihat.
5. **Baca ulang bukti versus kriteria.** Setiap butir penerimaan harus tertutup oleh bukti. Jika satu butir belum tertutup, kembali ke langkah 3. Jangan menambah lingkup.
6. **Tutup.** Ubah status jurnal menjadi `selesai`, lalu perbarui [STATUS.md](STATUS.md).

Batas ulang untuk satu tiket: lima putaran. Jika masih gagal, tulis blocker di jurnal dan berhenti.

## Yang tidak boleh

- Menebak kode perangkat Tatonas, zona KRB, atau angka korban.
- Mengubah migrasi yang sudah diterapkan.
- Melaporkan FeatureCollection kosong sebagai keberhasilan jika sumber gagal.
- Memakai bbox sebagai pengganti batas administratif Aceh.
- Commit atau push kecuali diminta koordinator.

## Urutan gelombang

- **Gelombang 0** — selesai pada review. Jangan diulang.
- **Gelombang 1** — empat agent paralel, wilayah berkas tidak bertabrakan.
- **Gelombang 2** — cron overlay dan tautan sinyal→kejadian, setelah skema dan naskah analis ada.
- **Gelombang 3** — selesai kecuali DATA-4 (menunggu jawaban AN-3). Jangan mengulang tiket yang sudah diverifikasi.
- **Gelombang 4** — selesai (sisa hazards + UI staf calon). Jangan mengulang.
- **Gelombang 5** — selesai (SDI daerah AN-8). Jangan mengulang.
- **Gelombang 6** — selesai (sisa review + inventaris). Jangan mengulang.
- **Gelombang 7** — selesai (KIB + tanggal locale staf). Jangan mengulang.
- **Gelombang 8** — selesai (rapikan proses + i18n detail). Jangan mengulang.
- **Gelombang 9** — selesai (Destana AN-7). Jangan mengulang. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak.
- **Gelombang 10** — selesai (migrasi produksi + i18n Destana publik). Jangan mengulang. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan menyunting SQL migrasi yang sudah diterapkan.
- **Gelombang 11** — selesai (kunci staging `_tmp_profil_sheet_apply`). Jangan mengulang. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan menyunting SQL migrasi yang sudah diterapkan.
- **Gelombang 12** — selesai (revoke RPC definer tulis). Jangan mengulang. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan menyunting SQL migrasi yang sudah diterapkan.
- **Gelombang 13** — nama env overlay + i18n tiga halaman publik. Jangan mengulang. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan menulis nilai `OVERLAY_CRON_SECRET`. Jangan POST ke cron overlay.
- **Gelombang 14** — selesai (loop overlay di pohon git produksi). Jangan mengulang. DATA-4 tetap tertahan. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan menulis nilai `OVERLAY_CRON_SECRET`. Jangan menyelaraskan seluruh tumpukan lokal.
- **Gelombang 15** — cron maritim + hook rute overlay + dump RPC marker. Jangan DATA-4. Jangan membuka P2 Juklak. Jangan POST nasional. Jangan menulis nilai `OVERLAY_CRON_SECRET`. Jangan mengubah `matchesKabScope` (itu G16 / AN-20).
- **Gelombang 16** — fail-closed kab + filter `/sik/resource`. Jangan dikode sebelum AN-20 selesai. Jangan DATA-4. Jangan merevoke `is_staff` / `is_ops`.
