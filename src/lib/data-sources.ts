/** Catalog of public datasets and media used by Aceh Tangguh (own inventory; not Mandum copy). */

export type DataSourceEntry = {
  id: string;
  titleId: string;
  titleEn: string;
  source: string;
  license: string;
  date: string;
  format: string;
  usedFor: string;
  href?: string;
};

export const DATA_SOURCES: DataSourceEntry[] = [
  {
    id: "dibi-aceh",
    titleId: "DIBI BNPB — dampak kejadian bencana Provinsi Aceh",
    titleEn: "BNPB DIBI — Aceh province disaster impact",
    source:
      "BNPB Data Informasi Bencana Indonesia (DIBI) — Apache Superset dashboard “Data Informasi Bencana Indonesia”, dataset Dampak kejadian bencana (pdsi_staging.mv_dibi_dampak_by_kejadian). Filtered to provinsi=Aceh, is_bencana=true.",
    license:
      "Public DIBI dashboard — attribute Badan Nasional Penanggulangan Bencana (BNPB). Internal Superset API; schema may change without notice.",
    date: "Live query + snapshot fixture 2026-08-24 (Aceh 2008–2026)",
    format: "JSON via POST /api/v1/chart/data (dashboard_id=2, Aceh filters)",
    usedFor:
      "Homepage disaster dashboard — Aceh-only KPIs (events, casualties, displacement, damaged/flooded houses, housing-loss estimate) and charts by hazard type, kabupaten/kota, and year",
    href: "https://dibi.bnpb.go.id/superset/dashboard/2/",
  },
  {
    id: "kejadian-bencana",
    titleId: "Kejadian bencana",
    titleEn: "Disaster events",
    source:
      "BPBA / BNPB / BMKG compiled — kejadian_bencana_aceh_lengkap.json (Drive Aceh data)",
    license: "Operational compilation — attribute BPBA, BNPB, BMKG, Badan Geologi",
    date: "2021–2026 (snapshot 2026-08-23)",
    format: "JSON → GeoJSON markers (disasterEvents)",
    usedFor:
      "Data Utama — map layer Kejadian bencana (427 points). ACEH-2023-0005 (Gempa Bumi, Aceh Singkil, lat 1.91 / lon 97.83) is included with coord_quality=offshore_or_out_of_bbox and approx=true — the map does not clamp an Aceh bbox, so the epicentre stays visible if you pan south. Rekapitulasi Tahunan excluded. Integer lon/lat (if any) are flagged truncated_integer; decimals are not invented.",
  },
  {
    id: "sik-aceh",
    titleId: "SIK Aceh — master SQLite (pengayaan)",
    titleEn: "SIK Aceh — master SQLite (enrichment)",
    source:
      "Local master sik_aceh.db (operator path: data bencana aceh/database/master). Copied to data/sik/sik_aceh.db (gitignored). Not a public dump.",
    license:
      "Operational BPBA / SIK Aceh compilation — do not republish the raw SQLite",
    date: "Imported on demand via python3 scripts/import-sik-aceh.py (dry-run default)",
    format: "SQLite → kejadian_bencana payload + disasterEvents GeoJSON",
    usedFor:
      "Enrich the existing 427-event bencana layer and /data-bencana table. Join desa only on 10-digit kode_desa_kelurahan. New events use SIK- ids. Does not seed laporan_*, does not write polygons to Postgres, does not invent GPS.",
  },
  {
    id: "fasyankes",
    titleId: "Fasilitas kesehatan (fasyankes terdampak)",
    titleEn: "Health facilities (affected fasyankes)",
    source:
      "fasilitas_kesehatan_aceh.json — Inventarisasi fasilitas kesehatan Aceh (compiled from Drive sheet)",
    license: "Internal operational dataset — attribution to data providers",
    date: "2026-08-23 (255 fasilitas / 15 kab-kota; 198 GPS + 57 approx)",
    format: "JSON → GeoJSON markers (facHealth)",
    usedFor:
      "Data Utama — Fasilitas kesehatan (255 points). GPS from lokasi when present; else kab centroid (approx=true).",
    href: "https://docs.google.com/spreadsheets/d/1aKKoxhsrSil2K9dq2ioIfzD5o44f8nFGBLJjJsFX3w8",
  },
  {
    id: "fasilitas-pendidikan",
    titleId: "Fasilitas pendidikan (sekolah terdampak)",
    titleEn: "Education facilities (affected schools)",
    source:
      "Google Sheet 1thAoB7jLBRuq9BWLFbuZ6u0mB6szRMF-SFCRtPwgVGM — tab Minggu 2 (Latitude/Longitude)",
    license: "Internal operational dataset — attribution to Dinas Pendidikan Aceh / data providers",
    date: "2026-08-23 (3072 sekolah; 2470 GPS + 602 approx)",
    format: "Google Sheet / XLSX → GeoJSON markers (facEducation)",
    usedFor:
      "Data Utama — Fasilitas pendidikan (3072 points). Real GPS when present; else kab centroid (approx=true).",
    href: "https://docs.google.com/spreadsheets/d/1thAoB7jLBRuq9BWLFbuZ6u0mB6szRMF-SFCRtPwgVGM",
  },
  {
    id: "kantor-polisi",
    titleId: "Kantor polisi terdampak",
    titleEn: "Affected police offices",
    source:
      "kantor_polisi_aceh.json / Google Sheet inventarisasi kantor polisi Aceh",
    license: "Internal operational dataset — attribution to data providers",
    date: "2026-08-23 (254 kantor / 23 kab-kota)",
    format: "JSON → GeoJSON markers (policeOffices)",
    usedFor:
      "Data Utama — Kantor polisi (254 points, all 23 kab/kota). Many source coordinates are integer degrees (truncated GPS). Flagged coord_quality=truncated_integer + approx=true; decimals are not invented. Re-run: node scripts/flag-truncated-coords.js",
    href: "https://docs.google.com/spreadsheets/d/1uH3blx6EobzAyUzVC1UC4PcnMlRecq2EZrGYV0RVuq0",
  },
  {
    id: "fasilitas-pemerintahan",
    titleId: "Fasilitas pemerintahan terdampak",
    titleEn: "Affected government facilities",
    source:
      "fasilitas_pemerintahan_aceh.json — inventarisasi fasilitas pemerintahan Aceh",
    license: "Internal operational dataset — attribution to data providers",
    date: "2026-08-23 (273 titik; 7 kab saja)",
    format: "JSON → GeoJSON markers (facGov)",
    usedFor:
      "Data Utama — Fasilitas pemerintahan. Coverage is incomplete: only Aceh Jaya, Aceh Tengah, Bener Meriah, Bireuen, Gayo Lues, Pidie, Pidie Jaya. Missing 16 kab/kota. Do not invent points to fill gaps — needs more source data. Integer lon/lat flagged truncated_integer (not shifted).",
  },
  {
    id: "fasilitas-keagamaan",
    titleId: "Fasilitas keagamaan terdampak",
    titleEn: "Affected religious facilities",
    source:
      "fasilitas_ibadah_aceh.json — inventarisasi tempat ibadah terdampak",
    license: "Internal operational dataset — attribution to data providers",
    date: "2026-08-23 (313 titik; 7 kab saja)",
    format: "JSON → GeoJSON markers (facReligious)",
    usedFor:
      "Data Utama — Fasilitas keagamaan. Coverage is incomplete: only Aceh Tengah, Aceh Tenggara, Bener Meriah, Bireuen, Gayo Lues, Pidie, Pidie Jaya. Missing 16 kab/kota. Do not invent points to fill gaps — needs more source data. Integer lon/lat flagged truncated_integer (not shifted).",
  },
  {
    id: "infra-jalan-jembatan",
    titleId: "Jembatan",
    titleEn: "Bridges",
    source:
      "marker_features / public/fixtures/markers.geojson (layer infraRoadBridge). Compact jembatan.json is not in the repo — do not invent points.",
    license: "Internal operational dataset — attribution to data providers",
    date: "2026-09-06 (catalog path corrected; no invented inventory)",
    format: "JSON → GeoJSON markers (infraRoadBridge)",
    usedFor:
      "Toolbar Infrastruktur — live layer infraRoadBridge. Empty until marker rows exist. Do not invent extra points.",
  },
  {
    id: "laporan-kejadian",
    titleId: "Laporan Kejadian (partisipasi)",
    titleEn: "Incident reports (participation)",
    source:
      "Homepage form → laporan_kejadian (Supabase). Public map reads approved + tampil_di_peta rows only.",
    license: "Public participation — identity withheld; attribute BPBA Pusdalops moderation",
    date: "Live (no fixture seed)",
    format: "Supabase rows → GeoJSON overlay (laporanKejadian)",
    usedFor:
      "Toolbar Partisipasi — live layer. Empty until a moderator sets status=approved and tampil_di_peta=true. Not stored in marker_features.",
  },
  {
    id: "laporan-penanganan",
    titleId: "Laporan Penanganan (partisipasi)",
    titleEn: "Response reports (participation)",
    source:
      "Homepage form → laporan_penanganan (Supabase). Public map reads approved + tampil_di_peta rows only.",
    license: "Public participation — identity withheld; attribute BPBA Pusdalops moderation",
    date: "Live (no fixture seed)",
    format: "Supabase rows → GeoJSON overlay (laporanPenanganan)",
    usedFor:
      "Toolbar Partisipasi — live layer. Empty until a moderator sets status=approved and tampil_di_peta=true. Not stored in marker_features.",
  },
  {
    id: "compiled-r3p",
    titleId:
      "PRRPKA / PRRKA — Rencana Induk Percepatan Rehabilitasi dan Rekonstruksi Pascabencana Kewenangan Aceh",
    titleEn:
      "PRRPKA / PRRKA — Aceh Authority Master Plan for Accelerated Post-Disaster Rehabilitation and Reconstruction",
    source:
      "Keputusan Gubernur Aceh Nomor 300.2/666/2026 tentang Rencana Induk Percepatan Rehabilitasi dan Rekonstruksi Pascabencana Kewenangan Aceh Tahun 2026–2028 (PRRPKA / PRRKA). Homepage fixtures: prrpka_aceh.json (23 kab/kota) + prrpka_ringkasan.json. Map choropleth r3pDistribution is retired (map_layers.enabled=false, meta.retired=true).",
    license:
      "Dokumen publik Pemerintah Aceh — attribute Kepgub Aceh No. 300.2/666/2026",
    date: "2026–2028 (Kepgub 2026; fixture 2026-08-24)",
    format:
      "JSON (prrpka_aceh.json + prrpka_ringkasan.json) + PDF Kepgub; r3pDistribution choropleth retired (enabled=false)",
    usedFor:
      "Homepage PRRPKA slideshow (JITUPASNA, kebutuhan RR, perumahan PRRP/R3P/BNBA, pendanaan PRRKA, kesenjangan tingkat, sektor). Fixture-driven API `/api/prrpka/summary` — no Supabase seed table. Map layer r3pDistribution is retired (enabled=false).",
    href: "/docs/Kepgub_Renduk_PRRPKA_26-28.pdf",
  },
  {
    id: "irbi-2025",
    titleId: "Indeks Risiko Bencana Indonesia (IRBI) 2025 — Aceh",
    titleEn: "Indonesia Disaster Risk Index (IRBI) 2025 — Aceh",
    source: "BNPB — Indeks Risiko Bencana Indonesia (IRBI) Tahun 2025, Volume 04 No. 04, Januari 2026",
    license: "Public official statistics — attribute BNPB IRBI 2025",
    date: "2025 (published Jan 2026; fixture 2026-08-23)",
    format: "JSON → kab GeoJSON choropleth + analysis API",
    usedFor:
      "Kabupaten IRBI choropleth (kelas risiko) and homepage Irbi 2025 analysis tab",
    href: undefined,
  },
  {
    id: "krb-aceh",
    titleId: "Kawasan Rawan Bencana (KRB) Aceh",
    titleEn: "Aceh disaster-prone areas (KRB)",
    source:
      "BNPB IRBI 2025 + InaRISK; BPBA Kajian Risiko Bencana Aceh 2016–2020 / 2021–2025; PVMBG peta KRB gunung api (Bur Ni Telong 2025, Seulawah Agam 2007, Peut Sague 2008); OpenData Aceh IRBI kab/kota 2024. Poligon resmi tetap di InaRISK/PVMBG — database ini adalah katalog administratif + kawasan bernama.",
    license:
      "Public official statistics and maps — attribute BNPB, BPBA, PVMBG/Badan Geologi, Pemerintah Aceh",
    date: "Compiled 2026-08-31 (IRBI 2025; KRB gunung api 2007–2025)",
    format: "Supabase krb_* tables + JSON fixture krb-aceh.json → GET /api/krb",
    usedFor:
      "Database KRB Aceh: 23 kab/kota × 11 jenis ancaman (kelas IRBI), kawasan bernama (gunung api, sesar, pesisir), dan katalog dokumen sumber",
    href: "https://inarisk.bnpb.go.id/webgis/",
  },
  {
    id: "analisis-anggaran-2026",
    titleId: "Analisis anggaran penanganan bencana APBA 2026",
    titleEn: "APBA 2026 disaster handling budget analysis",
    source: "PERGUB Penjabaran APBA Nomor 4 Tahun 2026 — agregasi kegiatan penanganan bencana",
    license: "Dokumen publik Pemerintah Aceh — attribute PERGUB / APBA",
    date: "2026 (fixture 2026-08-23)",
    format: "JSON (analisis-anggaran-2026.json)",
    usedFor:
      "Halaman Anggaran Bencana — KPI, breakdown per fase/SKPD/kategori, perbandingan YoY 2025–2026",
  },
  {
    id: "kegiatan-penanganan-2026",
    titleId: "Kegiatan penanganan bencana APBA 2026",
    titleEn: "APBA 2026 disaster handling activities",
    source: "PERGUB Penjabaran APBA Nomor 4 Tahun 2026 — 24 kegiatan / 91 item anggaran",
    license: "Dokumen publik Pemerintah Aceh — attribute PERGUB / APBA",
    date: "2026 (fixture 2026-08-23; total ~Rp 176.206.915.272)",
    format: "JSON (kegiatan-penanganan-2026.json)",
    usedFor:
      "Halaman Anggaran Bencana — tabel kegiatan filterable dengan uraian anggaran & program",
  },
  {
    id: "publikasi-btt",
    titleId: "Publikasi Tanggapi — Dataset BTT",
    titleEn: "Tanggapi publications — BTT dataset",
    source: "Tanggapi Aceh — https://tanggapi.acehprov.go.id (dataset BTT analytic)",
    license: "Public analytic publications — attribute Tanggapi Aceh / Pemerintah Aceh",
    date: "2026 (fixture 2026-08-23; 9 publikasi)",
    format: "JSON (publikasi-btt.json)",
    usedFor:
      "Halaman Publikasi — bagian Analisis: katalog artikel analitik BTT dengan pencarian & filter tag",
    href: "https://tanggapi.acehprov.go.id",
  },
  {
    id: "publikasi-kegiatan",
    titleId: "Publikasi Kegiatan BPBA",
    titleEn: "BPBA activity publications",
    source: "BPBA — https://bpba.acehprov.go.id",
    license: "Public BPBA news — attribute Badan Penanggulangan Bencana Aceh",
    date: "2025–2026 (compact fixture; full catalog 186 items when seeded)",
    format: "JSON (publikasi-kegiatan.json) + Supabase publikasi_kegiatan",
    usedFor:
      "Halaman Publikasi — slideshow 15 kegiatan terbaru (bukan daftar penuh)",
    href: "https://bpba.acehprov.go.id",
  },
  {
    id: "titik-pengungsian",
    titleId: "Titik pengungsian (removed from Data Utama)",
    titleEn: "Displacement / shelter points (removed from Core data)",
    source: "Aceh Tanggapi / Drive — Dataset_titik_pengungsian_25_Feb_2025.xlsx",
    license: "Internal operational dataset — attribution to data providers",
    date: "2025-02-25 (deprecated in UI 2026-08-23)",
    format: "XLSX → GeoJSON (tendPoints) — no longer in primary markers.geojson / toolbar",
    usedFor:
      "Formerly shelter points on the map; removed from Data Utama. Kept in type union for old URL ?layers= compatibility.",
  },
  {
    id: "posko-orang-hilang",
    titleId: "Posko & orang hilang (removed from Data Utama)",
    titleEn: "Posts & missing persons (removed from Core data)",
    source: "Legacy demo / operational stubs",
    license: "n/a",
    date: "Deprecated in UI 2026-08-23",
    format: "Removed from markers.geojson; keys remain in MarkerLayerKey for URL compat",
    usedFor: "Formerly in Data Utama toolbar; filtering still accepts old URL keys",
  },
  {
    id: "gadm-kab",
    titleId: "Batas kab/kota Aceh (GADM 4.1 admin2)",
    titleEn: "Aceh kab/kota boundaries (GADM 4.1 admin2)",
    source: "GADM 4.1 — gadm41_IDN_2 (NAME_1=Aceh)",
    license: "GADM license (non-commercial redistrib. restrictions may apply; see gadm.org)",
    date: "GADM 4.1",
    format: "GeoJSON (23 features)",
    usedFor: "Kabupaten polygons for R3P choropleth and boundary overlay",
    href: "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_IDN_2.json.zip",
  },
  {
    id: "village-borders",
    titleId: "Batas desa/gampong Aceh",
    titleEn: "Aceh village / gampong borders",
    source:
      "Geoportal Aceh Peta_Administrasi_Desa (ADMINISTRASI_AR_DESA) joined to data-bencana-aceh profil_desa on 10-digit kdepum / kode_desa_kelurahan",
    license:
      "Geoportal Aceh provincial administrative boundaries; profil attributes from data-bencana-aceh",
    date: "Geoportal layer 2026-08; profil snapshot 2026-08-23",
    format: "GeoJSON (6508 official desa polygons)",
    usedFor: "Village-level R3P choropleth geometry",
    href: "https://geoportal.acehprov.go.id/server/rest/services/Hosted/Peta_Administrasi_Desa/FeatureServer/0",
  },
  {
    id: "basemap-carto",
    titleId: "Peta dasar Carto Positron / Dark (raster OSM)",
    titleEn: "Carto Positron / Dark raster OSM basemap",
    source: "CARTO basemaps (light_all / dark_all) — OpenStreetMap data",
    license: "© CARTO © OpenStreetMap contributors",
    date: "Live raster XYZ",
    format: "Raster PNG XYZ",
    usedFor:
      "Light/dark operational basemaps when NEXT_PUBLIC_CARTO_API_KEY is set; unkeyed Carto tiles are watermarked and are not used",
    href: "https://carto.com/basemaps",
  },
  {
    id: "basemap-openfreemap",
    titleId: "Peta dasar OpenFreeMap (vektor OSM, opsional)",
    titleEn: "OpenFreeMap vector OSM basemap (optional)",
    source: "OpenFreeMap (tiles.openfreemap.org) — OpenMapTiles schema from OpenStreetMap",
    license: "OpenFreeMap terms; © OpenStreetMap contributors",
    date: "Live vector tiles",
    format: "MapLibre style JSON + vector PBF",
    usedFor:
      "Optional GPU vector style (`?vector=1`); falls back to keyed Carto or OSM raster if the CDN fails. Also the tile source for owned brand style presets (not the default basemap).",
    href: "https://openfreemap.org/",
  },
  {
    id: "basemap-brand-presets",
    titleId: "Preset peta dasar merek (Light / Dark / Abu-abu minimal)",
    titleEn: "Brand basemap presets (Light / Dark / Minimalist Grey)",
    source:
      "Owned MapLibre GL Style v8 (src/lib/basemap-presets.ts) over OpenFreeMap OpenMapTiles",
    license: "OpenFreeMap terms; © OpenStreetMap contributors; Aceh Tangguh Sistem Warna tokens",
    date: "Style JSON in-repo",
    format: "MapLibre style JSON + OpenFreeMap vector PBF",
    usedFor:
      "Pengaturan → Peta dasar extras (Sederhana merek / Gelap merek / Abu-abu minimal). Default remains Positron (keyed Carto or OSM). Raster fallback if the vector source fails.",
    href: "https://openfreemap.org/",
  },
  {
    id: "basemap-esri",
    titleId: "Citra satelit Esri World Imagery",
    titleEn: "Esri World Imagery satellite basemap",
    source: "Esri ArcGIS Online — World_Imagery",
    license: "Esri Terms of Use; attribution required",
    date: "Live tiles",
    format: "Raster XYZ",
    usedFor: "HD satellite basemap option on the map",
    href: "https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9",
  },
  {
    id: "basemap-sentinel",
    titleId: "Sentinel-2 Cloudless (Copernicus / EOX)",
    titleEn: "Sentinel-2 Cloudless (Copernicus / EOX)",
    source:
      "EOX Sentinel-2 cloudless 2024 WMTS + Element84 Earth Search STAC (sentinel-2-l2a) for Aceh freshness",
    license:
      "Contains modified Copernicus Sentinel data; EOX cloudless terms; STAC from AWS Earth Search",
    date: "Annual mosaic 2024; L2A scenes ~5-day revisit",
    format: "WMTS JPEG + STAC JSON",
    usedFor:
      "Sentinel-2 basemap option and archive heartbeat (not a daily true-color layer — Aceh is usually cloudy)",
    href: "https://s2maps.eu/",
  },
  {
    id: "weather-forecast",
    titleId: "Perkiraan cuaca 23 kab/kota",
    titleEn: "Weather forecast — 23 districts/cities",
    source:
      "Open-Meteo API (lat/lng) + BMKG Prakiraan Cuaca Terbuka (adm4 when mapped)",
    license:
      "Open-Meteo CC BY 4.0; BMKG open data — attribution required",
    date: "Live + snapshot fixture",
    format: "JSON API + weather-snapshot.json",
    usedFor:
      "Perkiraan Cuaca page, homepage weather strip, and Peringatan Dini cuaca card — 23 kabupaten/kota in Aceh. The early-warning card only surfaces notable live conditions (heavy rain, thunderstorm, strong wind) from this same payload. Not used for maritime waters (see bmkg-maritim).",
    href: "https://open-meteo.com/",
  },
  {
    id: "bmkg-maritim",
    titleId: "BMKG Maritim — cuaca perairan dan pelabuhan Aceh",
    titleEn: "BMKG Maritim — Aceh waters and port forecast",
    source:
      "BMKG marine2026-data: meta/area_province.json, meta/wilmetos.min.geojson, meta/pelabuhan.json, GET /perairan/{KODE}.json and /pelabuhan/{KODE}.json. Aceh codes P.A.01–P.A.08, M.01, M.03.",
    license:
      "Official BMKG maritime forecast — attribution required. Wave height and wind are copied from the live payload; values are never invented when the feed is stale or missing.",
    date: "Live (cache 1 hour, BMKG cycle ~00 UTC)",
    format: "JSON → GET /api/overlay/maritimeWaters and /api/overlay/maritime/pelabuhan/{kode}",
    usedFor:
      "Map Geospasial overlays maritimeWaters (choropleth wave_cat) and port popups. Does not replace kabupaten/kota /api/weather.",
    href: "https://maritim.bmkg.go.id/apidoc",
  },
  {
    id: "ruangkita-static-poi",
    titleId: "Ruang Kita — temuan POI statis (bukan runtime)",
    titleEn: "Ruang Kita — static POI discovery (not runtime)",
    source:
      "One-off ETL scripts/scrape-ruangkita-static.mjs reads GeoJSON/XHR URLs that ruangkita.net itself loads (pelabuhan BMKG meta, sensor InaTEWS). Production map never requests ruangkita.net.",
    license:
      "Discovery path only — do not copy Ruang Kita UI, Leaflet, CSS, or tiles. Forecast credit stays with BMKG.",
    date: "ETL snapshot 2026-09-03",
    format: "GeoJSON fixtures in public/fixtures/overlays/",
    usedFor:
      "Static overlay maritimePorts and seismicSensors after ACEH_BBOX filter. Join kode_bmkg for live BMKG port forecasts.",
    href: "https://ruangkita.net/",
  },
  {
    id: "inarisk-faults",
    titleId: "InaRISK — patahan Sumatera dan Megathrust (clip Aceh)",
    titleEn: "InaRISK — Sumatran fault and Megathrust (Aceh clip)",
    source:
      "BNPB InaRISK Faults MapServer layers 6 (Sumatera) and 0 (Megathrust), queried with Aceh envelope and stored as GeoJSON fixtures.",
    license: "Public InaRISK / BNPB geospatial services — attribute BNPB InaRISK.",
    date: "ETL snapshot 2026-09-03",
    format: "GeoJSON fixtures → MapLibre line/fill overlays",
    usedFor: "Geospasial overlays inariskSumateraFault and inariskMegathrust.",
    href: "https://inarisk.bnpb.go.id/",
  },
  {
    id: "inarisk-bahaya-raster",
    titleId: "InaRISK — poligon bahaya kelas sedang/tinggi (clip Aceh)",
    titleEn: "InaRISK — medium/high hazard polygons (Aceh clip)",
    source:
      "BNPB InaRISK ImageServer exportImage for the Aceh envelope, polygonized to sedang/tinggi class and clipped to ACEH_BBOX. Official volcano KRB I/II/III polygons are not stored.",
    license: "Public InaRISK / BNPB — attribute BNPB InaRISK.",
    date: "ETL snapshot via fetch:inarisk-bahaya",
    format: "GeoJSON fixtures → MapLibre fill overlays",
    usedFor:
      "Geospasial fill overlays inariskBahaya*. Tile proxy remains for old URLs but the map does not request it.",
    href: "https://inarisk.bnpb.go.id/",
  },
  {
    id: "inatews-sensors",
    titleId: "BMKG InaTEWS — sensor seismik Aceh",
    titleEn: "BMKG InaTEWS — Aceh seismic sensors",
    source:
      "BMKG InaTEWS sensor_seismic.json (URL discovered via Ruang Kita). Filtered to ACEH_BBOX.",
    license: "Official BMKG InaTEWS station list — attribute BMKG.",
    date: "ETL snapshot 2026-09-03",
    format: "GeoJSON fixture sensor-seismic-aceh.geojson",
    usedFor: "Geospasial overlay seismicSensors (static markers).",
    href: "https://inatews.bmkg.go.id/",
  },
  {
    id: "magma-gempa",
    titleId: "MAGMA Indonesia — gempa Aceh",
    titleEn: "MAGMA Indonesia — Aceh earthquakes",
    source:
      "MAGMA Indonesia (PVMBG / Badan Geologi ESDM) — public homepage feed at magma.esdm.go.id (markersGempa), then magma.vsi.esdm.go.id if the primary host fails. Tagline: Bridging The Will of Nature to Society.",
    license:
      "Public official geohazard information — attribute MAGMA Indonesia / PVMBG ESDM. Numbers are copied from the live feed; events are never invented.",
    date: "Live official homepage; fail-closed empty card if blocked (revalidate ~10 min)",
    format: "Homepage public JSON list → GET /api/peringatan-dini/magma",
    usedFor:
      "Homepage Peringatan Dini card 2 and map overlay magmaQuakes / magmaVolcanoes — latest Aceh-relevant gempa (bbox or wilayah text). Volcano markers only if the homepage vars exist; otherwise the overlay is empty. If live MAGMA is unreachable, the card is empty and marked delayed.",
    href: "https://magma.esdm.go.id/",
  },
  {
    id: "sipongi-hotspot",
    titleId: "Sipongi KLHK — hotspot Aceh (kuning/merah)",
    titleEn: "Sipongi KLHK — Aceh hotspots (yellow/red)",
    source:
      "SiPongi+ Kemenhut / KLHK public map GeoJSON (opsroom indoHotspot) used by https://sipongi.gakkum.kehutanan.go.id/peta. Filtered to provinsi Aceh and confidence medium/high only.",
    license:
      "Public Sipongi attribution required (SIPONGI KEMENHUT). Hotspots are never invented; live fetch falls back to the last snapshot.",
    date: "Live + fixture fallback (revalidate ~10 min)",
    format: "GeoJSON via GET /api/opsroom/indoHotspot → GET /api/peringatan-dini/sipongi",
    usedFor:
      "Homepage Peringatan Dini card 3 and map overlay sipongiHotspots — latest 1–3 Aceh medium/high hotspots. Card links to the official Sipongi map.",
    href: "https://sipongi.gakkum.kehutanan.go.id/peta",
  },
  {
    id: "tatonas-monitoring",
    titleId: "Tatonas — pos hidrologi Aceh",
    titleEn: "Tatonas — Aceh hydrology stations",
    source:
      "Tatonas Web Monitoring public dashboard (tatonas.co.id/monitoring). Live JSON via the same dt_data XHR the dashboard uses (HMAC from the public page + /api/server-time). Filtered to Aceh bbox (95–98.3E / 2–6.15N); camera loggers omitted. Typical Aceh project: BWS Aceh.",
    license:
      "Vendor cloud dashboard — attribute Tatonas. Schema may change without notice. Not an official government API.",
    date: "Live + stale fixture fallback (revalidate ~10 min; readings older than 15 min marked delayed)",
    format:
      "JSON GET /api/dt_data → GET /api/peringatan-dini/tatonas and map overlay tatonasStations",
    usedFor:
      "Homepage Peringatan Dini card 4 and Geospasial overlay tatonasStations (not the Lokasi marker toolbar). Alarm tone is fail-closed: stale snapshots never display as “Aman”. Coordinates are never invented. Does not create kejadian_operasi.",
    href: "https://tatonas.co.id/monitoring/",
  },
  {
    id: "unsplash-media",
    titleId: "Media visual (Unsplash / stock)",
    titleEn: "Visual media (Unsplash / stock)",
    source: "Unsplash photos + Coverr/Pexels-style free stock video",
    license: "Unsplash License; Coverr/Pexels free stock terms",
    date: "Bundled with app media assets",
    format: "JPEG / MP4",
    usedFor: "Homepage hero, teaser, and transparency section imagery",
    href: "https://unsplash.com/license",
  },
];

/**
 * Footer “Sumber data” column — Data + Designer lock.
 * Five DB-backed catalog rows first. DIBI / MAGMA / Sipongi / Geoportal
 * exist in DATA_SOURCES but are not listed here (optional extras only).
 * Do not invent sources or URLs; hashes match existing `/sumber-data#id`.
 */
export const FOOTER_SUMBER_IDS = [
  "irbi-2025",
  "compiled-r3p",
  "publikasi-kegiatan",
  "publikasi-btt",
  "analisis-anggaran-2026",
] as const;

export type FooterSumberId = (typeof FOOTER_SUMBER_IDS)[number];

export type FooterSumberLink = {
  id: FooterSumberId;
  labelId: string;
  labelEn: string;
  hash: string;
};

export const FOOTER_SUMBER: FooterSumberLink[] = [
  {
    id: "irbi-2025",
    labelId: "BNPB IRBI",
    labelEn: "BNPB IRBI",
    hash: "irbi-2025",
  },
  {
    id: "compiled-r3p",
    labelId: "Spreadsheet R3P",
    labelEn: "R3P spreadsheet",
    hash: "compiled-r3p",
  },
  {
    id: "publikasi-kegiatan",
    labelId: "BPBA",
    labelEn: "BPBA",
    hash: "publikasi-kegiatan",
  },
  {
    id: "publikasi-btt",
    labelId: "Tanggapi",
    labelEn: "Tanggapi",
    hash: "publikasi-btt",
  },
  {
    id: "analisis-anggaran-2026",
    labelId: "PERGUB APBA",
    labelEn: "PERGUB APBA",
    hash: "analisis-anggaran-2026",
  },
];
