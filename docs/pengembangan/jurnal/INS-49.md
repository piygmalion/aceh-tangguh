# INS-49 — visual-1 Kontur Pesisir

Agent: frontend
Gelombang: visual (di luar gelombang protokol; tiket pemilik)
Status: selesai

## Niat

- Tujuan: Fondasi visual-1 arah Kontur Pesisir. Judul tampilan memakai Plus Jakarta Sans 800 lewat `--font-display`, tanpa webfont baru, dan H1 hero tertutup di 3,5rem. Ritme bagian dan token permukaan (termasuk `--chart-surface`) tetap dari hex Peudeung v2 yang sudah ada. `SectionShell` menerima `tone`. Satu tekstur kontur/garis pantai prosedural, `aria-hidden`, maksimal satu per halaman beranda. Bukan visual-2 (grafik hero dan sparkline tidak diubah).
- Berkas: `src/app/globals.css`, `src/lib/type-floor.ts`, `src/lib/type-floor.test.ts`, `src/lib/fe-66-visual-1.test.ts`, `src/lib/fe-68-hero-foto.test.ts`, `src/lib/ins-49-visual-1.test.ts` (baru), `src/components/beranda/SectionShell.tsx`, `src/components/brand/MotifKontur.tsx` (baru), `src/components/beranda/DataHero.tsx`, `src/components/beranda/PeringatanBento.tsx`, `src/components/beranda/LaporCta.tsx`, `docs/pengembangan/jurnal/INS-49.md`, `docs/pengembangan/STATUS.md`, `docs/pengembangan/bukti/INS-49-visual-1/`.
- Langkah: Kunci `--font-display` ke `var(--font-sans)`. Turunkan tutup `--type-display` dan `--type-hero-display-max` dari 4rem ke 3,5rem. Tambah token permukaan `--surface-paper`, `--surface-raised`, `--surface-ink`, `--surface-brand` dari hex yang sudah ada, plus `--motif-opacity: 0.07`. `SectionShell` memetakan `tone` paper/raised/ink/brand. Komponen `MotifKontur` adalah SVG garis saja (tanpa isi, tanpa bulan sabit, tanpa bintang, tanpa Pintu Aceh atau pucuk rebung). Satu pemakaian di bagian peringatan dini (kertas). Kontur cadangan di hero diangkat supaya tidak ada motif kedua saat foto aktif. Pita Lapor memakai `--surface-brand`.
- Cara membuktikan: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`. Tangkapan `/id` 390 dan 1440, terang dan gelap, sebelum dan sesudah, di `docs/pengembangan/bukti/INS-49-visual-1/`.
- Risiko: Menurunkan tutup 4rem menyimpang dari kalimat SPEK-TERKUNCI 1 Oktober yang mengunci 4rem. Perintah tiket ini menahan H1 hero di 3,5rem; uji yang mengunci 4rem ikut disesuaikan. Motif tidak diletakkan di hero berfoto supaya tetap satu per halaman dan tidak tertutup foto. Data, API, MAGMA, basemap, dan `layer-colors.ts` tidak disentuh.

## Bacaan ulang niat

Niat bisa dijalankan tanpa angka korban atau geometri resmi. Motif prosedural tidak mengklaim garis pantai sungguhan. Merah tetap hanya di token merek yang sudah ada (`#c8102e`) untuk permukaan brand dan pita Lapor. Hero grafik dan sparkline tidak masuk berkas yang diubah isinya, kecuali penghapusan SVG kontur cadangan di `DataHero` agar hitungan motif tetap satu. `--chart-surface` tidak diganti hex-nya.

## Perubahan

- `--font-display` menunjuk `var(--font-sans)`. `.type-display` memakai keluarga itu, bobot 800. Tutup clamp dan `--type-hero-display-max` menjadi 3,5rem.
- Token permukaan `--surface-paper`, `--surface-raised`, `--surface-ink`, `--surface-brand` dari hex yang sudah ada. `--chart-surface` tetap `#ffffff` / `#0a0a0a`. `--motif-opacity` 0,07.
- Ritme 390 tetap 2rem / 3,5rem / 4,5rem, sekarang juga tertulis pada `html[data-theme="dark"]`.
- `SectionShell` menerima `tone` paper, raised, ink, atau brand, di samping `density`.
- `MotifKontur` adalah SVG garis prosedural (delapan cincin kontur dan satu garis pantai), `aria-hidden`, `fill="none"`, `currentColor`. Dipasang sekali di bagian peringatan dini. Kontur cadangan di hero dihapus supaya halaman berfoto tidak memuat motif kedua.
- Pita Lapor memakai `--surface-brand` (hex merah yang sama).

## Bukti

```
npm test                         # 1071 lulus, 0 gagal
npm run typecheck                # tsc --noEmit hijau
npm run lint                     # hijau; peringatan img yang sudah ada di CmsCoverField dan peta
npm run build                    # next build hijau, 84 halaman statis
```

Tangkapan `/id` sebelum perubahan: H1 64px di 1440, 42,14px di 390, motif 0.
Sesudah: H1 56px di 1440, 42,14px di 390 (clamp belum menyentuh tutup), motif 1.
`/en` gelap: `lang=en`, judul "Aceh disaster statistics", H1 56px, motif 1.
Warna motif: tinta `rgb(17, 17, 17)` di terang, putih `rgb(255, 255, 255)` di gelap, opasitas 0,07, 9 path.
Kredit `public/media/CREDITS.md` masih memuat "dokumentasi Aceh Tangguh".
Berkas basemap, `src/lib/layer-colors.ts`, API, dan migrasi tidak ada di diff.

Tangkapan di `docs/pengembangan/bukti/INS-49-visual-1/`:
sebelum/sesudah × 1440/390 × terang/gelap, plus crop bagian peringatan 1440 terang dan gelap.

## Bacaan ulang bukti versus kriteria

- [x] Token `--font-display` menunjuk Plus Jakarta yang sudah ada, bobot 800, tanpa webfont baru
- [x] H1 hero maks 3,5rem (terukur 56px di 1440)
- [x] Ritme `--section-y-*` dan token permukaan termasuk `--chart-surface`
- [x] `SectionShell` punya `tone` dan `density`
- [x] Satu motif kontur `aria-hidden` per halaman beranda
- [x] Bukan Pintu Aceh, pucuk rebung, atau bentuk bendera partai
- [x] Tes, typecheck, lint, dan build lulus
- [x] Tangkapan 390 dan 1440, terang dan gelap, sebelum dan sesudah
- [x] Data, API, MAGMA, basemap, `layer-colors.ts` tidak berubah
- [x] Kredit foto tetap dokumentasi Aceh Tangguh

## Keputusan

selesai
