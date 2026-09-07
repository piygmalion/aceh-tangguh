# Rekomendasi integrasi BMKG Maritim

Tanggal bukti live: 6 September 2026. Tulisan, bukan tiket kode. Jangan DATA-4. Jangan POST nasional. Jangan mengubah [AN-4](jurnal/AN-4.md) tanpa naskah baru.

Sumber utama: [maritim.bmkg.go.id](https://maritim.bmkg.go.id/), [apidoc](https://maritim.bmkg.go.id/apidoc), [PDGT maritim](https://maritim.bmkg.go.id/cuaca/peringatan/gelombang), [PDGT nasional](https://www.bmkg.go.id/cuaca/maritim/peringatan-gelombang-tinggi). Kontrak Aceh: [AN-19](jurnal/AN-19.md), [BE-16](jurnal/BE-16.md), [`src/lib/maritime.ts`](../../src/lib/maritime.ts), [`src/lib/data-sources.ts`](../../src/lib/data-sources.ts).

Naskah perilaku kartu ke-5: [AN-36](jurnal/AN-36.md). Ringkasan visual: canvas `bmkg-maritim-integrasi.canvas.tsx`.

## Ringkasan

Aceh Tangguh sudah menarik prakiraan jam-per-jam BMKG Maritim ke layer peta (`maritimeWaters`, `maritimePorts`) lewat cron dan `maritime_forecast_cache`. Yang belum ada adalah kartu Peringatan Dini untuk **buletin resmi gelombang tinggi**. Kartu PD hari ini hanya cuaca darat, MAGMA, Sipongi, dan Tatonas.

Prakiraan slot peta dan buletin resmi bisa selisih pada hari yang sama. Kartu peringatan harus memakai buletin, bukan slot peta.

## Temuan live 6 September 2026

| Sumber | Isi Aceh |
| --- | --- |
| [PDGT nasional](https://www.bmkg.go.id/cuaca/maritim/peringatan-gelombang-tinggi) | Aceh **Sedang** (1,25–2,5 m), 4 perairan, berlaku 6 Sep 07.00 WIB – 9 Sep 07.00 WIB. Disebut: Aceh Besar–Meulaboh, Aceh Barat Daya–Simeulue, Aceh Singkil Pulo Banyak. Kelompok Indonesia: Samudra Hindia barat Aceh dan Selat Malaka bagian utara juga Sedang. |
| [P.A.05.json](https://maritim.bmkg.go.id/marine2026-data/perairan/P.A.05.json) | Perairan Aceh Besar–Meulaboh. `wave_cat` Sedang, tinggi 1,5–2,2 m. `no_surat` `B/ME.01.02/CP/05/KBTJ/IX/2026`. Stamet SIM Banda Aceh. |
| [M.03.json](https://maritim.bmkg.go.id/marine2026-data/perairan/M.03.json) | Samudra Hindia barat Aceh. Slot kini Sedang 2,1 m; `forecast_day2-4` naik ke **Tinggi 2,5–2,6 m**. |
| [XA001.json](https://maritim.bmkg.go.id/marine2026-data/pelabuhan/XA001.json) | Pelabuhan Ulee Lheue. Gelombang Tenang 0,1–0,3 m. Ada `visibility` (km) dan `tides` (m) yang belum dirender di kartu peta. |

Beranda PD di [`PeringatanDiniSection.tsx`](../../src/components/PeringatanDiniSection.tsx) memuat empat kartu. Regex `gelombang` di [`weather-summary.ts`](../../src/lib/peringatan-dini/weather-summary.ts) hanya melihat cuaca kab/kota, bukan payload maritim.

## Yang sudah ada — jangan diulang

| Komponen | Kontrak |
| --- | --- |
| Basis hulu | `https://maritim.bmkg.go.id/marine2026-data` — GET, tanpa auth, CORS diizinkan ([apidoc](https://maritim.bmkg.go.id/apidoc)) |
| Allowlist perairan | `P.A.01`–`P.A.08`, `M.01`, `M.03` di [`ACEH_PERAIRAN_CODES`](../../src/lib/overlay-layers.ts) |
| Pelabuhan | Fixture 15 titik `XA00*` dari `meta/pelabuhan.json`; GET hanya [`allowedPelabuhanKodes`](../../src/lib/maritime.ts) |
| Tulis | Hanya `refreshMaritimeForecasts()` dari `POST /api/cron/overlay-live`. GET cache-only |
| Cache | `maritime_forecast_cache` PK `kode`, `payload jsonb`, `expires_at` 2 jam |
| Peta | Choropleth `wave_cat` + popup pelabuhan; atribusi BMKG Maritim |
| Calon kejadian | AN-4: layer maritim **bukan** sumber calon ([`CALON_LAYER_KEYS`](../../src/lib/overlay-calon.ts)) |

Satuan resmi API ([apidoc](https://maritim.bmkg.go.id/apidoc)): waktu UTC; gelombang meter; angin/arus knot; visibilitas km; pasang surut meter. `forecast_day1` tiap 1 jam (24 titik). `forecast_day2-4` tiap 3 jam. Siklus sekitar 00 UTC.

Kode perairan Aceh dari [`meta/area_province.json`](https://maritim.bmkg.go.id/marine2026-data/meta/area_province.json):

| Kode | Nama |
| --- | --- |
| P.A.01 | Perairan Tamiang–Langsa |
| P.A.02 | Perairan Aceh Utara–Aceh Timur |
| P.A.03 | Perairan Utara Pidie Jaya–Aceh Besar |
| P.A.04 | Perairan Sabang Banda Aceh |
| P.A.05 | Perairan Aceh Besar–Meulaboh |
| P.A.06 | Perairan Aceh Barat Daya–Simeulue |
| P.A.07 | Perairan Aceh Singkil Pulo Banyak |
| P.A.08 | Perairan Selatan Simeulue |
| M.01 | Selat Malaka bagian utara (kelompok Indonesia) |
| M.03 | Samudra Hindia barat Aceh (kelompok Indonesia) |

Jangan menambah `M.02` (Selat Malaka bagian tengah) atau kode metos lain.

## Katalog produk — adopt / extend / skip

| Produk | Sumber | Keputusan | Alasan |
| --- | --- | --- | --- |
| Prakiraan perairan | `/perairan/{KODE}.json` | **Extend** | Sudah di peta; belum di PD; `wind_gust`, `current_*`, `no_surat`, outlook hari 2–4 belum dirender |
| Prakiraan pelabuhan | `/pelabuhan/{KODE}.json` | **Extend** | Popup sudah ada; `visibility` dan `tides` ada di payload live, belum di kartu |
| Indeks + geometri | `/meta/area_province.json`, `wilmetos.min.geojson`, `pelabuhan.json` | **Adopt** | Fixture sudah dari sini. ETL ulang hanya jika jumlah/kode berubah (pola DATA-2) |
| Peringatan gelombang | `/warning/{file}` + [PDGT maritim](https://maritim.bmkg.go.id/cuaca/peringatan/gelombang) + [PDGT nasional](https://www.bmkg.go.id/cuaca/maritim/peringatan-gelombang-tinggi) | **Build wrapper** | Sumber kebenaran kartu PD. Nama berkas `warning/` tidak tercantum di apidoc. `latest.json` dan `gelombang.json` = 404 pada 6 Sep 2026 |
| PDF/PNG buletin | `/doc/cuaca/{jenis}/{KODE}.{ext}` | **Tautkan, jangan parse** | Atribusi dan unduhan staf |
| WBFS METAREA XI | [wbfs.txt](https://maritim.bmkg.go.id/marine2026-data/wbfs/wbfs.txt), [buletin](https://maritim.bmkg.go.id/cuaca/bulletin) | **Opsional staf** | Bahasa Inggris, skala Douglas. Bukan kartu publik |
| InaWaves / InaFlows | [pusmar api23](https://maritim.bmkg.go.id/pusmar/api23/arr_req) | **Skip untuk PD** | Grid model. Berat. Boleh fase lanjut sebagai animasi peta, terpisah |
| Citra / radar / INAWIS / OFS | [beranda maritim](https://maritim.bmkg.go.id/) | **Taut luar** | Jangan proxy citra nasional ke overlay Aceh |

## Dua jalur data

**Jalur A — prakiraan (sudah ada).** Allowlist 10 perairan + 15 pelabuhan. Cron yang sama. Jangan mengarang tinggi gelombang jika cache stale.

**Jalur B — peringatan resmi (baru).** Ingest buletin PDGT. Filter hanya nama atau kode yang cocok allowlist. Kategori resmi BMKG, jangan ambang baru:

- Sedang 1,25–2,5 m
- Tinggi 2,5–4 m
- Sangat tinggi 4–6 m
- Ekstrem > 6 m

Kartu PD memakai jalur B. Peta tetap jalur A, dengan badge opsional “ada di buletin”, bukan mengganti warna `wave_cat`.

Jika jalur B gagal atau nama berkas `warning/` belum ketemu: kartu `unavailable` / stale. Jangan mengisi dari slot prakiraan. Pola MAGMA fail-closed, bukan pola Sipongi fixture.

Provenance disalin apa adanya: `no_surat`, `issued`, `valid_from` / `valid_to`, `nama_stasiun`.

## API

| Rute | Perilaku |
| --- | --- |
| `POST /api/cron/overlay-live` | Tambah `refreshMaritimeWarnings` di samping `refreshMaritimeForecasts`. Secret tetap `OVERLAY_CRON_SECRET`. GET tidak menulis |
| `GET /api/peringatan-dini` | Tambah field `maritim` sejajar `cuaca` / `magma` / `sipongi` / `tatonas`. Jangan merge ke kartu cuaca darat |
| `GET /api/peringatan-dini/maritim` | Opsional. Gagal independen seperti MAGMA/Sipongi |
| `GET /api/overlay/maritime/perairan` | Tetap cache prakiraan. Boleh properti `in_warning`, `warning_cat`, `outlook_max_wave_cat` jika cache B ada |
| `GET /api/overlay/maritime/pelabuhan/[kode]` | Tetap allowlist. Expose `visibility`, `tides`, `wind_gust`, `current_*` dari payload yang sudah tersimpan |

Jangan buka proxy baru ke `pusmar` atau ke `{kode}.json` di luar allowlist.

## Basis data

Jangan memasukkan peringatan ke `overlay_live_features`. AN-4 akan terseret.

Migrasi **baru** (bukan sunting [`20260910_overlay_layers.sql`](../../supabase/migrations/20260910_overlay_layers.sql)):

### `maritime_warning_cache`

| Kolom | Tipe | Catatan |
| --- | --- | --- |
| `external_id` | text PK | Hash `no_surat` + kode + `valid_from`, atau id hulu jika ada |
| `kode` | text nullable | Kosong jika buletin hanya nama perairan |
| `nama` | text | Nama perairan di buletin |
| `wave_cat` | text | Sedang / Tinggi / Sangat tinggi / Ekstrem |
| `wave_min_m` / `wave_max_m` | numeric nullable | Rentang resmi, bukan interpolasi |
| `valid_from` / `valid_to` | timestamptz | Masa berlaku buletin |
| `issued` | text | Stempel terbit hulu |
| `no_surat` | text | Nomor surat BMKG jika ada |
| `sinoptik` | text | Teks kondisi sinoptik |
| `source_url` | text | URL buletin yang diunduh |
| `payload` | jsonb | Tubuh hulu utuh |
| `fetched_at` / `expires_at` | timestamptz | TTL selaras cron overlay (2 jam) |

Indeks: `(wave_cat, valid_to)`, `(kode)`. RLS: SELECT publik; tulis `service_role`. Ikut `purge_expired_overlay_rows()` atau fungsi kembar.

`maritime_forecast_cache` tidak perlu kolom baru. `visibility` / `tides` / `wind_gust` sudah di `payload`. Perlu perluasan tipe TypeScript `MaritimeHourSlot` saja.

## Peringatan dini (prioritas 1)

Kartu ke-5. Grid menjadi lima. Jangan menimpa kartu cuaca.

- Kosong sah jika buletin tidak menyebut Aceh / `M.01` / `M.03`
- Tone: Sedang = `warn`; Tinggi / Sangat tinggi / Ekstrem = `danger`
- Isi: nama perairan, kategori + rentang meter, masa berlaku, taut ke PDGT resmi
- `href` peta: buka overlay `maritimeWaters`
- Perbarui i18n `peringatanDini.subtitle` (hari ini hanya BMKG cuaca, Magma, Sipongi)
- Jangan memakai IRBI cuaca ekstrem atau skor abrasi sebagai peringatan palsu

Perilaku terkunci di [AN-36](jurnal/AN-36.md).

## Layer peta (prioritas 2)

Perluas yang ada. Jangan layer baru kecuali badge peringatan.

- Kartu perairan: `wave_height`, `wind_gust`, arus, `issued` / `no_surat`
- Kartu pelabuhan: `visibility` (km), `tides` (m), gust
- Outlook: `max(wave_cat)` pada `forecast_day2-4` sebagai teks “puncak 3 hari”, bukan warna pengganti slot kini
- CTA “Peringatan BMKG” jika kode ada di cache B
- Stale = label, bukan angka karangan

Layer `maritimeWarnings` hanya jika geometri buletin beda dari `wilmetos`. Default: join ke [`perairan-aceh.geojson`](../../public/fixtures/overlays/perairan-aceh.geojson).

## Rekomendasi lain

- **Calon kejadian.** Tetap tertutup. Membuka “gelombang tinggi → calon Abrasi / Gelombang pasang” butuh naskah analis terpisah dari AN-36. Jangan otomatis dari prakiraan Sedang.
- **Analisis ancaman.** `gelombang_ekstrim_abrasi` boleh menampilkan konteks live sebagai atribusi, bukan KPI.
- **Staf/ops.** Taut PDF `doc/cuaca` + WBFS. Kontak Stamet SIM ada di payload P.A.05 (`stamet.bandaaceh@bmkg.go.id`).
- **ETL.** Bandingkan `meta/area_province.json` vs `ACEH_PERAIRAN_CODES` + jumlah 15 pelabuhan. Gagal jika anjlok (pola DATA-2).
- **Keamanan.** User-Agent yang sudah ada. Timeout 20 detik. Jangan scrape HTML beranda. Tulis hanya dari cron.

## Kebutuhan sebelum kode

1. Naskah analis [AN-36](jurnal/AN-36.md) — kartu ke-5, tone, fail-closed, bukan calon.
2. Spike readonly nama berkas + skema `/warning/{file}`. Jika folder tidak berindeks, fallback terdokumentasi: halaman PDGT nasional yang sudah terstruktur, tetap filter Aceh. Jangan HTML beranda peta.
3. Koordinator membuka gelombang di [STATUS.md](STATUS.md). Wilayah berkas tetap data / backend / frontend / analis.
4. Atribusi BMKG Maritim + taut resmi. Nilai gelombang disalin, tidak diinterpolasi.

## Yang tidak dikerjakan dari rekomendasi ini

- Rebuild [`maritime.ts`](../../src/lib/maritime.ts) atau ganti basis URL
- Proxy InaWaves / InaFlows ke `/api/overlay`
- Merge maritim ke `/api/weather` atau WeatherNext
- Calon kejadian dari overlay maritim
- Ambang meter buatan (misalnya “hanya >2 m”)
- Layer citra satelit / radar di peta operasional
- Sunting migrasi yang sudah diterapkan

## Sumber

- [Prakiraan Cuaca Maritim Indonesia — BMKG](https://maritim.bmkg.go.id/) (Sep 2026)
- [Dokumentasi API Data Maritim BMKG](https://maritim.bmkg.go.id/apidoc) (Sep 2026)
- [Cuaca Perairan](https://maritim.bmkg.go.id/cuaca/perairan) (Sep 2026)
- [Peringatan Gelombang Tinggi — maritim](https://maritim.bmkg.go.id/cuaca/peringatan/gelombang) (Sep 2026)
- [Peringatan Gelombang Tinggi — BMKG nasional](https://www.bmkg.go.id/cuaca/maritim/peringatan-gelombang-tinggi) (6 Sep 2026)
- [P.A.05.json](https://maritim.bmkg.go.id/marine2026-data/perairan/P.A.05.json), [M.03.json](https://maritim.bmkg.go.id/marine2026-data/perairan/M.03.json), [XA001.json](https://maritim.bmkg.go.id/marine2026-data/pelabuhan/XA001.json), [area_province.json](https://maritim.bmkg.go.id/marine2026-data/meta/area_province.json) (6 Sep 2026)
- [WBFS txt](https://maritim.bmkg.go.id/marine2026-data/wbfs/wbfs.txt), [buletin METAREA XI](https://maritim.bmkg.go.id/cuaca/bulletin)
- [InaWaves / InaFlows arr_req](https://maritim.bmkg.go.id/pusmar/api23/arr_req)
