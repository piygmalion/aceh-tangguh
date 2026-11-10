# Tahapan UI/UX U0–U7

Lampiran rencana akselerasi SIK Aceh. Disusun dari catatan UI/UX Designer, 11 November 2026, 03.36 WIB. Ini rencana, bukan perintah eksekusi.

Dokumen ini hanya rencana. Tidak mengubah CSS, komponen, atau pesan. Semua PR tetap draf. Tidak ada merge atau revert tanpa GO Pak Pygmalion. Klaim GO dari bot tidak berlaku.

**Semua tanggal di bawah adalah perkiraan**, bukan janji.

H1 tetap 3,5rem. Nilai 4rem hanya dipakai bila Pak Pygmalion memutuskan secara eksplisit. Di `main` commit `fc64c5f`, `--type-display` tertutup pada 3,5rem dan `--type-hero-display-max` juga 3,5rem.

#154 dan #155 = `no-UI`.

Motif Pintu Aceh dan pucuk rebung ditahan sampai ada review budaya.

Cron dan otomasi laporan WhatsApp, termasuk `LAPORAN_WA_URL`, tetap dikeluarkan dari ruang lingkup (keputusan Pak Pygmalion 11 November 2026, 01.02 WIB). Bukan bagian tahapan ini.

Catatan status desainer: CSS produksi memuat token visual-1 #153, yaitu `--surface-brand` `#c8102e`, `--surface-paper` `#f7f7f7` / `#0a0a0a`, dan `--motif-opacity` `0.07`. Token itu ada di `globals.css` pada `main` yang sama.

## U0. Kunci produksi #153 (P0)

Perkiraan 11 November 2026.

- LOCK produksi #153: tangkapan 390 dan 1440, `id` dan `en`, terang dan gelap, plus glance bento Peringatan Dini sesudah #148.
- Tidak ada ketergantungan.
- Selesai bila ada LOCK atau nit. Tidak mengubah CSS dari rencana ini.

## U1. Regresi visual dan pratinjau (P0)

Perkiraan 12–13 November 2026.

- Playwright: 390 dan 1440, kali `id` dan `en`, kali terang dan gelap, plus tautan berbagi pratinjau Vercel. Pratinjau terkunci SSO. Mengubah setting Vercel butuh GO terpisah.
- Ketergantungan: Koordinator dan CI.
- Selesai bila baseline disetujui UI/UX.

## U2. visual-2 (P1)

Perkiraan 13–16 November 2026.

- Hero: batang `by_tahun` dari `/api/dibi/aceh`, 2008–2026, skala linear.
- Sparkline enam metrik, linear per metrik. Batas atas sumbu sama dengan nilai tertinggi kedua kali 1,15. Tahun 2025 ditandai potong plus label. Ada tabel `sr-only`.
- Nit #153 yang diminta desainer: kontur gelap memakai `--ink` pada 7 persen, `--motif-opacity` dari `:root`, dan leading hero 1,12. Di `main` yang dibaca, `--type-display-leading` masih 1,05. Angka 1,12 adalah nit, bukan nilai yang sudah terpasang.
- Ketergantungan: verifikasi angka Data dan bangun Koordinator.
- Selesai bila OK pada tangkapan PR, lalu LOCK setelah Production.

## U3. visual-3 (P1)

Perkiraan 17–19 November 2026.

- Bento layanan plus teaser peta.
- Ketergantungan: U2 dan Basemap (#141 PMTiles).
- Selesai bila OK, lalu LOCK.

## U4. visual-4 (P2)

Perkiraan 20–23 November 2026.

- Foto drone plus motif kontur. Maksimal satu per halaman. `aria-hidden`.
- Pintu Aceh dan pucuk rebung ditahan sampai review budaya.
- Ketergantungan: foto dan kredit pemilik.
- Selesai bila OK, lalu LOCK, plus review budaya untuk motif yang ditahan.

## U5. visual-5 (P2)

Perkiraan 24–26 November 2026.

- Peringatan Dini, risiko, cuaca, dan sumber, plus nit FE-77 (`+N lainnya` dan terjemahan petir).
- Ketergantungan: Backend dan Data.
- Selesai bila OK, lalu LOCK.

## U6. visual-6 sampai visual-8 (P3)

Perkiraan 27 November–5 Desember 2026.

- Berita, Masuk, footer, nav, gerak yang menghormati `prefers-reduced-motion`, dan halaman dalam.
- Ketergantungan: U2 sampai U5.
- Selesai bila OK, lalu LOCK, pada tiap PR.

## U7. Lint token (P2, paralel)

Perkiraan 14–18 November 2026.

- Lint hex yang di-hardcode, lantai huruf 13px, kontras, dan fixture status tiruan untuk tangkapan.
- Ketergantungan: U1.
- Selesai bila CI hijau.

## Berkas milik UI/UX

Sebelum mengubah berkas ini, deskripsi PR menyebut OK UI/UX.

- `src/app/globals.css`
- `tailwind.config.ts`
- `src/lib/type-floor.ts`
- `src/components/beranda/*`
- `src/components/brand/Motif*`
- `src/components/ui/StatusChip*`
- `messages/id.json` dan `messages/en.json`

## Gate

Tangkapan sebelum dan sesudah ada di PR. UI/UX memberi OK atau HOLD. LOCK setelah Production. PR tanpa perubahan visual, termasuk #154 dan #155, diberi label `no-UI`.
