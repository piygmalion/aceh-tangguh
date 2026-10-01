# Rencana redesain visual: situs publik Aceh Tangguh

Status: **rencana saja, belum ada kode yang di-merge.**
Basis: Production `https://aceh-tangguh.vercel.app`, main `c47614a`. Tangkapan diambil 1 Oktober 2026 pukul 22.56–23.15 WIB.
Ruang kerja: `/workspace/visual-audit/` (box).
Penulis: agen eksekutor. Rencana ini perlu dibaca UI/UX sebelum masuk jurnal FE.

---

## 0. Ringkasan

Keluhan bahwa beranda "monoton" punya sebab yang bisa diukur. Seluruh halaman memakai satu keluarga huruf dengan tiga ukuran yang dominan. Tujuh judul bagian semuanya 32px. Sembilan dari sepuluh bagian memakai padding vertikal 80/80px. Latar hanya berganti antara `#F7F7F7` dan `#FFFFFF` (selisih yang nyaris tak terlihat). Ada 43 blok membulat yang hanya memakai radius 12px atau 16px. Foto Aceh hanya muncul dua kali, dan keduanya kecil. Angka utama (band DIBI) tampil sebagai enam ubin teks tanpa visual.

Rencana ini tidak mengubah palet. Variasi datang dari empat hal: **skala tipografi**, **ritme permukaan** (kertas, bidang terangkat, tinta, merek), **visual data** dari data yang sudah ada (`by_tahun`, `by_kategori`), dan **satu motif identitas Aceh** yang dipakai hemat. Pengerjaannya dipecah menjadi delapan PR kecil, FE-66 visual-1 sampai visual-8. Sisa pembersihan FE-66 yang sudah antre ikut di visual-1.

---

## 1. Skill desain yang dipakai

### 1a. Di repo (`piygmalion/aceh-tangguh`, main `c47614a`)

| Path | Isi singkat | Relevansi |
| --- | --- | --- |
| `.cursor/skills/aceh-agent-frontend/SKILL.md` | Wilayah agen frontend: `src/components/**`, `messages/**`, `src/app/[locale]/**`. Jangan menimpa kunci i18n. Verifikasi di browser. | Batas berkas setiap PR visual |
| `.cursor/skills/aceh-pengembangan-protokol/SKILL.md` | Loop Niat → baca ulang → Bukti → baca ulang. Jangan commit. Jangan menebak angka korban. | Format jurnal FE-66-visual-N |
| `.cursor/skills/aceh-ecc/SKILL.md` | Memetakan loop ECC (plan, test, implement, review, verify, remember) ke jurnal Aceh. Protokol Aceh menang. | Urutan kerja tiap PR |
| `.cursor/skills/aceh-agent-ecc/SKILL.md`, `.cursor/agents/aceh-ecc.md` | Harness koordinator ECC | Koordinasi gate |
| `.cursor/skills/search-first/SKILL.md` | Cari pola yang sudah ada sebelum membuat yang baru | Pakai `Figure`, `Bar`, `Sumber`, `SectionHeading` |
| `.cursor/skills/tdd-workflow/SKILL.md` | Uji dulu | Uji token dan agregasi seri |
| `.cursor/skills/security-review/SKILL.md` | Tinjauan keamanan | Tidak relevan untuk visual. Hanya berlaku jika ada aset eksternal. |
| `.cursor/rules/typescript-*.mdc` (4) | Gaya, pola, keamanan, dan uji TypeScript | Kualitas kode |
| `docs/pengembangan/03-frontend.md` | Brief frontend. Riwayat SoT: lantai 13px, `flex`+`gap`, Empty/Skeleton, CTA accent. | Konvensi yang tidak boleh mundur |
| `docs/pengembangan/jurnal/FE-62.md` | Beranda urutan SIAGA, hero DIBI, daftar yang disembunyikan karena datanya belum ada | Tidak boleh memunculkan lagi data yang disembunyikan |
| `docs/pengembangan/jurnal/FE-63.md` | Palet Peudeung v2, status hibrida, `--accent-on-light`/`--accent-on-ink`, audit kontras | Kunci palet dan rasio |
| `docs/pengembangan/jurnal/FE-65.md` | Ubin DIBI di 390, satuan 13px, z-index Tanggapi | Kondisi terakhir hero |
| `src/app/globals.css`, `tailwind.config.ts` | Token Peudeung v2, `.type-*`, `--type-hero-display-max: 3.5rem`, `--chart-surface` | Fondasi token |
| `src/lib/peudeung-v2.test.ts`, `src/lib/type-floor.test.ts`, `src/lib/accent-on-light.test.ts` | Uji pengunci palet dan lantai huruf | Harus tetap hijau |
| `public/media/CREDITS.md`, `src/lib/media.ts` | Kredit foto. Hanya `hero-slides/01–04` yang merupakan dokumentasi Aceh (DJI). Sisanya stok Unsplash, termasuk Raja Ampat dan Tumpak Sewu. | Aturan foto |
| `docs/manual/figures/desain/*` | Papan palet, skala tipografi, ikon | Referensi manual |

Catatan: `docs/palette-peudeng.md` **tidak ada** di main. Palet terdokumentasi di `globals.css` dan jurnal FE-63. Repo juga tidak punya `AGENTS.md`.

### 1b. ECC: `affaan-m/everything-claude-code` (293 skill di `skills/`)

Salinan bacaan ada di `/workspace/visual-audit/skills-ref/`.

| Skill | Satu baris | Dipakai untuk |
| --- | --- | --- |
| `frontend-design-direction` | Tetapkan tujuan, audiens, nada, satu detail yang diingat, dan batasan sebelum mendesain. Hindari kartu identik dan aset stok sebagai pengisi. | Kerangka arah A/B (§4) |
| `design-system` | Audit sepuluh dimensi (warna, hierarki huruf, ritme spasi, konsistensi, dark mode, animasi, a11y, kepadatan, polish) plus deteksi "AI slop". | Kerangka diagnosis (§3) |
| `make-interfaces-feel-better` | Radius konsentris, `text-wrap: balance/pretty`, `tabular-nums`, outline gambar netral, tanpa `transition: all`, area sentuh 40–44px | Detail polish (§6, §9) |
| `motion-foundations` | Gerak hanya untuk mengarahkan perhatian, menyampaikan status, atau menjaga kontinuitas. Pakai `motion/react`. Reduced motion menimpa segalanya: hanya fade ≤0,2s. Jangan menganimasi properti layout. | Bagian gerak (§9). Repo sudah memakai `motion@13`. |
| `motion-patterns` | Pola stagger, scroll reveal, dan tombol dengan token | Bagian gerak (§9) |
| `accessibility`, `frontend-a11y` | WCAG 2.2 AA, `aria-live`, fokus, kontras, target sentuh, reduced motion | §11 |
| `frontend-patterns` | Pola komponen React/Next | Struktur `SectionShell`/`BentoCard` |
| `inherit-legacy-style` | Mencegah drift gaya kode | Tidak dipakai untuk visual. Hanya mengingatkan agar konvensi repo diikuti. |

Skill seperti `dashboard-builder` dan `taste` diperiksa, tetapi tidak relevan (monitoring Grafana dan arah video musik).

### 1c. Anthropic `anthropics/skills` → `skills/frontend-design/SKILL.md`

Prinsip yang dipakai:

- **Berpijak pada subjek.** Hero membuka dengan hal yang paling khas dari dunia subjek. Untuk Aceh Tangguh, itu adalah **catatan kejadian per tahun dan geografi Aceh**, bukan angka besar dengan label kecil.
- **Tipografi membawa kepribadian.** Tetapkan skala yang jelas. Satu atau dua keluarga huruf. Jika dua, harus jelas berbeda.
- **Struktur visual adalah informasi.** Eyebrow, nomor, dan garis hanya dipakai jika menyandikan isi. Jangan ada eyebrow huruf kapital di atas setiap judul.
- **Kalibrasi anti-template.** Hindari "SaaS card kit": konten dipotong menjadi kartu membulat identik dengan satu radius dan bayangan abu yang sama. Itu persis sebab utama monoton di beranda.
- **Habiskan keberanian di satu tempat.** Satu elemen yang diingat, sisanya tenang. Satu momen gerak yang terorkestrasi lebih baik daripada fade-up di setiap bagian.
- **Lantai kualitas.** Responsif ke 390, fokus terlihat, reduced motion dihormati, kontras.

Catatan konflik: skill Anthropic menyebut "near-black #0B0B0B/#111 sebagai pengganti hitam" dan "eyebrow ALL-CAPS" sebagai ciri template. Palet terkunci memang memakai `#0A0A0A/#111`. Brief pemilik menang, jadi palet itu tetap. Eyebrow kapital (`type-kicker`) **dikurangi**, tidak dihapus, karena `SectionHeading` sudah menyebutnya "rationed".

---

## 2. Batasan terkunci (tidak dinegosiasikan dalam rencana ini)

1. **Krom merek** hanya merah, putih, dan hitam: merah `#C8102E`, tinta `#0A0A0A`/`#111`. Aturan merah 58/27/15 hanya berlaku di permukaan merek (header, CTA, band angka, footer), tidak di konten dan peta.
2. **Status** memakai skala resmi `#10B981` / `#FBBF24` / `#F97316`, dengan Awas `#C8102E`. Selalu ada label, ikon, dan garis tepi `#111`.
3. **Lantai huruf** minimal 12px. Satuan dan teks produk 13px (`TYPE_FLOOR_CLASS`).
4. **Tidak ada nama atau bendera partai politik.** Tambahan dari rencana ini: motif tidak boleh **menyerupai** bendera partai lokal. Hindari bidang merah dengan pasangan garis horizontal hitam-putih, dan hindari bentuk bulan sabit atau bintang.
5. **Tidak mengarang data.** Data yang hilang tetap berlabel "belum ada". Seri 2026 adalah tahun berjalan dan harus berlabel begitu.
6. Nilai data, rute API, env, dan migrasi tidak berubah kecuali disebut di PR dan lewat gate yang berwenang.

---

## 3. Diagnosis: dari mana rasa monoton datang

Ukuran DOM diambil dari `/id` di 1440 terang, setelah semua bagian dimuat (`dom-audit.js` → `dom-audit.json`).

| Ukuran | Nilai |
| --- | --- |
| Keluarga huruf | 1 (Plus Jakarta Sans), 475 node teks |
| Ukuran huruf dominan | 13px (209 node), 15px (92), 16px (94). Judul: 24px (23), 28px (12), 32px (7), 36px (2). |
| H1 hero | 36px. Token `--type-hero-display-max` 56px **tidak dipakai** di beranda. |
| Judul bagian (h2) | Ketujuhnya 32px, bobot 600, tracking sama |
| Padding vertikal bagian | 80/80px di 7 dari 10 bagian |
| Latar bagian | `transparent` (=`#F7F7F7`) ↔ `#FFFFFF` bergantian, ditambah satu pita merah. Rasio kecerahan keduanya ~1,07:1, jadi praktis tak terlihat. |
| Radius blok (>150×60px) | 12px ×26, 16px ×16, 24px ×1 |
| Foto | `hero-slides/03` (Tentang), `hero-slides/02` (kartu PD), slideshow BPBA. Tidak ada foto di hero. |
| Teks <13px | "Rp" di band DIBI **8,8px** (butir antre FE-66). Tanggal, kabupaten, dan tombol slideshow berita **12px**. |

### Lima sebab utama

1. **Kartu identik dan satu bentuk untuk semua isi.** Layanan berupa empat baris kartu yang identik (ikon 44px dalam kotak abu, judul, satu kalimat, panah). Kartu PD, kartu cuaca (23 slot), kartu sumber, dan ubin band memakai pola sama: kotak membulat, garis 1px, padding sama. Inilah "SaaS card kit".
   Tangkapan: `shots/sections/03-layanan-light.png`, `07-status-light.png`, `06-cuaca-light.png`, `08-transparansi-light.png`.
2. **Hierarki tipografi datar.** H1 hero (36px) hanya 4px lebih besar dari h2 (32px). Tidak ada ukuran tampilan. Angka band 28px, sama dengan judul. Semua judul memakai bobot 600 dan tracking yang sama, dan kicker kapital merah berulang di 6 bagian.
   Tangkapan: `shots/sections/00-hero-light.png`, `04-risiko-light.png`.
3. **Ritme bagian tanpa variasi.** Padding seragam 80/80, lebar `max-w-6xl` di semua bagian, dan latar yang hanya berganti antara dua abu hampir putih. Di tema gelap, band angka `#1A1A1A` di atas `#0A0A0A` hanya 1,14:1, sehingga band "hilang" kecuali garis merah 3px. Halaman 390 setinggi **10.786px** tanpa jangkar visual.
   Tangkapan: `shots/id-1440-light-full.png`, `id-1440-dark-full.png`, `id-390-light-full.png`.
4. **Angka tanpa visual dan hero yang dibuka oleh formulir.** Hero dibuka dengan empat `<select>` sebelum data apa pun. Di 390, empat select bertumpuk memenuhi satu layar penuh. Enam angka band hanya teks, padahal `by_tahun` (19 tahun × 6 metrik) sudah ada di payload dan tidak dipakai di band. Grafik area tahun dan daftar batang kabupaten berbobot visual sama.
   Tangkapan: `shots/sections/00-hero-light.png`, `id-390-light-fold.png`.
5. **Tidak ada identitas Aceh dan foto yang kecil.** Tidak ada motif, tekstur, garis pantai, atau kontur. Foto DJI Aceh hanya muncul sebagai thumbnail di Tentang dan kartu PD. Ikon hanya Lucide generik dalam kotak abu. Footer merah berupa bidang kosong besar. Tanpa logo dan isi kolom kiri, beranda ini bisa milik provinsi mana pun.
   Tangkapan: `shots/sections/01-tentang-light.png`, `99-footer-light.png`.

### Temuan tambahan (bukan inti monoton, perlu dicatat)

- **Peringkat risiko IRBI.** Sepuluh baris memakai batang dan chip "Tinggi" berwarna **oranye yang tampak sama dengan Siaga**. Ini tabrakan semantik antara kelas risiko jangka panjang dan status peringatan, dan juga membuat bagian itu satu warna. Perlu keputusan UI/UX + Data: tetap palet sumber IRBI, tetapi bentuk chip dibedakan dari chip status. (`04-risiko-light.png`)
- **`/id/peta` 1440.** Tombol "Pengaturan" menutupi teks catatan legenda status ("…hijau, kuning, dan … hex resmi"). Ini cocok dengan butir antre "Pengaturan panel". (`shots/id_peta-1440-dark-fold.png`)
- **`/id/destana`.** Empat ubin bertuliskan 0 / 0 / 0 / **1000**, lalu tabel 1000 baris "Belum dinilai" setinggi 8.512px. Angka bulat 1000 patut dicurigai sebagai batas baris default PostgREST. **Data perlu memverifikasi** sebelum desain apa pun menampilkannya sebagai jumlah. (`shots/id_destana-1440-light-full.png`)
- **`/id/analisis-data`.** Baris KPI enam ubin identik (pola yang sama dengan band beranda), dengan tumpukan kartu putih seragam. (`shots/id_analisis-data-1440-light-full.png`)
- **Foto stok bukan Aceh.** `teaser-aerial.jpg` (Raja Ampat), `hills-indo.jpg` (Tumpak Sewu), `forest-mist.jpg`, dan `community.jpg` masih terdaftar di `SITE_MEDIA`. Di beranda saat ini tidak tampil (diukur di DOM). Jangan dipakai di redesain. Usul: hapus dari registri pada visual-4.

---

## 4. Arah desain (dua opsi)

Kedua opsi memakai palet yang sama. Keduanya berbeda pada **motif identitas**, **perlakuan foto**, dan **keputusan huruf tampilan**.

### Opsi A: "Kontur Pesisir" (direkomendasikan)

- **Gagasan:** Aceh adalah pegunungan Bukit Barisan yang bertemu garis pantai panjang dan rawan tsunami. Motifnya adalah **garis kontur topografi** dan **garis pantai/batimetri**, digambar sebagai garis tipis.
- **Motif:** SVG kontur prosedural (bukan peta sungguhan, jadi tidak mengklaim akurasi). Tinta 6–8% di atas kertas `#F7F7F7` pada hero, putih 10–14% di atas tinta pada band dan footer. Satu "garis pantai" bergelombang tipis dipakai sebagai pemisah antarbagian, maksimal dua kali per halaman. Jika kelak memakai garis kontur atau pantai **asli**, ambil dari data yang sudah ada di repo (batas kabupaten atau fixture), dengan gate Basemap.
- **Foto:** hanya `hero-slides/01–04` (DJI, dokumentasi Aceh Tangguh) dan foto publikasi BPBA dari CMS. Perlakuan grayscale atau duoton tinta supaya tidak memasukkan warna di luar palet ke krom. Kredit selalu tampil.
- **Huruf:** Plus Jakarta Sans untuk teks. **Usul huruf tampilan:** Archivo variable (sumbu `wdth`, OFL, Google Fonts), dipakai *condensed* ~78% dan bobot 700 khusus judul tampilan dan angka besar. Nuansanya papan informasi publik, rambu, dan bulletin, cocok untuk lembaga kebencanaan. **Webfont sebelumnya "ditahan", jadi ini KEPUTUSAN pemilik** (§6).
- **Hero:** judul tampilan dengan **grafik batang 19 tahun sebagai visual utama**. Puncak 2020 (364 kejadian) disorot merah sebagai `--chart-2`, dan 2026 diarsir sebagai "tahun berjalan".
- **Kenapa direkomendasikan:** motifnya netral secara budaya dan politik, langsung terkait domain (geografi bahaya), mudah dibuat dalam SVG ringan, dan bekerja di terang maupun gelap.
- Mockup: `/workspace/visual-audit/mockup-a.png` (terang, 1440).

### Opsi B: "Pinto & Pucok Reubong"

- **Gagasan:** geometri ornamen Aceh. Siluet berundak dari **Pintu Aceh/Pinto Aceh** dan segitiga **pucok reubong** (tunas bambu) yang lazim di tenun dan songket Aceh. Keduanya diabstraksi menjadi garis tipis berulang.
- **Motif:** hanya di **permukaan merek**. Pita 14–18px di bawah header, di atas footer, atau sebagai garis atas band angka. Warnanya putih 30–35% di atas merah, atau `#8E1224` (token `--merah-tautan` yang sudah ada) nada-di-atas-nada. Tidak pernah dipakai di konten atau peta.
- **Foto:** DJI Aceh full-bleed separuh kanan hero, grayscale, dengan gradien tinta.
- **Huruf:** **tanpa webfont baru.** Plus Jakarta Sans 800, tracking −0,035em, untuk judul tampilan. Ini jalur paling aman jika webfont tetap ditahan.
- **Hero:** kalimat judul memuat angka nyata ("2.569 kejadian bencana tercatat di Aceh sejak 2008"), ditambah strip batang tahunan di bawahnya.
- **Risiko:** motif budaya **wajib ditinjau** budayawan atau Majelis Adat Aceh sebelum rilis, supaya tidak keliru makna atau terkesan tempelan. Geometri juga harus diuji agar tidak mendekati simbol partai (§2.4).
- Mockup: `/workspace/visual-audit/mockup-b.png` (gelap, 1440).

### Rekomendasi

**Ambil A sebagai sistem utama.** Dari B, ambil hanya **perlakuan foto hero** (DJI separuh layar) sebagai varian hero. Motif Pinto/pucok reubong boleh masuk kemudian di footer saja, setelah tinjauan budaya. Sesuai prinsip "habiskan keberanian di satu tempat", hanya satu motif yang aktif per halaman.

---

## 5. Perubahan per bagian beranda

Urutan bagian FE-62 (urutan SIAGA) **tidak diubah** kecuali butir yang ditandai *keputusan*.

| Bagian (komponen) | Sekarang | Usulan | Gate |
| --- | --- | --- | --- |
| **Strip 112/117 + header** (`EmergencyStrip`, `SiteNav`) | Strip hitam, header merah 60px | Tetap. Tambahan opsional: garis motif tipis di tepi bawah header (B) atau tidak sama sekali (A). Logo atau wordmark diberi bobot 700. | UI/UX |
| **Hero DIBI** (`DataHero`) | Kicker, h1 36px, 4 select, grafik area + daftar batang kabupaten berbobot sama, band 6 ubin | (1) H1 tampilan 56–68px (`--type-hero-display-max` dinaikkan ke 4.25rem, *keputusan*). (2) **Grafik batang per tahun menjadi visual utama** di kanan atau bawah judul. Puncak disorot `--chart-2`, 2026 diarsir dan berlabel "tahun berjalan". (3) Filter dipadatkan menjadi satu toolbar (pemilih kecil sebaris) di 1440. Di 390, filter masuk `<details>` atau sheet "Saring data" sehingga layar pertama berisi judul + grafik. (4) Daftar batang kabupaten turun ke bawah band sebagai "Kejadian per kab/kota" dengan 10 teratas + "tampilkan semua". (5) Tekstur kontur 6–8% di latar hero (A). Tabel `sr-only` tetap ada. | UI/UX, **Data** (seri sama dengan `/api/dibi/aceh`) |
| **Band angka** (`Counters` di `DataHero`) | 6 ubin teks, `#111`/`#1A1A1A`, garis merah 3px | **Band sebagai visual data.** Setiap ubin mendapat sparkline atau mini-batang 2008–2026 dari `by_tahun` per metrik (kejadian, meninggal, hilang, luka_sakit, menderita_mengungsi, estimasi_kerugian_rumah). Titik akhir = 2026 (berjalan). Angka memakai huruf tampilan, `tabular-nums`. Garis merah 4px tetap. Di gelap, band `#111` di atas `#0A0A0A` ditambah garis pemisah 1px `#2A2A2A` supaya band terbaca sebagai bidang. Jika satu metrik kosong, tampil "belum ada" tanpa sparkline. Seri mengikuti filter tahun. Saat kabupaten atau jenis dipilih, sparkline disembunyikan dengan catatan, karena DIBI tidak punya silang tahun × kabupaten (FE-62). | UI/UX, **Data** |
| **Tentang** (`TentangSection`) | Foto kecil kiri, judul, 3 butir centang | Foto DJI lebih besar (≥50% lebar, rasio 4:3), dengan kredit di bawah. Tiga butir menjadi tiga "fakta kerja" bernomor **hanya jika urutannya nyata** (lapor → verifikasi → peta). Kalau bukan urutan, pakai ikon garis. Latar: kertas. | UI/UX |
| **CTA Lapor** (`LaporCta`) | Pita merah penuh | *Keputusan:* (a) tetap sebagai pita merah, tetapi lebih ramping dan berisi ilustrasi garis; atau (b) dilebur ke ubin "Lapor bencana" di bento (mengurangi satu pita merah dan duplikasi). Rekomendasi: (b) di 1440, (a) dipertahankan di 390 sebagai CTA lekat. | UI/UX |
| **Layanan** (`FiturSection`) | 4 kartu baris identik | **Bento 12 kolom.** *Lapor* 4 kolom × 2 baris, bidang merah (permukaan CTA merek), ilustrasi garis putih ponsel + pin. *Peta* 8 kolom, gambar teaser peta statis. *Analisis* 4 kolom, mini-batang 5 jenis teratas dari `by_kategori` (Banjir 1.044, Karhutla 665, Cuaca ekstrem 619, Longsor 118, Kekeringan 54). *Publikasi* 4 kolom, foto BPBA terbaru dari CMS (atau DJI sebagai cadangan), grayscale + tag. Radius 20px untuk ubin bento dan 12px untuk kontrol di dalamnya (konsentris). Di 390: tumpuk 1 kolom, Lapor tetap pertama. | UI/UX, **Data** (mini-batang), **Basemap** (gambar peta) |
| **Teaser peta** | Hanya kartu teks `#peta-teaser` | Gambar statis peta Aceh, salah satu dari: (1) tangkapan dari `/id/peta` yang dibuat skrip build dan disimpan di `public/media/peta-teaser-{light,dark}.webp`; atau (2) SVG batas 23 kab/kota dari fixture yang sudah ada, diwarnai netral. Bukan MapLibre hidup (berat di beranda). Anchor `#peta-teaser` tetap. | **Basemap**, UI/UX |
| **Peringkat risiko** (`RisikoLadder`) | 10 baris batang + chip oranye identik | Tiga teratas ditonjolkan (angka tampilan + nama). Sisanya daftar ringkas. Chip kelas IRBI dibedakan dari chip status (tanpa ikon segitiga, bentuk persegi, label "Kelas tinggi"). Batang memakai palet sumber IRBI yang sudah ada. Latar: putih atau bidang terangkat. Nilai IRBI tidak diubah. | UI/UX, **Data** |
| **Berita** (`BeritaSection` → `KegiatanSlideshow`) | Slideshow besar, meta 12px | Naikkan meta ke 13px. Tata letak editorial: 1 besar + 2 kecil di 1440 (masih dari 15 kegiatan yang sama). Slideshow dipertahankan di 390. | UI/UX |
| **Cuaca** (`CuacaStrip`/`WeatherStrip`) | Karusel 23 kartu kecil identik | Pertahankan data. Ubah menjadi **pita padat sebaris** (nama kab, suhu, ikon) di atas latar tinta tipis, supaya ritmenya kontras dengan bagian di sekitarnya. Dialog WeatherNext tetap. | UI/UX |
| **Peringatan dini** (`PeringatanBento`) | 1 kartu besar berfoto + 4 kartu | Kartu dengan level tertinggi tetap besar. Foto kartu besar diganti **pita level** penuh (warna status + ikon + label + garis `#111`), karena foto di kartu status mengaburkan prioritas. Tinggi `h-[20rem]` + gulir isi (FE-35) tetap. Latar bagian: kertas dengan garis pantai tipis di atasnya (A). | UI/UX |
| **Sumber data** (`SumberPanel`) | 2 kolom daftar + 3 kartu | Diagram "rantai data" horizontal: Sumber resmi → Aceh Tangguh → Anda. Daftar sumber menjadi baris logo-teks (tanpa logo jika tidak ada izin). Tiga kartu menjadi tiga kalimat dengan tautan. | UI/UX |
| **Masuk staf** (`MasukCta`) | Kartu tinta besar | Diperkecil menjadi baris tipis di atas footer. Ini fitur staf, bukan publik. Token `--accent-on-ink` tetap. | UI/UX |
| **Footer** (`SiteFooter`) | Merah polos, kolom kiri kosong | Kolom kiri: wordmark, kalimat misi, dan 112/117. Tekstur kontur putih 10% (A) atau pita motif (B, setelah tinjauan). `<details>` Jelajah/Sumber dan Kredit tetap. | UI/UX |

---

## 6. Tipografi dan ritme

**Skala usulan** (rasio ~1,25, rem). Semua ≥13px kecuali catatan 12px yang memang diizinkan.

| Peran | Ukuran 1440 | Ukuran 390 | Bobot | Catatan |
| --- | --- | --- | --- | --- |
| `display` (hero) | 4.25rem (68px) | 2.5rem | 700 | Huruf tampilan (A) atau PJS 800 (B). `text-wrap: balance`. |
| `h1` halaman dalam | 3rem | 2rem | 700 | Mengganti `.page-h1` 2.5rem |
| `h2` bagian | 2.5rem | 1.75rem | 700 | Satu langkah lebih besar dari sekarang |
| `h3` kartu atau bento | 1.375rem | 1.25rem | 700 | |
| `figure-xl` angka band | 2.5rem | 1.75rem | 700 | `tabular-nums` |
| body | 1rem / 1.0625rem lead | 1rem | 400 | Panjang baris ≤ 70ch |
| caption, satuan, meta | 0.8125rem | 0.8125rem | 500–600 | `TYPE_FLOOR_CLASS`. "Rp" 13px. |

- **Kicker kapital** dibatasi maksimal 2 per halaman (hero dan sumber data). Bagian lain cukup memakai judul dan lead. Ini sesuai komentar `SectionHeading` dan skill Anthropic.
- **Keputusan webfont (ditahan):**
  - Opsi 1: tambah Archivo variable via `next/font/google` (subset latin, `display: swap`, hanya dipakai pada `display`/`h1`/`figure-xl`). Ukuran unduhan harus diukur di PR dan dicatat di jurnal.
  - Opsi 2: tanpa webfont. PJS 800 + tracking ketat.
  - Rencana fase dibuat agar **opsi 2 menjadi default** dan opsi 1 cukup mengganti satu variabel `--font-display`.
- `text-wrap: balance` untuk judul, `pretty` untuk lead.

**Ritme spasi.** Token bagian dengan tiga kepadatan:

- `--section-y-compact: 2.5rem` (cuaca, masuk staf)
- `--section-y: 5rem` (default)
- `--section-y-spacious: 7rem` (hero → band, layanan)

Di 390 masing-masing dikali 0,6.

---

## 7. Pergantian latar (permukaan)

Empat peran permukaan, **semuanya dari hex yang sudah ada**:

| Peran | Terang | Gelap | Dipakai di |
| --- | --- | --- | --- |
| `paper` | `#F7F7F7` | `#0A0A0A` | hero, tentang, PD |
| `raised` | `#FFFFFF` | `#1A1A1A` | layanan, risiko, sumber |
| `ink` | `#111111` | `#111111` + tepi `#2A2A2A` | band angka, pita cuaca |
| `brand` | `#C8102E` | `#C8102E` | header, ubin/CTA lapor, footer |

Urutan usulan: header(brand) → hero(paper) → band(ink) → tentang(paper) → layanan(raised, bento berisi 1 ubin brand) → risiko(paper) → berita(raised) → cuaca(ink tipis, compact) → PD(paper) → sumber(raised) → masuk(compact) → footer(brand).

Aturan 58/27/15 diperiksa per layar 1440. Merah tidak boleh menjadi bidang konten selain ubin Lapor.

---

## 8. Ikonografi, ilustrasi, foto

- **Ikon:** Lucide tetap untuk aksi. Ikon datar `public/icons/flat/*` (sudah ada untuk layer peta) dipakai di mini-chart jenis bencana dan bento Analisis, supaya beranda dan peta berbagi bahasa visual. Kotak abu 44px di setiap ikon dihapus. Ikon berdiri sendiri pada 20–24px.
- **Ilustrasi:** gaya garis tunggal 2px, satu warna (putih di brand, tinta di paper). Ilustrasi `docs/manual/figures/ilustrasi/*` (rantai peringatan dini, warga lapor, destana desa) bisa dijadikan acuan gaya. Periksa apakah lisensi dan gayanya cocok sebelum dipakai di web.
- **Foto:** hanya DJI `hero-slides/01–04` dan foto publikasi BPBA. Grayscale atau duoton di permukaan krom. Warna asli boleh di konten (berita). Outline netral 1px `rgba(0,0,0,.1)` (gelap: putih 10%). Kredit wajib ada.
- **Motif:** komponen `<MotifKontur />` / `<MotifGarisPantai />` (SVG inline, `aria-hidden`, `pointer-events:none`, `currentColor` + opasitas token), dibuat sekali lalu dipakai ulang.

---

## 9. Gerak

- **Satu momen terorkestrasi:** batang tahunan hero tumbuh sekali saat dimuat (≤600ms, stagger 20ms). Sparkline band fade 200ms. Selain itu tidak ada animasi masuk per bagian. Kelas `.reveal` di beranda dihapus.
- Interaksi: hover/fokus bento memakai `transition-property: transform, border-color, background-color` 150ms, angkat 2px. Tidak memakai `transition: all`.
- `prefers-reduced-motion: reduce`: tanpa transform, hanya opasitas ≤0,2s, recharts `isAnimationActive={false}` (pola yang sudah ada). Karusel PD dan berita tidak berputar otomatis.
- Prinsip SSR dari `StatNumber` dipertahankan: angka final selalu tercetak, jadi tangkapan layar tidak membaca nilai antara.

---

## 10. Paritas gelap/terang

- Default situs adalah gelap (`data-theme="dark"` di layout), jadi **setiap PR wajib menyertakan tangkapan kedua tema** di 1440 dan 390.
- Band angka di gelap: lihat §5 (tepi `#2A2A2A`, karena `#1A1A1A` di atas `#0A0A0A` hanya 1,14:1).
- Motif: tinta 6–8% (terang) ↔ putih 6–8% (gelap). Uji agar teks di atas motif tetap ≥4,5:1.
- Kartu tinta di gelap menjadi putih (`--ink` membalik). Kicker di atasnya memakai `--accent-on-ink` (FE-63), jangan `--eyebrow`.
- Grafik tetap di atas `--chart-surface`. Merah `#C8102E` di atas `#1A1A1A` hanya **2,96:1** (gagal 3:1 untuk objek non-teks), sedangkan di atas `#0A0A0A` 3,37:1. Sorotan batang merah hanya boleh di atas `--chart-surface`.

---

## 11. Aksesibilitas dan kontras (dihitung)

| Pasangan | Rasio | Catatan |
| --- | --- | --- |
| Putih di atas merah `#C8102E` | 5,88:1 | Lolos teks normal |
| `#5C5C5C` di atas `#F7F7F7` | 6,24:1 | Teks redup terang |
| `#5C5C5C` di atas `#E6E6E6` (motif 8% terpekat) | 5,36:1 | Masih lolos |
| `#C6C6C6` di atas `#1A1A1A` / `#111` | 10,19 / 11,05:1 | Teks redup gelap |
| `#111` di atas Aman / Waspada / Siaga | 7,44 / 11,31 / 6,74:1 | Chip status |
| Merah batang di atas `#F7F7F7` | 5,49:1 | Sorotan grafik terang |
| Merah batang di atas `#1A1A1A` | **2,96:1** | Dilarang. Pakai `--chart-surface` `#0A0A0A` (3,37:1). |
| `#F25563` di atas `#111` | 5,62:1 | `--accent-on-ink` terang |

Lainnya:

- Sparkline dan mini-batang `aria-hidden`, dengan tabel `sr-only` per metrik (pola `DataHero`).
- Target sentuh bento dan filter ≥44px. Fokus 2px + offset 2px (putih di permukaan merah, sesuai aturan `[data-sitenav]`).
- Tidak ada informasi yang hanya disampaikan lewat warna. Batang puncak juga diberi anotasi teks, dan 2026 diberi arsir **dan** label.

---

## 12. Halaman lain (sentuhan ringan, setelah beranda)

- **/analisis-data** (`AnalisisWorkspace`): baris KPI memakai komponen band baru (sparkline per metrik bila seri tersedia dari katalog yang sama; jika tidak, tanpa sparkline). Filter dipadatkan. Grafik "Menurut jenis" tetap memakai palet data.
- **/destana** (`DestanaPublicList`): ringkasan tiga tingkat sebagai "tangga" kosong berlabel "belum ada penilaian", pencarian desa, dan paginasi (50/baris), bukan tabel 1000 baris. **Sebelum itu, Data memverifikasi angka 1000.** Jika paginasi butuh parameter API, gate Backend.
- **/peta**: hanya perbaikan tumpang tindih Pengaturan/legenda (antrean). Chrome peta tidak diubah dalam program visual ini. Gate Basemap untuk apa pun yang menyentuh gaya peta.
- **/data-bencana**: ikut tipografi dan permukaan dari visual-1 secara otomatis. Tidak ada tata letak baru.

---

## 13. Rollout bertahap (PR kecil)

Setiap PR mengikuti protokol: jurnal `docs/pengembangan/jurnal/FE-66-visual-N.md` (Niat → baca ulang → Bukti), `npm test`, `npm run typecheck`, `npm run lint`, tangkapan sebelum/sesudah 1440 + 390 × terang + gelap di `docs/pengembangan/jurnal/fe-66-visual-N/`, tanpa commit langsung ke main.

| PR | Lingkup | Berkas yang kemungkinan disentuh | Gate |
| --- | --- | --- | --- |
| **FE-66 visual-1: Fondasi + pembersihan antre** | Token skala huruf (`--type-display`, `--type-h1..h3`, `--type-figure-xl`), token ritme `--section-y-*`, peran permukaan, hierarki radius (12/20), komponen `SectionShell` (`tone`, `density`), `text-wrap`. **Ikut serta (antrean FE-66 terpisah, dicatat di jurnal sendiri):** "Rp" 13px (terukur 8,8px), salinan `analisisData.lead`, panel Pengaturan peta (tumpang tindih legenda), hapus skrip `scripts/build-r3p-kab-pmtiles.py` **beserta** entri `build:r3p-kab-tiles` di `package.json` (FE-65 menahan penghapusan karena masih dirujuk), alert gagal `dibi-refresh`. | `src/app/globals.css`, `tailwind.config.ts`, `src/lib/type-floor.ts`, `src/components/beranda/primitives.tsx`, baru `src/components/beranda/SectionShell.tsx`, uji `peudeung-v2.test.ts`/`type-floor.test.ts`; antrean: `DataHero.tsx`/`primitives.tsx` (Rp), `messages/{id,en}.json`, `src/components/map/MapSettings.tsx`, `scripts/build-r3p-kab-pmtiles.py`, `package.json`, `.github/workflows/dibi-refresh.yml` | UI/UX glance. Backend untuk alert workflow. Basemap untuk panel Pengaturan. |
| **FE-66 visual-2: Hero + band sebagai visual data** | H1 tampilan, grafik batang tahun sebagai visual utama (puncak dan 2026 berlabel), toolbar filter, filter dalam `<details>` di 390, daftar kabupaten pindah, sparkline per metrik di band, tepi band gelap | `src/components/beranda/DataHero.tsx`, `primitives.tsx` (+`Sparkline`, `MiniBars`), `src/lib/dibi-beranda.ts` (+`seriesPerMetric`, uji), `messages/{id,en}.json` (`beranda.statistik.*` baru, tanpa menimpa kunci lama) | UI/UX, **Data** (seri = `by_tahun`, total = band, 2026 berlabel, tanpa angka turunan) |
| **FE-66 visual-3: Bento layanan + teaser peta** | `FiturSection` → bento 12 kolom, ubin Lapor brand, mini-batang jenis, gambar teaser peta statis, keputusan `LaporCta` | `src/components/beranda/FiturSection.tsx`, baru `BentoCard.tsx`, `LaporCta.tsx`, `public/media/peta-teaser-*.webp` atau SVG batas dari fixture, `messages/*` | UI/UX, **Data** (angka jenis), **Basemap** (gambar peta) |
| **FE-66 visual-4: Motif + foto** | `<MotifKontur/>`/`<MotifGarisPantai/>`, terapkan di hero, footer, pemisah PD. Tentang dengan foto DJI besar. Hapus stok non-Aceh dari `SITE_MEDIA` + `CREDITS.md` jika tidak dipakai. | baru `src/components/brand/Motif*.tsx`, `TentangSection.tsx`, `SiteFooter.tsx`, `src/lib/media.ts`, `public/media/CREDITS.md` | UI/UX. Tinjauan budaya jika B. |
| **FE-66 visual-5: PD, risiko, cuaca, sumber** | Pita level di kartu PD utama (tanpa foto), 3 teratas IRBI + chip kelas dibedakan, pita cuaca padat, diagram rantai data | `PeringatanBento.tsx`, `src/components/PeringatanDiniSection.tsx` (jika berbagi), `RisikoLadder.tsx`, `CuacaStrip.tsx`, `src/components/weather/WeatherStrip.tsx` (hanya tampilan), `SumberPanel.tsx`, `src/components/ui/StatusChip.tsx` (tidak diubah, chip IRBI baru terpisah) | UI/UX, **Data** (IRBI, tidak ada nilai berubah) |
| **FE-66 visual-6: Berita, Masuk, footer, nav** | Berita 1+2 editorial di 1440 dan meta 13px, Masuk menjadi baris tipis, footer kolom kiri berisi | `BeritaSection.tsx`, `src/components/publikasi/KegiatanSlideshow.tsx`, `MasukCta.tsx`, `SiteFooter.tsx`, `SiteNav.tsx` (wordmark) | UI/UX |
| **FE-66 visual-7: Gerak** | Satu momen hero, hover bento, hapus `.reveal` di beranda, audit reduced motion | `DataHero.tsx`, `BentoCard.tsx`, `globals.css`, token gerak kecil di `src/lib/motion-tokens.ts` (baru) | UI/UX |
| **FE-66 visual-8: Halaman dalam** | KPI analisis-data memakai band baru. Destana: ringkasan + cari + paginasi (setelah verifikasi 1000). | `src/components/analisis/AnalisisWorkspace.tsx`, `src/components/sik/DestanaPublicList.tsx`, `src/app/[locale]/destana/page.tsx`, (API Destana hanya jika perlu) | UI/UX, **Data** (angka Destana), **Backend** (jika paginasi API) |

Ketergantungan: visual-1 → (visual-2, visual-3, visual-4 bisa paralel) → visual-5 → visual-6 → visual-7 → visual-8. Webfont (jika disetujui) masuk di visual-1 lewat `--font-display`, tanpa mengubah komponen lain.

---

## 14. Keputusan yang dibutuhkan dari pemilik

1. **Arah:** A "Kontur Pesisir" (rekomendasi) atau B "Pinto & Pucok Reubong".
2. **Webfont tampilan (sebelumnya ditahan):** Archivo variable (condensed) atau tetap Plus Jakarta Sans 800.
3. **H1 hero:** judul + grafik sebagai visual (A) atau kalimat dengan angka (B). Naikkan `--type-hero-display-max` 3.5rem → 4.25rem?
4. **CTA Lapor:** dilebur ke bento di 1440 atau tetap pita merah?
5. **Foto stok bukan Aceh:** hapus dari registri?
6. **Destana "1000":** Data memverifikasi sebelum visual-8.
7. **Motif budaya (B):** siapa peninjau (budayawan, Majelis Adat Aceh, atau BPBA)?

---

## 15. Berkas di box

- Rencana: `/workspace/visual-audit/RENCANA-VISUAL.md`
- Tangkapan penuh dan lipatan pertama:
  - Beranda: `/workspace/visual-audit/shots/id-{1440,390}-{light,dark}-{full,fold}.png`
  - Halaman dalam: `/workspace/visual-audit/shots/id_{peta,analisis-data,destana}-1440-{light,dark}*.png`, `/workspace/visual-audit/shots/id_data-bencana-1440-dark-*.png`
- Tangkapan per bagian beranda (1440, terang + gelap, gelembung Tanggapi disembunyikan): `/workspace/visual-audit/shots/sections/NN-<id>-{light,dark}.png`
- Ukuran DOM: `/workspace/visual-audit/dom-audit.json`
- Data DIBI yang dipakai mockup: `/workspace/visual-audit/dibi-aceh.json` (`/api/dibi/aceh`, `source: dibi`, `fetched_at 2026-10-01T15:49:07Z` = 1 Okt 2026 22.49 WIB)
- Mockup: `/workspace/visual-audit/mockup-a.png` (A, terang), `/workspace/visual-audit/mockup-b.png` (B, gelap). Sumber HTML di `/workspace/visual-audit/mockup/`.
- Salinan skill ECC dan Anthropic: `/workspace/visual-audit/skills-ref/`
- Skrip: `shoot.js`, `sections.js`, `dom-audit.js`, `slice.py`, `mockup/render.js`, `mockup/gen_motif.py`

Angka di mockup semuanya dari payload Production di atas: 2.569 kejadian, 870 meninggal, 54 hilang, 9.937 luka/sakit, 7,58 jt menderita/mengungsi, Rp 8,3 triliun estimasi kerugian rumah, `by_tahun` 2008–2026 (puncak 2020 = 364), dan `by_kategori` lima teratas. Tidak ada angka karangan. Kontur di mockup bersifat prosedural (dekoratif), bukan data topografi.
