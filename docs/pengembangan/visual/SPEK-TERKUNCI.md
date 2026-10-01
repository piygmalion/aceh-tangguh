# Spesifikasi visual terkunci (room, 1 Okt 2026 23:15 WIB)
Arah: GABUNGAN — struktur A Kontur Pesisir; foto drone + motif B hanya di permukaan merek. Font PJS 800, tanpa webfont baru. Palet Peudeung v2.

## visual-1 (UI/UX OK)
- Type: display clamp(2.5rem, 2rem + 2.6vw, 4rem) 800, tracking -0.03em, leading 1.05 (ganti kunci lama 3.5rem/1.12). h1 dalam 3rem/2rem; h2 2.25rem/1.75rem (700); h3 1.375rem/1.25rem; figure-xl 2.5rem/1.75rem tabular-nums; body 1rem; lead 1.125rem; meta/satuan 13px. Kicker maks 2/halaman.
- Ritme: JANGAN andalkan selang-seling paper #F7F7F7 vs raised #FFF (1,07:1). Ritme dari kepadatan (compact/default/spacious), dua bidang ink (band + cuaca), bento. Bagian raised = hairline atas 1px #E6E6E6 (gelap #2A2A2A). Gelap: band & pita cuaca wajib tepi #2A2A2A atas-bawah.
- --section-y 390 eksplisit: 2rem / 3.5rem / 4.5rem (bukan x0.6).
- CTA Lapor: 1440 dilebur ke ubin bento merah (visual-3); 390 pita merah ramping inline, bukan sticky (FAB Tanggapi).
- Motif/foto: TIDAK ada pita motif di tepi bawah header; tidak ada pita putih horizontal full-width di footer; bidang ink (baris Masuk) tidak menempel langsung di atas footer merah (pakai paper/raised). Motif Pintu Aceh/pucuk rebung nada #8E1224 di atas merah, blok terbatas (kolom kiri footer/sudut), menunggu tinjauan budaya. Kontur hero 6-8% di-mask dari plot grafik (atau maks 4%). Foto drone: kolom kiri footer, grayscale/duoton + gradien tinta, teks putih ≥4,5:1, kredit tampil; foto besar di Tentang boleh.
- Ikut FE-66 cleanup: Rp 13px; analisisData.lead = copy kartu; panel Pengaturan calc(100svh-10rem)/fade + tombol tidak menimpa kartu legenda; hapus build-r3p-kab-pmtiles.py + npm build:r3p-kab-tiles; alert dibi-refresh (3 gagal cron berturut → buka/perbarui 1 issue; hitung fetch gagal + tolak guard; bukan force; body alasan + fetched_at lolos terakhir; reset saat lolos).

## visual-2 (hero + band)
- Hero bar 19 thn by_tahun: merah HANYA 2020 (364) + anotasi; 2026 diarsir + label "berjalan". Tick 13px, 390 tiap 2 tahun. Sorotan merah hanya di atas --chart-surface. Render ulang mockup A pakai PJS 800 di 1440/390 terang+gelap sebelum PR.
- Sparkline dampak: skala per metrik; puncak dampak = 2025 (titik + label "2025" warna tinta/putih, BUKAN merah); 2026 arsir pola sama di tiap sparkline; tanpa anotasi minimum; jangan klaim tren dari tahun awal (0 = mungkin tidak tercatat); jangan tulis penyebab lonjakan tanpa sumber. Ubin Hilang angka saja, tinggi sama (area kosong). Catatan "skala per metrik · 2026 berjalan" sekali di bawah band 13px. Sparkline dari payload yang sama dgn totals (lolos guard); label fallback berlaku. Jangan sparkline per kab.
- Gate Data vs /api/dibi/aceh.

## visual-3 (bento + teaser peta)
- Teaser SVG statis inline dari public/fixtures/boundaries-aceh-kab.geojson via scripts/build-peta-teaser.mjs (Web Mercator, Douglas-Peucker, ≤15KB gzip, path di-commit, CI cek fixture berubah tanpa build). Aceh utuh (Weh, Simeulue, Pulau Banyak) dengan padding; tanpa kontrol/titik/klaster. Daratan --surface-raised, laut tidak diisi. Garis kab AREA_OUTLINE_COLOR (#111 35% terang / #FFF 30% gelap). Garis luar dissolve 23 kab #111 55% / #FFF 45% 1px non-scaling; pulau kecil dipertahankan. Tanpa merah/oranye. Seluruh ubin Link ke /id/peta + aria-label, anchor #peta-teaser. Judul di pelat solid di bawah peta. Fokus ring 2px. Tes 23 path + kode_kab cocok aceh-kabupaten-registry.json. Gate Basemap.

## visual-5/8
- Chip IRBI dibedakan dari status; foto kartu PD diganti pita level.
- Destana: fix counts Backend (src/app/api/sik/public/route.ts; count head/RPC group by; tes total = baris profil_desa 6.503); empty state "Penilaian Destana belum tersedia", bukan "6.503 belum dinilai".
