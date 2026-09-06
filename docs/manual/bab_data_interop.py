"""Naskah Bagian H — Data dan interoperabilitas (bukan salinan Markdown)."""

from __future__ import annotations

TEKNIS = "docs/manual/figures/teknis"
ILUSTRASI = "docs/manual/figures/ilustrasi"

# (relpath, judul, keterangan, sumber)
VISUAL_TEKNIS = [
    (
        f"{TEKNIS}/01-arsitektur-tinggi.png",
        "Arsitektur tingkat tinggi",
        "Next.js di Vercel, Supabase + RLS, cron Bearer, dan jalur warga versus staf. Sumber resmi dilanggan, bukan diganti.",
        "README.md; src/lib/data-sources.ts; docs/vercel.md",
    ),
    (
        f"{TEKNIS}/02-peta-overlay.png",
        "Peta — fixture statis versus overlay live",
        "GET /api/overlay/[key] hanya membaca cache live. Fixture statis lewat /api/overlay/static/[key]. Kosong sah bukan 503.",
        "src/lib/overlay-live.ts; src/lib/overlay-layers.ts; kontrak BE-8 / AN-5",
    ),
    (
        f"{TEKNIS}/03-sinyal-calon-kejadian.png",
        "Sinyal overlay menjadi calon, lalu kejadian operasi",
        "Persist overlay dapat menelurkan overlay_calon_kejadian. Staf menerima atau menolak di konsol. Kab tanpa wilayah tidak melihat calon.",
        "AN-4; AN-6; BE-6; FE-8; src/lib/overlay-calon.ts",
    ),
    (
        f"{TEKNIS}/04-laporan-moderasi.png",
        "Laporan warga ke moderasi ke peta",
        "POST publik lewat Zod dan rate limit. PII dienkripsi di server. Moderasi disaring per kabupaten. Peta hanya menampilkan baris yang lolos.",
        "docs/laporan-production.md; src/lib/laporan/; src/lib/sik/laporan-scope.ts",
    ),
    (
        f"{TEKNIS}/05-siklus-sik-kib.png",
        "Siklus SIK kejadian, fase, dan KIB",
        "Buat kejadian, ganti fase, catat dampak hanya jika is_ops(), validasi SDB, cetak KIB.",
        "src/app/api/sik/kejadian/**; FE-11; AN-10",
    ),
    (
        f"{TEKNIS}/06-matriks-peran.png",
        "Matriks otorisasi staf (ringkas)",
        "admin_kabkota tanpa profil ditolak (fail-closed). PII dampak bukan hak default. Bukan bagan nama orang.",
        "AN-20; BE-17; AN-21; AN-22",
    ),
    (
        f"{TEKNIS}/07-gateway-sik-resource.png",
        "Gateway /api/sik/resource",
        "Satu pintu CRUD. Mode scope: row_kab, kejadian, provincial, via_rehab.",
        "src/app/api/sik/resource/route.ts; src/lib/sik/resource-scope.ts",
    ),
    (
        f"{TEKNIS}/08-sdb.png",
        "SDB daerah",
        "Katalog, jadwal, dan paket ekspor tingkat daerah. Bukan unggah ke data.bnpb.go.id.",
        "DATA-5; BE-9; BE-10; FE-9; src/lib/sik/sdb.ts",
    ),
    (
        f"{TEKNIS}/09-destana.png",
        "Destana — SI dan 17 aktivitas",
        "API scoped. Rumus PKD tidak diubah di gelombang 9. Publik /id/destana memakai i18n.",
        "AN-7; DATA-6; BE-12; FE-13; FE-14",
    ),
    (
        f"{TEKNIS}/10-cuaca-resmi-inovasi.png",
        "Cuaca resmi versus inovasi",
        "BMKG tetap mesin resmi. WeatherNext 3 hanya GET /api/weather/inovasi. Jangan mengarang suhu jika Earth Engine tidak terpasang.",
        "AN-24; DATA-13; BE-20; FE-19",
    ),
    (
        f"{TEKNIS}/11-cron-overlay-ttl.png",
        "Cron overlay, TTL, dan purge",
        "Actions memanggil POST cron. GET publik hanya baca. purge_expired_overlay_rows() tidak dijalankan anon.",
        "DATA-1; BE-4; BE-14; G11",
    ),
    (
        f"{TEKNIS}/12-empat-agen-siklus.png",
        "Empat agen dan siklus tulis–baca ulang",
        "Niat, baca ulang, kode, bukti, baca bukti, tutup STATUS. Maksimum lima putaran.",
        "docs/pengembangan/00-protokol.md",
    ),
    (
        f"{TEKNIS}/13-gelombang-timeline.png",
        "Garis waktu gelombang 0–19",
        "Tema proses, bukan 19 tiket. DATA-4 tetap menunggu naskah.",
        "docs/pengembangan/STATUS.md",
    ),
    (
        f"{TEKNIS}/14-etl-offline.png",
        "ETL offline overlay",
        "Ruang Kita hanya discovery URL. Filter Aceh, checksum, ambang drop 40 persen, lalu tulis fixture.",
        "scripts/scrape-ruangkita-static.mjs; scripts/lib/overlay-etl.mjs; DATA-2",
    ),
    (
        f"{TEKNIS}/15-refresh-live.png",
        "Refresh live",
        "Cron overlay, cuaca, dan DIBI memakai secret berbeda. Nilai secret tidak ditulis di manual ini.",
        "docs/vercel.md; .github/workflows/overlay-live-refresh.yml",
    ),
    (
        f"{TEKNIS}/16-keputusan-baca.png",
        "Keputusan baca data",
        "Supabase dulu, lalu fixture. Overlay hulu rusak = 503. Koleksi live kosong bisa sah (200).",
        "src/lib/supabase/fallback.ts; BE-8; AN-5",
    ),
]

VISUAL_ILUSTRASI = [
    (
        f"{ILUSTRASI}/sik-observatorium.png",
        "Konsep SIK Aceh Tangguh",
        "Observatorium digital: peta, konsol staf, dan laporan warga dalam satu ruang keputusan. Ilustrasi, bukan spek teknis.",
        "Ilustrasi konsep",
    ),
    (
        f"{ILUSTRASI}/destana-desa.png",
        "Destana — kesiapsiagaan desa",
        "Latihan dan musyawarah desa, bukan pengganti instrumen SI/PKD di basis data.",
        "Ilustrasi konsep",
    ),
    (
        f"{ILUSTRASI}/rantai-peringatan-dini.png",
        "Rantai peringatan dini",
        "Gempa, gunung api, hidrologi, dan hotspot bertemu di peta provinsi. Sumber tetap nasional/resmi.",
        "Ilustrasi konsep",
    ),
    (
        f"{ILUSTRASI}/warga-lapor.png",
        "Partisipasi warga",
        "Laporan bergeo dari gawai menuju moderasi, bukan langsung menjadi kebenaran peta.",
        "Ilustrasi konsep",
    ),
    (
        f"{ILUSTRASI}/mitra-layanan.png",
        "Mitra dan layanan publik",
        "Pelatihan, nomor penting, dan relawan sebagai ekosistem pendukung — tanpa logo instansi.",
        "Ilustrasi konsep",
    ),
    (
        f"{ILUSTRASI}/staf-23-kab.png",
        "Koordinasi 23 kabupaten/kota",
        "Slot admin_kabkota di bawah pengawasan provinsi. Bukan bagan nama pejabat.",
        "Ilustrasi konsep",
    ),
]


def chapter_blocks() -> list[dict]:
    """Blok naskah Bagian H. type: p | h2 | h3 | ul | table | figure."""
    return [
        {
            "type": "p",
            "text": (
                "Bagian ini disusun khusus untuk manual, bukan salinan berkas Markdown. "
                "Isinya merujuk kontrak di src/lib/data-sources.ts, scripts/lib/overlay-etl.mjs, "
                "src/lib/supabase/fallback.ts, dan docs/pengembangan/01-data.md. "
                "Angka korban, zona KRB, dan kode perangkat Tatonas tidak dikarang di sini."
            ),
        },
        {"type": "figure", "rel": f"{TEKNIS}/14-etl-offline.png"},
        {"type": "figure", "rel": f"{TEKNIS}/15-refresh-live.png"},
        {"type": "figure", "rel": f"{TEKNIS}/16-keputusan-baca.png"},
        {"type": "figure", "rel": f"{TEKNIS}/02-peta-overlay.png"},
        {"type": "figure", "rel": f"{TEKNIS}/11-cron-overlay-ttl.png"},
        {
            "type": "h2",
            "text": "Tujuan dan ruang lingkup",
        },
        {
            "type": "p",
            "text": (
                "Aceh Tangguh menampilkan data kebencanaan Provinsi Aceh di peta dan konsol staf. "
                "Interoperabilitas berarti memakai umpan resmi (BMKG, MAGMA, Sipongi, DIBI, InaRISK, Tatonas) "
                "plus data operasional daerah (kejadian SIK, laporan warga, Destana, SDB), "
                "tanpa membangun saingan nasional dan tanpa mengisi lubang dengan tebakan."
            ),
        },
        {
            "type": "h2",
            "text": "Prinsip interoperabilitas",
        },
        {
            "type": "ul",
            "items": [
                "Aceh-only: filter bbox plus penolakan istilah provinsi lain; bbox bukan pengganti batas administrasi.",
                "Fail-closed: overlay hulu rusak = 503; admin_kabkota tanpa profil ditolak; POST publik tanpa Redis di produksi = 503.",
                "Tidak mengarang data: bukan FeatureCollection kosong sebagai sukses jika sumber gagal; bukan suhu inovasi palsu; bukan loggerKind Tatonas.",
                "Dua jalur cuaca: resmi BMKG di /api/weather; inovasi WeatherNext 3 hanya di /api/weather/inovasi.",
                "Ruang Kita hanya ETL discovery. Runtime peta tidak memanggil ruangkita.net.",
                "Jangan POST ke data.bnpb.go.id. DIBI memakai dashboard Superset publik.",
            ],
        },
        {
            "type": "h2",
            "text": "Tiga lapisan data",
        },
        {
            "type": "table",
            "headers": ["Lapisan", "Isi", "Contoh"],
            "rows": [
                [
                    "JSON domain di Supabase",
                    "Tabel operasional + CMS; RLS; service role hanya di server Node",
                    "kejadian_bencana, marker_features, laporan_*, overlay_live_features, destana_*, sdb_*",
                ],
                [
                    "Snapshot fixture",
                    "public/fixtures/ jika env kosong, query gagal, atau tabel kosong",
                    "dibi-aceh.json, weather-snapshot.json, kejadian-bencana.json, irbi-2025.json",
                ],
                [
                    "Geometri di disk",
                    "GeoJSON + PMTiles; tidak dipindah ke Postgres sebagai pengganti ubin",
                    "public/fixtures/overlays/*, public/fixtures/areas/*, public/tiles/*.pmtiles",
                ],
            ],
        },
        {
            "type": "p",
            "text": (
                "PRRPKA di beranda tetap fixture-only (prrpka_aceh.json + prrpka_ringkasan.json). "
                "Tidak ada tabel seed Supabase yang setara. "
                "Pola baca domain lain: trySupabaseThenFixture di src/lib/supabase/fallback.ts."
            ),
        },
        {
            "type": "h2",
            "text": "Inventaris sumber resmi",
        },
        {
            "type": "table",
            "headers": ["Sumber", "Pakai untuk", "Cara masuk", "Batas"],
            "rows": [
                ["BMKG TEWS", "Gempa live di peta", "Cron overlay → overlay_live_features", "GET/cron; bukan tebakan magnitudo"],
                ["BMKG cuaca", "Prakiraan 23 kab", "weather_forecasts + snapshot", "Mesin resmi; Open-Meteo hanya fallback"],
                ["BMKG maritim", "Perairan dan pelabuhan Aceh", "maritime_forecast_cache + GeoJSON statis", "Allowlist pelabuhan; GET hanya baca"],
                ["MAGMA", "Gempa vulkanik / gunung api", "Cron + fixture peringatan", "Filter Aceh"],
                ["Sipongi KLHK", "Hotspot", "Cron + fixture", "Medium/high Aceh"],
                ["Tatonas", "Pos hidrologi", "Client dt_data; parse.ts tidak menebak loggerKind", "DATA-4 menunggu naskah AN-3"],
                ["BNPB DIBI", "KPI dampak Aceh", "Superset publik + dibi-aceh.json", "Jangan POST nasional"],
                ["InaRISK", "Patahan + raster bahaya", "ETL clip + proxy ubin", "Clip ke Aceh; bukan zona KRB dikarang"],
                ["WeatherNext 3", "Strip inovasi", "Earth Engine atau unconfigured", "Jangan digabung ke /api/weather"],
            ],
        },
        {
            "type": "h2",
            "text": "Inventaris sumber internal",
        },
        {
            "type": "ul",
            "items": [
                "Google Sheet koordinator → profil_desa lewat npm run update:profil-sheet (dry-run default; join kode_desa_kelurahan 10 digit; jangan isi 4 baris null-kode).",
                "Drive/kompilasi kejadian dan fasilitas → markers.geojson lewat scripts/build-main-markers.py.",
                "IRBI 2025, APBA, publikasi, KRB katalog: fixture plus tabel CMS jika sudah diisi.",
                "Laporan warga, kejadian operasi, Destana, SDB: hidup di Supabase, bukan di-seed dari Markdown.",
            ],
        },
        {
            "type": "h2",
            "text": "Skema Supabase yang relevan",
        },
        {
            "type": "p",
            "text": (
                "Migrasi baru selalu berkas baru; berkas yang sudah diterapkan tidak disunting. "
                "Kelompok utama: domain CMS (20260823, 20260906); laporan (20260825–20260904); "
                "cuaca dan overlay (20260824, 20260910, 20260913, 20260916, 20260921); "
                "SIK (20260907); calon overlay (20260915); SDB (20260917); Destana (20260918). "
                "Definisi tipe: src/lib/supabase/types.ts dan src/lib/sik/db-tables.ts."
            ),
        },
        {
            "type": "h2",
            "text": "ETL offline di scripts/",
        },
        {
            "type": "table",
            "headers": ["Perintah / skrip", "Keluaran", "Catatan"],
            "rows": [
                ["npm run scrape:ruangkita", "overlays/*.geojson + manifest.json", "Checksum dan ambang 40 persen"],
                ["npm run fetch:inarisk-faults", "patahan ter-clip", "MapServer layer 0 dan 6"],
                ["npm run build:dibi", "dibi-aceh.json", "Filter provinsi=Aceh"],
                ["npm run build:weather", "weather-snapshot.json", "23 kab adm4"],
                ["scripts/build-weather-inovasi-snapshot.mjs", "weather-inovasi-snapshot.json", "unconfigured jika EE tidak ada"],
                ["npm run refresh:peringatan", "peringatan-magma/sipongi.json", "Tanpa posko dikarang"],
                ["npm run update:profil-sheet", "profil_desa", "Dry-run; --apply hanya setelah tinjauan"],
                ["scripts/build-pmtiles.sh", "public/tiles/*.pmtiles", "Geometri ubin, bukan JSON domain"],
            ],
        },
        {
            "type": "h2",
            "text": "Refresh live (cron)",
        },
        {
            "type": "p",
            "text": (
                "GitHub Actions overlay-live-refresh.yml memanggil POST /api/cron/overlay-live setiap 15 menit "
                "dengan nama env OVERLAY_CRON_SECRET dan OVERLAY_REFRESH_URL. "
                "Cron cuaca resmi dan inovasi memakai secret terpisah. "
                "GET publik tidak menulis. Ledger overlay_live_refresh mencatat refresh."
            ),
        },
        {
            "type": "h2",
            "text": "Kontrak API: live, cache, fixture",
        },
        {
            "type": "table",
            "headers": ["Keluarga", "Prioritas baca", "Rute"],
            "rows": [
                ["Kejadian / marker / IRBI / anggaran / publikasi", "Supabase lalu fixture", "/api/kejadian, /api/layers/markers, /api/irbi, …"],
                ["PRRPKA", "Fixture saja", "/api/prrpka/summary"],
                ["Overlay live", "Tabel live lalu titik fixture; rusak = 503", "/api/overlay/[key]"],
                ["Overlay statis", "Disk", "/api/overlay/static/[key]"],
                ["Cuaca resmi", "Cache → live → snapshot", "/api/weather"],
                ["Cuaca inovasi", "Snapshot inovasi → fixture / unconfigured", "/api/weather/inovasi"],
                ["DIBI", "Superset live → fixture", "/api/dibi/aceh"],
                ["Laporan peta / SIK / Destana / SDB", "Supabase (tanpa seed publik)", "/api/laporan/peta, /api/sik/*"],
            ],
        },
        {
            "type": "h2",
            "text": "Filter wilayah Aceh",
        },
        {
            "type": "p",
            "text": (
                "Helper ETL memakai ACEH_BBOX sekitar [95, 2, 98.3, 6.15] plus penolakan istilah provinsi "
                "seperti Sumatera Utara / XB005. Migrasi 20260912 menghapus baris non-Aceh yang sudah masuk. "
                "Protokol: jangan memakai bbox sebagai pengganti batas administratif. "
                "Tatonas punya saringan sendiri di src/lib/tatonas/aceh.ts."
            ),
        },
        {
            "type": "h2",
            "text": "Integritas ETL overlay",
        },
        {
            "type": "p",
            "text": (
                "manifest.json mencatat featureCount dan SHA-256 per lapisan. "
                "Skrip keluar non-nol jika jumlah fitur 0 atau jatuh lebih dari 40 persen dibanding unduhan sebelumnya, "
                "kecuali FORCE_OVERLAY_ETL=1. Baris tanpa geometri dibuang. Ini tiket DATA-2."
            ),
        },
        {
            "type": "h2",
            "text": "TTL dan purge",
        },
        {
            "type": "p",
            "text": (
                "overlay_live_features.expires_at dan maritime_forecast_cache.expires_at diisi backend. "
                "Fungsi public.purge_expired_overlay_rows() menghapus baris expires_at < now(). "
                "Baris expires_at null tidak dihapus pada gelombang 1. "
                "weather_forecasts memakai TTL sekitar 2 jam. "
                "Jangan GRANT EXECUTE purge kepada anon (dikunci di G11)."
            ),
        },
        {
            "type": "h2",
            "text": "Batasan yang tidak boleh dilanggar",
        },
        {
            "type": "ul",
            "items": [
                "Jangan POST ke data.bnpb.go.id.",
                "Jangan menebak loggerKind / kd_hardware Tatonas sampai jawaban tertulis masuk di AN-3; DATA-4 = menunggu-naskah.",
                "Jangan membuka P2 Juklak dari tiket data.",
                "Jangan menulis nilai secret di jurnal, STATUS, atau manual ini — nama env saja.",
                "Jangan menyunting migrasi yang sudah diterapkan.",
                "Jangan menggabungkan inovasi cuaca ke /api/weather.",
                "Jangan menandai kosong-sebagai-sukses jika hulu overlay gagal.",
            ],
        },
        {
            "type": "h2",
            "text": "Operasional env dan cron",
        },
        {
            "type": "p",
            "text": (
                "Nama yang harus ada di Vercel/Actions (nilai tidak dicantumkan): "
                "NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, "
                "LAPORAN_PII_KEY, LAPORAN_PII_SALT, LAPORAN_CRON_SECRET, WEATHER_CRON_SECRET, "
                "WEATHER_INOVASI_CRON_SECRET (opsional, jangan daur ulang secret resmi), "
                "OVERLAY_CRON_SECRET, OVERLAY_REFRESH_URL, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN. "
                "Jangan set STATIC_EXPORT / GITHUB_PAGES di Vercel. Lihat docs/vercel.md dan SECURITY.md."
            ),
        },
        {
            "type": "h2",
            "text": "Fallback dan kesehatan data",
        },
        {
            "type": "p",
            "text": (
                "isServingFixtureFallback() di src/lib/data-health.ts menandai saat JSON domain disajikan dari disk. "
                "Mode pratinjau/static export memaksa fixture lewat src/lib/preview/public-api.ts. "
                "UI overlay yang stale/gagal mengikuti FE-3 — jangan menyembunyikan kegagalan sebagai peta kosong."
            ),
        },
        {
            "type": "h2",
            "text": "Keamanan data API dan RLS",
        },
        {
            "type": "ul",
            "items": [
                "Anon tidak INSERT laporan; authenticated tidak SELECT kolom PII (20260902, 20260904).",
                "RPC definer tulis (next_laporan_nomor, upsert_marker_features) dicabut dari Data API; service_role tetap (DATA-9).",
                "next_kejadian_nomor: anon EXECUTE = false (DATA-10).",
                "Staging _tmp_profil_sheet_apply dikunci (DATA-8).",
                "Verifikasi: npm run verify:laporan.",
            ],
        },
        {
            "type": "h2",
            "text": "Checklist verifikasi sebelum produksi",
        },
        {
            "type": "ul",
            "items": [
                "npm test dan npx tsc --noEmit hijau.",
                "npm run verify:laporan dan verify cuaca jika overlay/cuaca diaktifkan.",
                "Satu workflow_dispatch overlay-live-refresh tidak skip secret; GET /api/overlay/bmkgQuakes 200 setelah refresh.",
                "GET live kosong sah tetap 200; hulu rusak 503.",
                "Profil 23 admin_kabkota terisi sebelum mengandalkan filter kab.",
                "DATA-4 tidak ditandai siap-kode.",
            ],
        },
        {
            "type": "h2",
            "text": "Glosarium ringkas",
        },
        {
            "type": "table",
            "headers": ["Istilah", "Arti di Aceh Tangguh"],
            "rows": [
                ["trySupabaseThenFixture", "Baca tabel; jika kosong/gagal, baca public/fixtures"],
                ["overlay live", "Lapisan yang diisi cron, bukan GeoJSON statis pelabuhan/patahan"],
                ["kosong sah", "Sumber hidup, tidak ada peristiwa; HTTP 200"],
                ["503 overlay", "Sumber atau konfigurasi gagal; jangan menyamar sebagai koleksi kosong"],
                ["unconfigured", "Inovasi cuaca tanpa Earth Engine; bukan suhu fiktif"],
                ["DATA-4", "Pemetaan loggerKind Tatonas; menunggu jawaban penyedia"],
            ],
        },
    ]
