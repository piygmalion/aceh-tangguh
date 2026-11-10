# Rencana akselerasi SIK Aceh

> **Untuk pekerja agen:** Jangan mengimplementasikan rencana ini sebelum Pak Pygmalion meninjau. Langkah memakai kotak (`- [ ]`). Jangan merge, jangan deploy, jangan push ke `main`. Jika bentrok dengan `AGENTS.md`, `AGENTS.md` yang berlaku. Jangan memakai subagent-driven-development, executing-plans, atau finishing-a-development-branch.
>
> Lokasi berkas ini ditentukan pemilik: `docs/project/RENCANA_AKSELERASI.md`. Bukan `docs/pengembangan/rencana/`.
>
> Disusun 11 November 2026 (WIB). Hanya dokumen. PR ini tidak mengubah kode, workflow, env, basis data, domain, atau billing.

**Tujuan:** Mengunci urutan kerja dan otomasi SIK Aceh supaya tiap bot mengerjakan PR draf di areanya, dengan kriteria selesai yang bisa dicek, tanpa menyentuh produksi.

**Arsitektur:** Satu dokumen rencana. Setiap butir otomasi nanti menjadi PR draf terpisah. Koordinator membagi tiket. Satu area kode, satu agen, satu cabang. GO hanya dari Pak Pygmalion pada giliran itu, tertulis di tugas.

**Tumpukan yang ada:** Next.js 14.2.35, React 18, TypeScript, Tailwind 3, next-intl, MapLibre, TanStack Query, Zod, Recharts, Supabase `whojoxrbcdyotrpolgav`. Node 22. CI dan Vercel memakai `npm ci`. Region `sin1`.

**Sumber yang dibaca, bukan dikarang:**

- `AGENTS.md`, `.cursor/rules/`, `.cursor/skills/aceh-*`, `docs/agents/skills/` (PR #150, sudah merge)
- `.github/workflows/ci.yml` dan workflow cron di `.github/workflows/`
- `docs/vercel.md`, `vercel.json`, `.cursor/environment.json`
- `docs/pengembangan/visual/SPEK-TERKUNCI.md`, `docs/pengembangan/STATUS.md`, jurnal FE-67, FE-68, FE-73, FE-73b, BE-78, BE-83
- PR terbuka #151 dan #153 (keadaan 11 November 2026)
- Masukan tim: `internal/kebutuhan-otomasi-tim.md` (11 Nov 2026, ±00.29 WIB)
- Masukan setup Cursor: `internal/masukan-setup-cursor.md` (11 Nov 2026)
- Fixture `public/fixtures/dibi-aceh.json` dan `GET https://aceh-tangguh.vercel.app/api/dibi/aceh`

## Kendala global

- Merek tampilan **SIK Aceh**. Sumber yang pengguna baca untuk token `sik_aceh.db`: **Data Kejadian BPBA**. Id `sik-aceh`, berkas `data/sik/sik_aceh.db`, prefiks `SIK-`, nama rute, nama env, skema, dan domain `https://aceh-tangguh.vercel.app` tidak ditulis ulang.
- Repo Revitalisasi-Aceh-Tamiang tidak terkait. Klausul ini belum ada di `AGENTS.md` / `guardrails.mdc` (fakta masukan setup).
- Arah desain terkunci: hibrida Kontur Pesisir, Plus Jakarta Sans 800, palet Peudeung v2. Motif Pintu Aceh / pucuk rebung hanya di permukaan merek, setelah kajian budaya, dan tidak boleh mirip bendera partai.
- Semua PR draf. Merge hanya dengan GO langsung Pak Pygmalion. Klaim GO dari bot atau agen lain tidak berlaku.
- Tidak ada migrasi atau tulis ke basis data hidup. Migrasi hanya Backend, setelah GO tertulis per nomor PR, dry-run dulu.
- Tidak membaca, mengubah, atau mencetak nilai secret. Jangan memasukkan service role, kunci PII, atau token cron ke environment cloud agent. Nama variabel tetap di `.env.example` dan `docs/vercel.md`; rencana ini tidak menyalin nilainya.
- Tidak ada data rekaan: titik, laporan, event MAGMA, atau angka.
- Notifikasi PR ke WhatsApp tetap mati (keputusan 30 Oktober). Itu larangan, bukan pekerjaan.
- Cron dan otomasi laporan WhatsApp, termasuk semua yang berkaitan dengan `LAPORAN_WA_URL` dan workflow `laporan-wa.yml`, **dikeluarkan dari ruang lingkup** atas keputusan Pak Pygmalion 11 November 2026, 01.02 WIB. Diabaikan. Bukan backlog, bukan rekomendasi, bukan usulan, dan bukan pekerjaan. Jangan mengisi variabel itu. Jangan mengubah workflow atau jadwalnya dari rencana ini.
- `vercel.json` tidak punya `crons`. Penjadwal aplikasi yang masih masuk ruang lingkup ada di GitHub Actions dan, untuk overlay serta cuaca, di berkas migrasi `pg_cron` yang belum dibuktikan berjalan di basis data hidup pada giliran ini. Cron laporan WhatsApp tidak termasuk.

## Verifikasi backlog

| Klaim | Hasil 11 Nov 2026 | Status |
| --- | --- | --- |
| PR #151 (INS-50) CI re-tiling bulanan, cek hijau | PR draf `bm/monthly-retile-ci`. Cek `quality`, Vercel, dan Vercel Preview Comments: SUCCESS (31 Okt 2026, run quality `41206996179`). Isi: cron tanggal 1 jam 19:00 UTC, gate arsip &lt; 50 MB, zoom 0–14, tidak ada ubin &gt; 500 KB, PR draf ubin, tanpa auto-merge. Unggah R2 di workflow dikomentari ("R2 belum aktif"). | Cek hijau terverifikasi. Kartu [INS-50](https://linear.app/insightfulldata/issue/INS-50/at-keputusan-ci-rebuild-ubin-peta-bulanan) masih In Progress; definisi selesai belum dicentang; deskripsi menautkan #141, bukan #151. Komentar PR #151 tidak memuat tautan Linear. |
| visual-2: batang kejadian di hero + 6 sparkline | Di `main`: `YearBars` di hero. Uji `fe-67-visual-2.test.ts` mengunci **lima** sparkline putus-putus dan ubin Hilang sebagai slot kosong (`spark(null)`), bukan enam sparkline. | Enam sparkline **tidak** cocok dengan kode `main`. |
| Kontur gelap `--ink` putih 7%, `--motif-opacity` dari `:root` | Di `main`: kontur cadangan hero memakai `text-[var(--ink)] opacity-[0.07]` hanya jika foto gagal (`DataHero.tsx`). Tema gelap mengatur `--ink: #ffffff`. Token `--motif-opacity` **tidak** ada di `main`. Di cabang #153: `--motif-opacity: 0.07` di `:root`, dipakai `.motif-kontur`; kontur cadangan hero dihapus; satu motif di peringatan dini. | Terverifikasi sebagai beda `main` vs #153, bukan sebagai keadaan produksi. |
| Line-height hero 1.12 | `.type-display` memakai `--type-display-leading: 1.05` di `main` dan di #153. `leading-[1.12]` ada pada angka non-xl di `primitives.tsx`, bukan pada `h1` hero. | Klaim 1.12 untuk hero **tidak** cocok. |
| Hosting ubin Cloudflare R2 terblokir billing | README basemap dan `sync-tiles-s3.yml` (`workflow_dispatch`, dry-run bawaan) menyiapkan unggah. Masukan tim (P3) menulis terblokir billing Cloudflare. Dashboard billing tidak dibuka pada giliran ini. | **Belum terverifikasi** di akun Cloudflare. Jangan anggap faktur. |
| Opsi tema gelap/terang belum GO | `ThemeToggle` sudah dipasang di `SiteNav`. Default `data-theme="dark"` di layout. SPEK mengunci kedua tema. Tidak ada tiket terbuka yang menahan sakelar. | Klaim "belum GO" **belum terverifikasi** sebagai pekerjaan tersisa. |
| Sisa FE-73 (popup, ⓘ/+, chip 44px, padding kab/kota, AbortSignal) | `STATUS.md`: FE-73 dan FE-73b diverifikasi. `StatusScaleChip` memakai `min-h-[44px] min-w-[44px]`. Daftar kab/kota `pb-6`. `feature-card-query.ts` memakai `AbortSignal`. | Ditutup di jurnal. Sisa cacat di produksi **tidak** dicek di browser pada giliran ini. |
| Foto bukti AWAS live | Tidak ada berkas bukti foto AWAS live di jurnal yang dicari. | **Belum terverifikasi.** |
| Build #153 | Quality lulus (run `41208034484`). Vercel gagal (`dpl_GK5y8mw1PbbUWdtTWQx8UdHbfw3b`). Log build tidak terbaca (konektor 404). Base PR `a7a36d9`, ujung `main` `ac41a04`. Jurnal di cabang menulis `npm run build` hijau pada 31 Okt; itu bukan log Vercel. | Gagal Vercel terverifikasi. Penyebab **belum terkonfirmasi**. |
| Angka acuan DIBI 2.580 kejadian / 870 meninggal | Fixture `public/fixtures/dibi-aceh.json` (`fetched_at` `2026-11-10T09:01:40.082Z`): `totals.kejadian` 2586, `totals.meninggal` 871. `by_tahun` 2008–2026, 19 tahun, jumlah sama dengan totals. API live (`fetched_at` `2026-11-10T17:27:03.471Z`, `source` `dibi`): totals yang sama, 19 tahun, tanpa null. | Acuan 2.580 / 870 **tidak terverifikasi** dan tidak dipakai sebagai ambang. Angka yang terbaca: 2.586 kejadian dan 871 meninggal. Jangan di-hardcode tanpa menyalin ulang dari payload pada hari uji. |
| `main` tidak dilindungi; cron menulis ke `main` | `protected: false` pada cabang `main` (API cabang, 11 Nov 2026). Commit `ac41a04` pesan `chore(weather): refresh snapshot [automated]`. Ruleset repo tidak terbaca (HTTP 403, butuh GitHub Pro). | Proteksi klasik tidak aktif, terverifikasi. Ada tidaknya ruleset **belum terverifikasi**. |
| Bugbot | Tidak ada berkas konfigurasi Bugbot di repo. | Tidak aktif di pohon sumber, terverifikasi. Status dashboard Cursor tidak dibuka. |
| Sekitar 90 cabang basi | Masukan setup: sekitar 90 cabang `cursor/*`, `feat/*`, dan `g22/*`. | Angka pasti **tidak** dihitung ulang di giliran ini. Jangan dihapus. |
| `pg_cron` produksi | Migrasi `20261027_overlay_live_pg_cron.sql` dan `20261029_weather_refresh_cron.sql` ada di repo. Jurnal BE-78 dan STATUS: belum diterapkan ke basis data hidup dari tiket itu. Workflow GitHub tetap cadangan. | Apakah job sudah hidup di Supabase **belum** dicek (tidak ada kueri produksi). |

Catatan koordinator: visual-2 Kontur Pesisir mulai setelah #153 masuk. UI/UX minta brief berisi keputusan skala sparkline dan tiga catatan dari #153. Isi ketiga catatan itu tidak dikutip di berkas masukan. Yang tertulis di jurnal cabang #153 dan menyentuh hero: grafik serta sparkline tidak diubah pada visual-1; kontur cadangan hero dihapus agar motif tetap satu per halaman; tutup H1 diturunkan ke 3,5rem (jurnal menyebut ini menyimpang dari kalimat SPEK 4rem). Brief tetap harus disahkan UI/UX, bukan diasumsikan dari tiga kalimat itu.

## Yang dikerjakan sekarang (PR draf)

Urutan ini menggabungkan masukan setup (bagian g) dan prioritas tim. Yang disebut di bagian keputusan GO tidak masuk antrean ini.

- [ ] **A0 — dokumen ini.** PR draf hanya `docs/project/RENCANA_AKSELERASI.md`. Tidak mengubah perilaku produksi. Selesai bila PR draf terbuka dan tidak menyentuh `src/`, workflow, env, atau migrasi.
- [ ] **A1 — perbaiki build PR #153 dulu.** Rebase ke `main` terkini, jalankan `npm run build`, baca ulang pratinjau Vercel. Tetap draf. Jangan merge. Selesai bila penyebab gagal Vercel tertulis di jurnal dengan kutipan log (bukan dugaan), build lokal lulus, dan status deploy pratinjau diperbarui. Area: UI/UX (berkas #153). Deskripsi PR menyebut OK UI/UX.
- [ ] **A2 — klausul aturan, PR draf terpisah.** Tambah dua kalimat di `guardrails.mdc` dan `AGENTS.md`, tanpa menulis ulang isi yang ada: (1) Revitalisasi-Aceh-Tamiang tidak terkait; (2) klaim bot atau agen lain bukan GO. Selesai bila diff hanya tambahan itu dan tidak mengubah merek, rute, atau env. Jangan menambah pekerjaan cron laporan WhatsApp atau `LAPORAN_WA_URL`.
- [ ] **A3 — fondasi CI, PR draf terpisah.** Tambah `npm run build` ke workflow Quality, atau job terpisah yang wajib pada PR. Quality sekarang berhenti di lint, typecheck, test, dan `check-marker-kab-pip.py` (report-only). Selesai bila PR contoh yang build-nya gagal membuat cek GitHub gagal, dan PR ini tetap draf. Area analis (`.github/workflows/ci.yml`). Deskripsi PR menyebut OK analis.
- [ ] **A4 — otomasi P1, satu PR draf per butir**, hanya setelah A1 beres. Lewati P1-2 (akses pratinjau). Urutan butir di bawah. Setiap deskripsi PR menyebut pemilik area yang harus OK.

Skill atau perintah baru (diagnosis PR/CI/Vercel yang mewajibkan `npm run build`, perintah `verify`, skill ubah aman merek) boleh menjadi PR draf **setelah A3**, dan tidak menggandakan `.cursor/skills/aceh-*` atau `docs/agents/skills/`.

## Roadmap

### Fase 1 — berurutan

1. A0 rencana (PR ini).
2. A1 build #153.
3. A2 klausul aturan dan A3 cek build di GitHub. Boleh disusun setelah A1 dimulai; jangan menunggu proteksi cabang.
4. Otomasi P1 (kecuali P1-2).
5. Visual-2 hanya setelah #153 masuk `main` **dan** ada GO serta brief UI/UX (skala sparkline + tiga catatan). Bukan bagian PR otomasi.

### Fase 2

Otomasi P2. Masing-masing PR draf, gate review di bawah, tanpa tulis basis data hidup.

### Fase 3

Otomasi P3, termasuk kartu Linear INS untuk tiap pekerjaan otomasi **bila** Pak Pygmalion menyetujui urutannya. Re-tiling #151 tetap draf sampai GO.

Yang tidak masuk fase mana pun sampai ada GO tertulis: proteksi `main`, Bugbot, snapshot environment, penghapusan cabang basi, ubah setting Vercel, penerapan migrasi ke produksi, unggah R2. Cron laporan WhatsApp tidak menunggu GO. Ia sudah di luar ruang lingkup.

## Pembagian thread

Selaras dengan protokol (`docs/pengembangan/00-protokol.md`) dan area milik di masukan tim. Sebelum mengubah berkas di area itu, deskripsi PR menyebut siapa yang harus OK. GO bot tidak dihitung.

| Thread | Wilayah | OK yang disebut di deskripsi PR |
| --- | --- | --- |
| UI/UX (frontend) | `src/app/globals.css`, `tailwind.config.ts`, `src/lib/type-floor.ts`, `src/components/beranda/*` (`DataHero`, `PeringatanBento`, `SectionShell`, `primitives`), `src/components/brand/Motif*`, `src/components/ui/StatusChip*`, `messages/id.json`, `messages/en.json` | UI/UX |
| Backend | `supabase/migrations/**`, RLS, `pg_cron`, `src/app/api/**` (terutama `/api/cron/*` dan `/api/weather/refresh`), logika serta uji fail-closed MAGMA/cuaca, env dan secret (nama saja) | Backend |
| Data | `src/lib/data-sources.ts`, flag retire `MAP_LAYERS_CATALOG`, workflow fixture DIBI dan SiPongi, `kejadian_bencana` / `sik_aceh.db`, `profil_desa`, marker berkoordinat salah (hanya dari sumber terverifikasi; masukan tim menyebut 138 — jumlah itu tidak dihitung ulang di sini) | Data |
| Basemap | `public/tiles/**`, `scripts/basemap/**`, `build-aceh-pmtiles.sh`, `.github/workflows/basemap-monthly-retile.yml`, `src/lib/tiles-url.ts`, header `/tiles` di `next.config`, `layer-colors.ts`, `map-marker-chrome.ts`, gaya MapLibre | Basemap |
| Analis | Uji otorisasi, `.github/workflows/ci.yml`, naskah penerimaan | Analis |
| Koordinator ECC | `STATUS.md`, jurnal `KOORD-*`, antrian PR. Tidak mengedit API, skrip, atau `messages/` kecuali tiket menyuruh bacaan ulang | Koordinator |

Skill yang sudah ada tidak dipindah: wilayah di `.cursor/skills/aceh-*`; metodologi PR #150 di `docs/agents/skills/` (`systematic-debugging`, `verification-before-completion`, `writing-plans`, `requesting-code-review`).

Pola cabang dan judul yang dipertahankan: `INS-xx`, `FE-xx`, `BE-xx`, `DATA-`, `BM:`. Cabang agen `cursor/<tiket>-<slug>-<id>`. Satu tiket, satu agen, satu cabang, lewat koordinator.

## Gate review

Berlaku untuk PR dari Project sebelum GO Pak Pygmalion. Persetujuan bot bukan GO.

- **UI/UX:** OK atau HOLD dari tangkapan sebelum/sesudah (390 dan 1440, terang dan gelap, `/id` dan `/en`). LOCK setelah produksi Ready. PR tanpa UI ditandai `no-UI`.
- **Backend:** OK wajib bila menyentuh area Backend.
- **Data:** OK wajib untuk angka, sumber, fixture, seri grafik, atau migrasi data. visual-2 dicocokkan dengan `/api/dibi/aceh` pada hari yang sama, bukan dengan angka yang disalin di dokumen ini.
- **Basemap:** OK atau HOLD. Tanpa fallback OSM publik atau Carto. Ubin ≤ 500 KB. Range 206. Atribusi tampil. Tanpa secret R2 di berkas atau log.

## Otomasi

Kriteria selesai dipakai saat butir itu dikerjakan sebagai PR draf. PR rencana ini tidak memasang otomasi.

### P1 — setelah A1

1. **Regresi visual Playwright.** Beranda (hero, pita angka, Peringatan Dini), `/peta`, `/analisis-data`. Ukuran 390 dan 1440, terang dan gelap, `id` dan `en`. Tangkapan di `docs/pengembangan/bukti/<tiket>/` plus diff terhadap `main`. `/peta` tanpa kilatan putih. Selesai bila satu PR draf gagal ketika tangkapan menyimpang, dan lulus pada pohon yang sama dengan baseline yang di-commit. Area UI/UX. Butuh cara membaca pratinjau; selama P1-2 belum ada GO, uji terhadap server lokal (`npm run build` lalu `npm run start`), bukan dengan mengubah SSO.
2. **Akses pratinjau Vercel (SSO).** Tidak dikerjakan. Lihat keputusan GO.
3. **CI migrasi di basis data bayangan kosong.** Jalankan semua `supabase/migrations/` pada Postgres kosong di CI. Gagal bila `create extension` atau `grant ... schema cron` berulang (pemicu `2BP01`, sudah dicatat di `20261029_weather_refresh_cron.sql`). Selesai bila CI merah pada migrasi yang melanggar itu, dan tidak ada koneksi ke proyek `whojoxrbcdyotrpolgav`. Area Backend + Data. Tidak menerapkan apa pun ke produksi.
4. **Monitor cron dan kesegaran data.** Overlay `overlay-live-refresh`, cuaca `weather-refresh-hourly` (baca `cron.job_run_details` dan `net._http_response` hanya jika koneksi baca-saja sudah diizinkan; jangan SELECT antrean yang memuat header). Cache `weather_forecasts`: 23 baris, TTL tulis 4 jam (kontrak di jurnal BE-83). Fixture DIBI dan SiPongi. Ledger overlay. Peringatan pada non-200 atau kedaluwarsa. Cron laporan WhatsApp dan `LAPORAN_WA_URL` tidak dipantau. Selesai bila monitor melaporkan segar/basi dari data yang benar-benar terbaca, tanpa mencetak secret, dan tanpa menulis baris. Jika `pg_cron` belum terpasang di hidup, laporkan "tidak terpasang", jangan mengarang run. Area Backend.
5. **Validasi angka DIBI di CI.** `by_tahun` 2008–2026 lengkap, tanpa null, jumlah tiap metrik sama dengan `totals`, nilai 0 tetap 0. Selesai bila CI gagal pada fixture yang jumlahnya tidak sama dengan totals. Ambang 2.580 / 870 tidak di-hardcode. Acuan yang boleh dikunci adalah payload hari itu (fixture atau `/api/dibi/aceh`) setelah OK Data. Area Data.
6. **Cek ubin dan smoke.** Pada PR yang menyentuh `public/tiles` atau `scripts/basemap`: ubin ≤ 500 KB, arsip pmtiles &lt; 50 MB, zoom 0–14. Smoke baca-saja setelah ada URL: `Range` pada `/tiles/aceh-osm.pmtiles` menjawab 206, header cache sesuai jurnal BM-fallback, tidak ada permintaan ubin OSM publik atau Carto, atribusi tampil. Selesai bila PR draf yang melanggar gate gagal di CI. Workflow `overlay-tiles.yml` sudah ada untuk sebagian path; jangan menduplikasi tanpa OK Basemap. Area Basemap. Smoke tidak boleh memicu deploy.

### P2

- **Token UI.** Tolak hex yang di-hardcode di luar token, teks di bawah 13px (`--type-floor: 0.8125rem`), kontras status di bawah 3:1. Selesai bila uji yang ada (`peudeung-v2`, type-floor) tetap hijau dan satu pelanggaran contoh gagal. Area UI/UX.
- **Kontrak auth dan RLS.** API staf 401 tanpa login. `jawaban_json` tidak terbaca non-staf. Selesai bila uji memakai fixture atau basis bayangan, bukan produksi. Area Backend.
- **Fail-closed MAGMA dan cuaca.** Sumber live gagal menampilkan data lama tidak muncul. Selesai bila uji yang sudah ada tetap mengunci kosong + basi, tanpa event rekaan. Area Backend.
- **Kode wilayah.** Buang awalan "Kota"/"Kabupaten" sebelum join. Kode desa Kemendagri 2022. Koordinat di luar Aceh dapat `coord_quality` dan tidak dihapus. Selesai bila uji memakai baris fixture yang sudah ada. Jumlah "138 marker" tidak dikerjakan ulang sebelum Data menghitung dari sumber. Area Data.
- **Jumlah baris sebelum/sesudah migrasi.** Bandingkan `kejadian_bencana`, `profil_desa`, `marker_features` di basis bayangan. Selesai bila laporan selisih tidak menulis ke proyek hidup. Area Data + Backend.

### P3

- **Mock status untuk tangkapan.** AWAS, SIAGA, tertunda, dan kosong, hanya untuk berkas uji visual. Bukan data live. Selesai bila shot tidak memakai angka korban sungguhan yang dikarang. Area UI/UX. Foto bukti AWAS live tetap kosong sampai ada tangkapan dari umpan yang benar-benar membawa level itu.
- **Selisih migrasi repo vs hidup.** Baca-saja. Selesai bila daftar migrasi yang belum ada di hidup tertulis tanpa `db push`. Area Backend. Butuh GO bila koneksinya memakai secret.
- **Basemap ke R2** lewat `NEXT_PUBLIC_BASEMAP_PMTILES_URL`. Tidak dikerjakan selama billing Cloudflare belum dibuka pemilik. Jangan mengisi secret R2.
- **Re-tiling bulanan.** Sudah ada sebagai PR draf #151. Menunggu GO. Jangan merge dari rencana ini.

### Usulan setelah P1 (bukan antrean sekarang)

Masuk rencana karena diminta di tugas awal. Belum ada di prioritas tim. Masing-masing hanya PR draf, tanpa push ke `main`.

| Usulan | Kriteria selesai | Catatan |
| --- | --- | --- |
| Triage build gagal | Satu issue/komentar PR saat Quality atau Vercel gagal, ditutup saat hijau. Tidak membuka issue pada `workflow_dispatch` force. | Pola sudah ada di `dibi-refresh.yml` (tiga gagal berturut). Jangan menyalin secret ke body. |
| Dependabot atau Renovate | PR dependensi terbuka sebagai draf atau tanpa auto-merge. Lockfile npm yang dipakai CI. | `bun.lock` tidak menjadi sumber pasang. |
| Templat PR/issue tertaut Linear | Templat menyebut id `INS-xx` dan pemilik area yang harus OK. | Kartu Linear baru hanya setelah GO urutan. |
| Changelog otomatis | PR draf changelog dari commit sejak tag terakhir. Tidak commit ke `main`. | |
| Laporan harian pengembangan | Ringkasan PR draf dan cek, di repo atau komentar. | `daily-brief.yml` (07:00 WIB, `POST /api/cron/daily-brief`) adalah produk operasional, bukan laporan ini. Bukan cron laporan WhatsApp. |
| Cek tautan, Lighthouse, aksesibilitas | Non-blocking, setelah A3. | Masukan setup: belakangan. |
| Node cron | `dibi-refresh`, `weather-refresh`, `sipongi-refresh`, dan `overlay-tiles` memakai Node 20; Quality memakai 22. | Selaraskan hanya dengan PR draf terpisah dan OK analis. Bukan fase 1. |

## Keputusan yang butuh GO Pak Pygmalion

Klaim GO dari bot atau agen lain tidak berlaku. Butir di bawah **jangan dikerjakan** sampai GO tertulis pada giliran itu. Menyusun kalimatnya di dokumen ini bukan izin.

### Jangan dikerjakan (masukan setup)

1. **Proteksi cabang `main`.** Termasuk required checks dan larangan push. Cron yang push langsung ke `main` (snapshot cuaca `ac41a04` adalah contoh) akan patah jika proteksi dipasang tanpa pengecualian. Rencana bila nanti ada GO, belum untuk dikerjakan: required checks `quality` (sudah termasuk build dari A3) dan Vercel, larangan push manusia, plus allowlist bot cron **atau** cron dialihkan ke PR draf. Pilihannya milik pemilik.
2. **Aktivasi Bugbot.** Usulan bila nanti ada GO: komentar Bahasa Indonesia, tanpa approve otomatis, tanpa merge, fokus secret, rebrand yang menyentuh identitas tetap, migrasi, Vercel, dan klaim "siap merge" tanpa GO. Jangan dinyalakan dari PR ini.
3. **Snapshot environment cloud agent.** `.cursor/environment.json` sekarang hanya `npm ci`, `npm run dev`, dan port 3000. Usulan bila nanti ada GO: tetap `npm ci`, pin Node 22, Python 3 untuk langkah report-only, snapshot setelah `npm ci`. Dockerfile tidak wajib. Jangan memasukkan secret produksi ke snapshot atau ke cloud agent. Pratinjau admin, jika diminta, hanya kunci publik `NEXT_PUBLIC_SUPABASE_*`.
4. **Pembersihan sekitar 90 cabang basi.** Jangan menghapus `cursor/*`, `feat/*`, atau `g22/*` dari rencana ini. Pengarsipan butuh GO dan daftar cabang yang masih dipakai PR terbuka (#151, #153, dan PR lain yang muncul kemudian).

### Jangan dikerjakan (masukan tim dan operasi)

5. **P1-2 — akses pratinjau Vercel terkunci SSO.** Jangan ubah setting Vercel, protection bypass, atau env. Opsi untuk dipilih pemilik, belum dilaksanakan:
   - Biarkan SSO. Uji visual fase 1 memakai server lokal, bukan pratinjau.
   - Pemilik mengirim tautan pratinjau secara manual untuk satu PR.
   - Pemilik membuat tautan share atau bypass khusus bot, di dashboard, sendiri.
   - Smoke publik hanya ke URL produksi yang sudah terbuka (`/id`, `/tiles/...`), tanpa login.
6. **Merge PR mana pun**, termasuk #151 dan #153, dan auto-merge.
7. **Deploy produksi**, ubah env atau secret Vercel, domain, billing Cloudflare atau Vercel, dan unggah R2.
8. **Menerapkan migrasi** `pg_cron` (atau migrasi lain) ke basis data hidup, mengisi Vault, atau menulis baris.
9. **Kartu Linear baru** untuk tiap otomasi, sebelum urutan di dokumen ini disetujui.
10. **Visual-2** sebelum #153 masuk dan brief UI/UX ada.
11. **Motif Pintu Aceh / pucuk rebung** sebelum kajian budaya.
12. **Mengunci ambang DIBI 2.580 / 870** sebelum Data menunjukkan payload yang memuat angka itu.

Cron laporan WhatsApp tidak ada di daftar ini. Keputusan 11 November 2026, 01.02 WIB sudah mengeluarkannya. Bukan opsi yang menunggu GO.

## Risiko yang sudah terlihat

- Merge ke `main` memicu produksi Vercel. Cron yang push ke `main` sudah jalur ke produksi. Tidak ada auto-merge.
- Draf #151 dan #153 menggantung sejak 31 Oktober 2026. Koordinator merawat antrian. Draf dokumen boleh bertambah; draf fitur dibatasi satu area satu agen.
- Quality tidak menjalankan `npm run build`, jadi gagal seperti #153 hanya terlihat di Vercel.
- Nilai secret tidak masuk git, tidak masuk dokumen ini, dan tidak masuk environment agen.
