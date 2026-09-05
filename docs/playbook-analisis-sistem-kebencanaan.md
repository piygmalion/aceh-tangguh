# Playbook analisis sistem kebencanaan kelas dunia

**Untuk:** Aceh Tangguh (SIK multi-bahaya provinsi: gempa, tsunami, banjir, longsor, gunung api, karhutla)  
**Tanggal:** 4 September 2026  
**Pertanyaan riset:** apa yang membuat sistem informasi kebencanaan terbaik di dunia unggul secara *analisis data* dan teknologi — dan pola mana yang boleh ditiru, dilanggan, atau dilarang dibangun di tingkat daerah?

Dokumen ini adalah playbook analis, bukan tiket kode. Status tiket tetap di [pengembangan/STATUS.md](pengembangan/STATUS.md). Kanvas interaktif: buka di samping percakapan.

---

## Ringkasan eksekutif

Sistem kelas dunia tidak unggul karena peta lebih indah. Mereka mengubah **parameter fisis spasial → paparan → kerentanan → dampak dengan ketidakpastian → pesan terstandar → tindakan terukur**. Dashboard yang berhenti di titik sensor adalah sistem pemantauan, bukan sistem analisis.

**Temuan kunci**

1. **Rantai dampak lebih berharga daripada layer.** [USGS PAGER](https://earthquake.usgs.gov/data/pager/background.php) menggabungkan ShakeMap × populasi LandScan × model kerugian per negara — bukan magnitudo di peta. Aceh hari ini punya titik BMKG dan raster InaRISK, tetapi belum menghitung *siapa terpapar pada kelas intensitas berapa*.
2. **Satu algoritma gagal pada peristiwa yang penting.** JMA memadukan IPF (titik sumber) dan PLUM (medan gelombang) lalu mengambil maksimum; pada gempa Noto 2024 peringatan publik pertama keluar 6 detik setelah deteksi P, dan perluasan wilayah dipicu PLUM saat IPF belum memperbarui sumber ([Earth, Planets and Space, 2025](https://link.springer.com/article/10.1186/s40623-025-02172-2)).
3. **Prakiraan modern adalah probabilistik atau ML lintas-DAS.** [GloFAS](https://global-flood.emergency.copernicus.eu/react/technical-information/products/) memakai LISFLOOD + 51 anggota ECMWF. [Google Flood Hub](https://www.nature.com/articles/s41586-024-07145-1) (Nature 2024) mengklaim andal 5 hari di DAS tanpa pos setara nowcast GloFAS; operasional 7 hari di 80+ negara.
4. **Last-mile diukur sampai perangkat, bukan sampai API.** ShakeAlert Mendocino M7.0 (5 Des 2024): pesan USGS 15,1 dtk; MyShake ke perangkat pertama 15,8 dtk; ~5 juta peringatan; lead time MMI 6+ = 5–55 dtk ([Cal OES, Jun 2025](https://www.caloes.ca.gov/wp-content/uploads/Earthquake-Tsunami-Volcano/Documents/Cal-OES-EEW-Presentation-for-June-25.pdf); [SRL 2025](https://doi.org/10.1785/0120250232)).
5. **Daerah jangan membangun saingan nasional.** [BMKG](https://www.bmkg.go.id/berita/kunjungi-pusat-operasional-inatews-bmkg-world-bank-tinjau-capaian-penguatan-peringatan-dini-multi-bahaya-di-indonesia) menempatkan diri di hulu data; BNPB/pemda di hilir evakuasi. [IDRIP](https://documents1.worldbank.org/curated/en/099063025104528651/pdf/P170874-ca386efa-dcfa-43e4-aa2f-7d7dee0dd369.pdf) mencatat MHEWS fase 1 selesai tetapi terhambat perjanjian berbagi data — bottleneck yang sama mengancam SIK daerah yang ingin “punya sumber sendiri”.

**Rekomendasi satu kalimat:** langganan BMKG/InaTEWS/InaRISK/GloFAS/Flood Hub/FIRMS/CAP; **salin pola** rantai paparan, fusi dual-estimator, corr_id, ambang ensembel, DSS skenario, kartu kerugian, metrik last-mile; **jangan bangun** EEW, model tsunami, atau COP vendor sebagai kebenaran.

---

## 1. Kerangka

Playbook memakai empat pilar [Early Warnings for All](https://wmo.int/activities/early-warnings-all/wmo-and-early-warnings-all-initiative) (target 2027):

| Pilar | Pimpinan | Isi analitik | Bukan |
| --- | --- | --- | --- |
| 1. Pengetahuan risiko | UNDRR | INFORM, ThinkHazard, OpenQuake, DesInventar, InaRISK | Sirene evakuasi |
| 2. Deteksi & prakiraan | WMO | JMA, ShakeAlert, GloFAS, Flood Hub, InaTEWS | Titik marker tanpa medan |
| 3. Diseminasi | ITU | CAP X.1303, IPAWS, J-Alert, WMO-RAA | Teks beda per kanal |
| 4. Kesiapsiagaan | IFRC | FbF, trigger, evakuasi sipil, posko | Analisis tanpa tindakan |

Dua pendekatan pelengkap menurut [WMO](https://wmo.int/site/wmo-common-alerting-protocol/about-cap): **CAP** (format pesan semua bahaya, semua media) dan **IBFWS** (prakiraan berbasis dampak).

---

## 2. Delapan inovasi analitik yang membedakan juara

### 2.1 Hazard spatial, bukan titik

[ShakeMap](https://doi.org/10.3133/ofr20091131) menghasilkan PGA, PGV, spektral, dan intensitas instrumental. Gempa punya satu magnitudo; kerusakan mengikuti *medan guncangan*. PLUM di Jepang memprediksi intensitas langsung dari stasiun dalam ~30 km, justru untuk mengatasi underprediction ruptur panjang ([Frontiers, 2021](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2021.726045/full)). GloFAS mengeluarkan debit di setiap sel sungai 0,05° (sejak v4.0, Juli 2023). SIPAT Chile menilai 21 blok pantai, bukan satu “tsunami ya/tidak”.

**Pertanyaan analis:** “Di mana intensitas/kedalaman/debit melebihi ambang — bukan di mana titiknya?”

### 2.2 Paparan terhitung

PAGER mengiris ShakeMap dengan LandScan lalu memakai model empiris / semi-empiris / analitik. Atlas ShakeMap kini ~14.100 event (1900–2019); keluaran PAGER umumnya **<30 menit** dengan pita EIS dan rentang (korban 1 / 100 / 1.000; kerugian $1 juta / $100 juta / $1 miliar), bukan angka tunggal ([latar ilmiah PAGER](https://earthquake.usgs.gov/data/pager/background.php); [ShakeMap](https://earthquake.usgs.gov/data/shakemap/)). GDACS menggabungkan intensitas × jiwa terpapar × [INFORM Lack of Coping Capacity](https://www.gdacs.org/knowledge/models_eq.aspx). DisasterAWARE Model-of-Models mencatat peringatan dini 100% sub-DAS tergenang pada 7 dari 9 kejadian yang dinilai ([IEEE JSTARS 2024](https://doi.org/10.1109/jstars.2024.3390579)) — tetap lapisan berlisensi, bukan kebenaran daerah.

**Keluaran yang sah di Aceh:** jiwa / bangunan / faskes per kelas intensitas atau genangan. **Keluaran yang dilarang:** angka meninggal dari model.

### 2.3 Ketidakpastian eksplisit

EFAS meneken notifikasi formal jika probabilitas ensembel melebihi kala ulang 5 tahun ≥ 50%, DAS > 1.000 km², lead 48 jam–7 hari ([kriteria EFAS](https://european-flood.emergency.copernicus.eu/efas-notifications)). Ambang dihitung dari klimatologi model ~30 tahun, bukan dari “debit kemarin”. GloFAS v4.3 (Juni 2025) menambah prakiraan submusiman hingga 46 hari. [GFM](https://extwiki.eodc.eu/gfm_assets/gfm4.0_pum_2025.pdf) mengonfirmasi luasan banjir Sentinel-1 dalam ~60 menit (target ≤8 jam, CSI ≥70%). PAGER menerbitkan *rentang* korban dan kerugian.

**Pertanyaan analis:** “Berapa Prob(Q > Q5) dan berapa lebar rentang paparan — bukan berapa angka tengahnya?”

### 2.4 Fusi algoritma tandingan

| Pasangan | Mengapa dua |
| --- | --- |
| JMA IPF + PLUM | Titik sumber gagal pada ruptur panjang dan gempa bersamaan; PLUM gagal memberi lokasi sumber |
| ShakeAlert EPIC + FinDer + GFAST | Titik, ruptur hingga, geodetik |
| GDACS ShakeMap USGS + Rapid Impact JRC | USGS kadang terlambat; JRC memakai model yang sama dengan konfigurasi default, *hanya informatif, tidak untuk notifikasi* ([panduan MHEWS 2025](https://www.gdacs.org/documents/2025/GDACS_MHEWS_guide.pdf)) |

Noto 2024: M5,9 lalu M7,6 dalam 13 detik. Peringatan kedua ke prefektur tetangga 27,1 detik kemudian dipicu PLUM, bukan pembaruan IPF.

**Di Aceh:** jika BMKG dan MAGMA beda, simpan keduanya + identitas korelasi. Jangan dedup buta.

### 2.5 ML yang mengatasi kelangkaan pos

Hanya sebagian kecil DAS dunia berpos. [Nearing et al., Nature 2024](https://www.nature.com/articles/s41586-024-07145-1) melatih LSTM pada 5.680 pos publik; di DAS tanpa pos, andal hingga 5 hari setara nowcast GloFAS. Bank Dunia memperkirakan menaikkan peringatan banjir negara berkembang ke standar negara maju menyelamatkan rata-rata 23.000 jiwa/tahun (dikutip makalah yang sama). Generasi berikut (EGU 2026) mengklaim 7 hari setara kinerja 5 hari lama, dilatih ~16.000 pos.

WFP [HungerMap LIVE 2.0](https://news.un.org/en/story/2026/08/1168066) (rilis April 2026) memprakirakan ketahanan pangan hingga ~90 hari dari iklim, harga, konflik, gizi — tetap tidak mengganti asesmen lapangan.

PDC [AI Hazard Finder](https://www.pdc.org/artificial-intelligence/) (NLP/genAI) mengkurasi berita bahaya global; ML 2024 mempercepat analisis temporal lintas negara.

**Syarat pakai ML di Aceh:** skill diuji terhadap Tatonas/BMKG (hindcast), cakupan publik hanya yang tervalidasi (kebijakan Flood Hub sendiri).

### 2.6 Skenario pramodel dalam detik

[SIPAT](https://doi.org/10.1080/21664250.2020.1727402) memberi penilaian ancaman tsunami < 20 detik (ambang protokol 5 menit), operasional Mei 2016, pertama kali resmi 25 Des 2016 (Quellón Mw 7,6). Empat tingkat: informatif / hati-hati / alert / alarma. Evakuasi *hanya* SENAPRED. SIPAT v2 memperluas poligon analisis Meksiko–selatan Peru. GNSS/finite-fault disebut generasi berikutnya karena magnitudo+episentrum tidak cukup untuk tsunami ([IGS 2026](https://files.igs.org/pub/resource/pubs/workshop/2026/IGS2026_Sy_K5_Zuniga.pdf)).

**Di Aceh:** langganan InaTEWS bertingkat (2023–): buletin 1 **≤3 menit** (contoh M7,6 = 2 menit 45 detik) → ≤10 menit → konfirmasi muka laut 30–60 menit → tutup ≤120 menit setelah ETA pertama ([BMKG](https://www.bmkg.go.id/berita/utama/pascagempabumi-m-7-6-bmkg-sampaikan-analisis-dan-timeline-peringatan-dini-tsunami)). Palu 2018: peringatan 5 menit, gelombang 8–10 menit — pantai barat butuh doktrin peringatan alami seperti GeoNet (“lama atau kuat, pergi”), bukan hanya dashboard. Jangan membuat model tsunami saingan.

### 2.7 Identitas kejadian lintas feed

[IFRC Montandon](https://ifrcgo.org/montandon-notebooks/) memakai STAC: item Event, Hazard, Impact disambung `corr_id`. Klasifikasi acuan UNDRR-ISC 2025, plus GLIDE dan EM-DAT. GO secara terbuka menulis masalah noise saat menampilkan GDACS + WFP + PDC bersamaan ([GO Figure](https://ifrcgoproject.medium.com/go-figure-reducing-noise-improving-trust-188771bfccf9)).

**Di Aceh:** `external_id` pada calon (AN-4) adalah benih. Perluas jadi Event–Hazard–Impact, jangan tiga marker untuk satu gempa.

### 2.8 Last-mile sebagai metrik, bukan fitur

ShakeAlert 2019–2023: 95 solusi M≥4,5; 94 gempa nyata; sebagian “false” internal adalah gempa di tepi jaringan yang lokasinya jelek ([USGS 2024](https://pubs.usgs.gov/publication/70263400)). Ambang publik sengaja M 4,5 — di bawah kerusakan — untuk mengimbangi underestimate.

SASMEX: 30 tahun, ~9.800 gempa terekam, 111 siaran, ~25 juta penerima; *tanpa* cell broadcast; peta PGA ~1 menit setelah guncangan kuat; pedoman sosial masih lemah ([Frontiers 2022](https://doi.org/10.3389/feart.2022.827236)).

Bangladesh: prakiraan 5 hari sampai *union* + Voice Message Broadcast; uji 2014 = 300 VMB/hari; komunitas percaya dan bertindak ([Deltares](https://www.deltares.nl/en/expertise/projects/mobile-services-for-flood-early-warning-in-bangladesh)). MoU FFWC–BDRCS memungkinkan uang tunai *sebelum* puncak.

[CAP](https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2.html) (OASIS + [ITU-T X.1303](https://www.itu.int/en/ITU-D/Emergency-Telecommunications/Pages/Common-Alerting-Protocol-and-Call-to-Action.aspx)): satu pesan mengaktifkan semua kanal. WMO Cg-19 (2023) memasukkan CAP ke regulasi teknis. Call-to-action: semua negara mampu alerting CAP pada 2025. WMO-RAA menandai siapa yang berwenang.

**Di Aceh:** SIK menampilkan dan menautkan CAP hulu; tidak menerbitkan CAP sendiri.

---

## 3. Katalog sistem (21)

Cara baca kolom **Sikap Aceh**: *langganan* = pakai umpan resmi; *salin pola* = tiru metode di atas data daerah; *jangan bangun* = jangan saingi nasional.

### 3.1 Seismik dan tsunami

| Sistem | Inovasi analisis | Kinerja terdokumentasi | Sikap Aceh |
| --- | --- | --- | --- |
| JMA EEW + J-Alert | IPF + PLUM, maksimum, 188 distrik, ~4.500 stasiun | 304 peringatan + 17.778 prakiraan sejak 2007; S-net −3,9 s (P50) / −8,8 s (P75) di palung; Noto: +6 s ke publik | Salin pola fusi; jangan tiru kerapatan |
| USGS ShakeMap + PAGER | Medan × LandScan × model negara; DYFI sebagai kendala | Atlas ~14.100 event (1900–2019); PAGER <30 mnt; pita EIS | Salin rantai paparan; jangan siarkan angka mati |
| ShakeAlert + MyShake + WEA | Ilmu vs last-mile terpisah; EPIC+FinDer+GFAST | 94/95 M≥4,5 nyata; Mendocino 15,1/15,8 dtk, 5–55 s MMI 6+ | Salin pemisahan dan metrik; EEW = nasional |
| Chile SIPAT / SNAM | Skenario pramodel 21 blok, 4 tingkat, evakuasi sipil | <20 dtk; operasional 2016; v2 perluas poligon | Langganan InaTEWS; salin pemisahan wewenang |
| Taiwan CWB + P-Alert | Regional ~20 s (zona buta 40–60 km) + MEMS on-site 2–8 s + shake map padat | 762 P-Alert, uptime ~90%; Pd≥0,35 cm | Usulkan MEMS ke BMKG; bukan fitur peta daerah |
| SASMEX | Ambang magnitudo × jarak ke kota; sirene/radio | 30 thn; 111 siaran; ~25 juta orang | Salin geometri sumber–kota dan kejujuran last-mile |
| InaTEWS + InaRISK + InaEEWS | Buletin tsunami bertingkat ≤3/≤10/30–60/≤120 mnt; InaRISK ancaman×populasi×Rp | M7,6 = 2:45; Palu 5 mnt vs gelombang 8–10 mnt; IDRIP tutup 31 Okt 2025 | **Langganan.** Plus doktrin alami pantai barat |

### 3.2 Hidrologi

| Sistem | Inovasi | Catatan | Sikap Aceh |
| --- | --- | --- | --- |
| GloFAS / EFAS / GFM | LISFLOOD + ensembel; ambang kala ulang; SAR konfirmasi ~60 mnt | GloFAS 15 hari, 0,05°, submusiman 46 hari (v4.3); GFM CSI ≥70% | Langganan sebagai pelengkap DAS besar |
| Google Flood Hub | LSTM lintas-DAS; inundasi; flash 24 jam (2026) | Nature 2024; 150+ negara / ~2 miliar jiwa; API CC BY 4.0 antrean | Langganan + uji vs Tatonas |
| FFWC + FbF + CPP | Prakiraan 5/10 hari + VMB + >76.000 relawan + uang sebelum puncak | Bhola 1970 ~500.000 jiwa → Amphan 2020 = 26 | Salin trigger + last-mile, bukan hanya hidrograf |

### 3.3 Risiko, COP, satelit, standar

| Sistem | Inovasi | Sikap Aceh |
| --- | --- | --- |
| INFORM Risk | Bahaya&paparan × kerentanan × kurang kapasitas; tahunan | Salin kerangka; jangan jadi sirene |
| GEM OpenQuake | PSHA, event-based, AAL, terbuka | Salin jika ada inventaris bangunan |
| ThinkHazard! | Skrining 11 bahaya, kelas kasar | Langganan untuk proyek; bukan KRB |
| DesInventar Sendai | Kartu dampak per wilayah; Target A–D | Salin ke SDB (AN-8); bukan feed live |
| DisasterAWARE | COP 28 bahaya + AI kurasi + API agen | Langganan/kemitraan; bukan kebenaran |
| GDACS | Skor bantuan internasional | Langganan kesadaran; bukan evakuasi gampong |
| IFRC GO / Montandon | STAC + corr_id | Salin identitas kejadian |
| GeoRiskPH + PhilAWARE | HazardHunter + GeoMapper (LGU menulis paparan) + GeoAnalytics | Salin trio produk; ini pola peer terdekat |
| NASA FIRMS + EONET | Hotspot NRT/URT + umpan kejadian | Langganan konfirmasi Sipongi |
| Copernicus EMS / UNOSAT / ICEYE / Maxar Open Data | Rapid mapping + SAR menembus awan | On-demand; SOP AOI, bukan layer 24/7 |
| CAP + IPAWS + WMO-RAA | Satu XML, semua kanal, otoritas terdaftar | Konsumsi; jangan terbit saingan |

---

## 4. Dua belas resep analis

Jalankan sebagai prosedur, bukan sebagai “ide produk”.

### R1 — Rantai PAGER (guncangan × paparan × kerentanan)

**Pemicu:** gempa M≥5 di/dekat Aceh atau calon BMKG.  
**Langkah:** hypocenter resmi BMKG → intensitas spasial (jangan titik) → iris desa/faskes → paparan per kelas → bandingkan sejarah terdekat.  
**Jangan:** terbitkan angka meninggal.  
**Aceh:** overlay InaRISK bahaya gempa + wilayah SDB. Titik BMKG hari ini berhenti di langkah 1.

### R2 — Fusi dual-algoritma

**Pemicu:** magnitudo kecil tetapi amplitudo besar, atau dua event beruntun.  
**Langkah:** dua estimator independen; maksimum untuk keselamatan; keduanya untuk audit; jangan kunci parameter pertama.  
**Jangan:** buang sinyal kedua.  
**Aceh:** BMKG ≠ MAGMA → simpan + corr_id (AN-4).

### R3 — Notifikasi ensembel (pola EFAS)

**Pemicu:** banjir 2–15 hari.  
**Langkah:** Prob(Q>Q5) vs klimatologi model; manusia meneken; siapkan AOI satelit.  
**Jangan:** satu garis debit sebagai kepastian; notifikasi otomatis ke publik.  
**Aceh:** Tatonas = setempat; GloFAS/Flood Hub = pelengkap. DATA-4 dulu.

### R4 — DSS skenario pramodel (pola SIPAT)

**Pemicu:** M≥6,5 Megathrust Aceh–Andaman atau sesar Sumatera.  
**Langkah:** lookup skenario BMKG/InaTEWS dalam detik; ilmu usul; BPBD putuskan; konfirmasi tide gauge.  
**Jangan:** evakuasi dari magnitudo; model daerah saingan.  
**Aceh:** buletin InaTEWS ≤3 / ≤10 / 30–60 / ≤120 menit. Palu 2018: gelombang 8–10 menit. Pantai barat butuh SOP “lama atau kuat = pergi”.

### R5 — CAP satu input, banyak kanal

**Pemicu:** peringatan yang boleh sampai warga.  
**Isi wajib:** hazard, severity, urgency, certainty, area, instruction, expires.  
**Aceh:** tampil + tautan CAP hulu, bukan terbit.

### R6 — Korelasi Event–Hazard–Impact

**Pemicu:** satu bencana di banyak feed.  
**Langkah:** `corr_id`; Event (kapan/di mana/jenis); Hazard (fisis); Impact (hanya SDB tervalidasi).  
**Jangan:** hitung kejadian dari jumlah feed.

### R7 — Intensitas kerumunan (pola DYFI)

**Pemicu:** gempa terasa, stasiun jarang.  
**Langkah:** kuesioner MMI terstruktur; bobot < accelerometer.  
**Jangan:** sentimen medsos sebagai intensitas.

### R8 — Pemicu pembiayaan antisipatif

**Pemicu:** banjir/siklon dengan skill terukur.  
**Langkah:** tulis sumber + ambang + lead + wilayah + tindakan; hindcast; MoU; tinjau tiap musim.  
**Contoh:** GiveDirectly memakai Flood Hub + JBA untuk trigger uang, lalu menyesuaikan per negara ([Anticipation Hub](https://www.anticipation-hub.org/Documents/Case_Studies/GiveDirectly-AI-supported-triggers-for-cash-transfers.pdf)).

### R9 — Kartu kerugian DesInventar

**Pemicu:** setiap kejadian SDB, termasuk “kecil”.  
**Langkah:** satu kartu per wilayah; variabel homogen; analisis ruang-waktu terpisah dari peta live.  
**Jangan:** samakan jumlah kartu dengan jumlah event; tebak DIBI id.

### R10 — Lingkar konfirmasi satelit

**Pemicu:** karhutla, banjir luasan, longsor besar.  
**Langkah:** AOI dari Sipongi/Tatonas → FIRMS → SAR jika berawan → EMS/UNOSAT jika diaktivasi → bandingkan lapangan.  
**Jangan:** hotspot = kebakaran dikonfirmasi; Maxar sebagai layer tetap.

### R11 — Daftar otoritas + anti-hoaks

**Pemicu:** setiap feed masuk.  
**Langkah:** allowlist; tanda resmi / pelengkap / tidak divalidasi; hulu hilang = stale, bukan nol.  
**Aceh:** pertahankan 503 vs kosong (BE-1/BE-8).

### R12 — Ukur last-mile

**Pemicu:** setiap peringatan nyata atau gladi.  
**Langkah:** origin → deteksi → pesan → perangkat/petugas → tindakan. Distribusi lead time, bukan rata-rata. Survei tindakan penerima.  
**Metrik posko yang hilang:** waktu buletin BMKG ke petugas gampong, bukan waktu fetch overlay.

---

## 5. Katalog metrik

| Metrik | Definisi | Patokan lapangan |
| --- | --- | --- |
| Lead time ujung-ke-ujung | Origin/puncak prakiraan → perangkat/petugas pertama | MyShake pesan 15,1 dtk + antar 2–3 dtk; SIPAT <20 dtk; InaTEWS ≤3 mnt |
| POD / FAR | Hits vs misses vs false pada ambang tetap | ShakeAlert 94/95; JMA perbaiki overestimate 2020 |
| Prob(ambang) | Anggota ensembel di atas kala ulang | EFAS ≥50% di Q5 |
| Paparan per kelas | Jiwa/bangunan/faskes dalam MMI atau genangan | PAGER, bukan jumlah marker |
| Kesalahan dampak | Model vs SDB 72 jam dan 30 hari | Atlas PAGER; hindcast FbF |
| Cakupan last-mile | % desa berisiko yang menerima pesan dipahami | SASMEX ~25 juta; VMB union |
| Stale / lineage | Usia umpan, checksum, 503 vs kosong | DATA-2, BE-1, BE-8 |
| Korelasi feed | % event dengan corr_id lengkap | Montandon, GLIDE |

---

## 6. Anti-pola

| Anti-pola | Gejala | Koreksi |
| --- | --- | --- |
| Peta cantik tanpa dampak | Titik + raster statis disebut “analisis” | Iris paparan atau tulis “belum dihitung” |
| Korban dari model | PAGER masuk siaran pers | Publik: rentang atau “sedang dihitung”. Resmi: SDB saja |
| EEW daerah | Sensor murah tanpa protokol nasional | Langganan InaTEWS/InaEEWS |
| Vendor sebagai kebenaran | DisasterAWARE/WebEOC = satu-satunya COP | Vendor = lensa; sumber = BMKG/BNPB/pos |
| Dedup buta | MAGMA menelan BMKG | Kedua + corr_id |
| Overlay yatim | Layer tanpa walidata/TTL | Jangan layer baru tanpa pemilik |
| Teks kanal berbeda | App ≠ SMS ≠ radio | Satu CAP |
| Indeks sebagai sirene | INFORM/InaRISK memicu evakuasi | Indeks = rencana; kejadian = fisis + manusia |

---

## 7. Celah Aceh Tangguh

Penilaian analis atas kemampuan SIK saat ini (overlay live, calon, SDB draf), September 2026 — **bukan skor lembaga**.

| Kemampuan | Dunia | Aceh | Celah |
| --- | --- | --- | --- |
| Pengetahuan risiko | 5 | 3 | InaRISK + Destana ada; indeks desa belum di peta operasi |
| Nowcast/prakiraan fisis | 5 | 2 | Titik live; belum medan/ensembel |
| Paparan × dampak | 5 | 1 | Rantai PAGER belum ada |
| Fusi multi-sumber | 4 | 3 | Calon + external_id; corr_id belum lengkap |
| CAP / last-mile | 5 | 1 | Tidak ada payload peringatan terstandar |
| Antisipasi / FbF | 4 | 1 | Tidak ada trigger ke tindakan sebelum puncak |
| Inventaris kerugian | 4 | 2 | AN-8 siap-kode, belum operasi |
| Satelit on-demand | 4 | 1 | Tidak ada SOP AOI |

**Yang sudah benar dan jangan dibongkar:** filter Aceh, overlay berpemilik, 503 vs kosong, manusia di loop calon, dual-track Pasal 32/33, larangan menebak korban dan kode Tatonas. Itu selaras Chile/USGS/SASMEX: wewenang mengalahkan otomatisasi.

### Urutan kerja konsep (90 hari, bukan tiket)

1. Selesaikan DATA-4 lalu uji skill GloFAS/Flood Hub versus pos Tatonas (hindcast).
2. Spesifikasi paparan desa × InaRISK × faskes — jiwa terpapar per kelas, bukan korban.
3. Kontrak `corr_id` Event–Hazard–Impact di atas AN-4.
4. Naskah konsumen CAP BMKG/BNPB (tampil + tautan).
5. SOP AOI satelit + kartu kerugian SDB.

Jangan dikode dari naskah ini.

---

## 8. Pertanyaan yang wajib ditanya analis sebelum layer/sinyal baru

1. Ini **parameter fisis**, **paparan**, **dampak**, atau **pesan**? Jika tidak jelas, ditolak.
2. Siapa **walidata** dan apa yang terjadi jika hulu hilang?
3. Apakah kita **langganan**, **menyalin pola**, atau **membangun saingan**?
4. Di mana **ambang** dan **ketidakpastian** tertulis?
5. Apakah keluaran bisa disalahartikan sebagai **angka korban**?
6. Bagaimana **corr_id** ke sinyal yang sudah ada?
7. Apakah ada **kanal CAP** resmi yang sudah membawa ini?
8. Metrik **last-mile** apa yang berubah jika kita berhasil?

---

## 9. Sumber

- [USGS PAGER Scientific Background](https://earthquake.usgs.gov/data/pager/background.php)
- [Wald et al., PAGER OFR 2009-1131](https://doi.org/10.3133/ofr20091131)
- [Jaiswal & Wald 2010, empirical fatality model](https://earthquake.usgs.gov/static/lfs/data/pager/Jaiswal_&_Wald_(2010)_Empirical_Fatality_Model.pdf)
- [Kodera et al., JMA EEW after Tohoku (2021)](https://www.frontiersin.org/journals/earth-science/articles/10.3389/feart.2021.726045/full)
- [JMA EEW performance, Noto 2024 (2025)](https://link.springer.com/article/10.1186/s40623-025-02172-2)
- [JMA technical reference EEW (PDF)](https://www.jma.go.jp/jma/kishou/know/jishin/eew/katsuyou/reference.pdf)
- [ShakeAlert performance 2019–2023](https://pubs.usgs.gov/publication/70263400)
- [ShakeAlert Mendocino M7.0 (2025)](https://doi.org/10.1785/0120250232)
- [Cal OES EEW Advisory Board, 25 Jun 2025](https://www.caloes.ca.gov/wp-content/uploads/Earthquake-Tsunami-Volcano/Documents/Cal-OES-EEW-Presentation-for-June-25.pdf)
- [USGS EEW overview](https://www.usgs.gov/programs/earthquake-hazards/science/earthquake-early-warning-overview)
- [SIPAT design and operations (2020)](https://doi.org/10.1080/21664250.2020.1727402)
- [SNAM reference guide (SHOA)](https://prontus.armada.cl/armada/site/docs/20230309/20230309122928/guia_de_referencia_snam.pdf)
- [Chile NTWC, IGS 2026](https://files.igs.org/pub/resource/pubs/workshop/2026/IGS2026_Sy_K5_Zuniga.pdf)
- [SASMEX retrospective (2022)](https://doi.org/10.3389/feart.2022.827236)
- [Taiwan P-Alert review (PMC)](https://pmc.ncbi.nlm.nih.gov/articles/PMC8622038/)
- [Taiwan P-Alert shake maps (2022)](https://link.springer.com/article/10.1186/s40562-022-00251-w)
- [PDC DisasterAWARE](https://www.pdc.org/disasteraware/)
- [PDC AI](https://www.pdc.org/artificial-intelligence/)
- [GloFAS products](https://global-flood.emergency.copernicus.eu/react/technical-information/products/)
- [GloFAS 30-day / ensemble](https://global-flood.emergency.copernicus.eu/react/technical-information/glofas-30day/)
- [EFAS FAQ](https://european-flood.emergency.copernicus.eu/faq)
- [EFAS notifications](https://european-flood.emergency.copernicus.eu/efas-notifications)
- [Nearing et al., Nature 2024](https://www.nature.com/articles/s41586-024-07145-1)
- [Google Flood Hub / flood forecasting](https://sites.research.google/gr/floodforecasting/)
- [Google Research blog, global flood model](https://research.google/blog/a-flood-forecasting-ai-model-trained-and-evaluated-globally/)
- [INFORM methodology](https://drmkc.jrc.ec.europa.eu/inform-index/INFORM-Risk/Methodology)
- [INFORM home (UNDP coordinator 2026)](https://drmkc.jrc.ec.europa.eu/inform-index)
- [OpenQuake Engine](https://www.globalquakemodel.org/product/openquake-engine)
- [OpenQuake workflows](https://docs.openquake.org/oq-engine/master/manual/user-guide/workflows/index.html)
- [ThinkHazard methods](https://gfdrr.github.io/thinkhazardmethods/)
- [DesInventar Sendai manual](https://www.desinventar.net/documentation/DISendai_UserManualAnalysis_2019-2.pdf)
- [GDACS MHEWS guide 2025](https://www.gdacs.org/documents/2025/GDACS_MHEWS_guide.pdf)
- [GDACS earthquake models](https://www.gdacs.org/knowledge/models_eq.aspx)
- [OASIS CAP v1.2](https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2.html)
- [ITU CAP call to action](https://www.itu.int/en/ITU-D/Emergency-Telecommunications/Pages/Common-Alerting-Protocol-and-Call-to-Action.aspx)
- [WMO about CAP](https://wmo.int/site/wmo-common-alerting-protocol/about-cap)
- [WMO CAP milestones, Mar 2025](https://wmo.int/resources/meteoworld/meteoworld-march-2025/common-alerting-protocol-milestones-of-early-warnings-all)
- [WMO EW4All pillars](https://wmo.int/activities/early-warnings-all/wmo-and-early-warnings-all-initiative)
- [UNDRR EW4All](https://www.undrr.org/implementing-sendai-framework/sendai-framework-action/early-warnings-for-all)
- [InaRISK about](https://inarisk.bnpb.go.id/about)
- [InaTEWS](https://inatews.bmkg.go.id/)
- [BMKG timeline tsunami M7.6](https://www.bmkg.go.id/berita/utama/pascagempabumi-m-7-6-bmkg-sampaikan-analisis-dan-timeline-peringatan-dini-tsunami)
- [BMKG–World Bank, 11 Feb 2026](https://www.bmkg.go.id/berita/kunjungi-pusat-operasional-inatews-bmkg-world-bank-tinjau-capaian-penguatan-peringatan-dini-multi-bahaya-di-indonesia)
- [GFM Product User Manual 2025](https://extwiki.eodc.eu/gfm_assets/gfm4.0_pum_2025.pdf)
- [DisasterAWARE MoM, IEEE JSTARS 2024](https://doi.org/10.1109/jstars.2024.3390579)
- [UNDRR EW4All Bangladesh](https://www.undrr.org/implementing-sendai-framework/sendai-framework-action/early-warnings-for-all/bangladesh)
- [GeoNet NGMC](https://www.geonet.org.nz/ngmc)
- [FEMA IPAWS](https://www.fema.gov/emergency-managers/practitioners/integrated-public-alert-warning-system)
- [HazardHunterPH](https://hazardhunter.georisk.gov.ph/)
- [ShakeMap Atlas](https://earthquake.usgs.gov/data/shakemap/)
- [World Bank IDRIP ISR (2025)](https://documents1.worldbank.org/curated/en/099063025104528651/pdf/P170874-ca386efa-dcfa-43e4-aa2f-7d7dee0dd369.pdf)
- [NASA FIRMS API](https://firms.modaps.eosdis.nasa.gov/api/)
- [NASA EONET](https://www.earthdata.nasa.gov/data/tools/eonet)
- [IFRC Montandon](https://ifrcgo.org/montandon-notebooks/)
- [IFRC GO Figure](https://ifrcgoproject.medium.com/go-figure-reducing-noise-improving-trust-188771bfccf9)
- [GeoRiskPH](https://georisk.gov.ph/)
- [HOT PhilAWARE](https://hotosm.org/en/projects/data-driven-disaster-risk-management-philaware/)
- [Deltares Bangladesh VMB](https://www.deltares.nl/en/expertise/projects/mobile-services-for-flood-early-warning-in-bangladesh)
- [BDRCS–FFWC MoU](https://bdrcs.org/memorandum-of-understanding-between-flood-forecasting-and-warning-centre-and-bdrcs/)
- [GiveDirectly × Flood Hub case](https://www.anticipation-hub.org/Documents/Case_Studies/GiveDirectly-AI-supported-triggers-for-cash-transfers.pdf)
- [WFP HungerMap / UN News, Agu 2026](https://news.un.org/en/story/2026/08/1168066)
- [NWS CAP / IPAWS](https://www.weather.gov/documentation/services-web-alerts)

---

*Riset dibantu AI dari dokumen resmi yang dijemput langsung. Parallel CLI tidak terpasang; Context.dev kehabisan kredit pada sesi ini. Klaim faktual memakai URL di atas; skor celah dan terjemahan Aceh adalah inferensi analis dan perlu diverifikasi sebelum keputusan anggaran atau tiket kode.*
