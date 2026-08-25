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
      "jembatan_aceh.json — inventarisasi jembatan Aceh (OSM Overpass + BPJN/Bina Marga/Geoportal), compacted to public/fixtures/jembatan.json",
    license: "Internal operational dataset — attribution to data providers",
    date: "2026-08-24 (7547 titik; 23 kab/kota)",
    format: "JSON → GeoJSON markers (infraRoadBridge)",
    usedFor:
      "Toolbar Infrastruktur — live layer infraRoadBridge. Full 23-kab inventory. Do not invent extra points.",
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
      "pararawendy/border-desa-indonesia-geojson (province ACEH) with GADM 4.1 admin4 fill-ins",
    license:
      "See upstream repos (pararawendy border-desa; GADM for fill-ins)",
    date: "Assembled 2026-08-22",
    format: "GeoJSON (~7869 features)",
    usedFor: "Village-level R3P choropleth geometry",
    href: "https://github.com/pararawendy/border-desa-indonesia-geojson",
  },
  {
    id: "basemap-carto",
    titleId: "Peta dasar Carto Positron / Dark (raster OSM)",
    titleEn: "Carto Positron / Dark raster OSM basemap",
    source: "CARTO basemaps (light_all / dark_all) — OpenStreetMap data",
    license: "© CARTO © OpenStreetMap contributors",
    date: "Live raster XYZ",
    format: "Raster PNG XYZ",
    usedFor: "Default light, dark, and streets operational basemaps",
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
      "Optional GPU vector style (`?vector=1`); falls back to Carto raster if the CDN fails. Also the tile source for owned brand style presets (not the default basemap).",
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
      "Pengaturan → Peta dasar extras (Sederhana merek / Gelap merek / Abu-abu minimal). Carto remains the default; Carto raster is the automatic fallback if the vector source fails.",
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
      "Perkiraan Cuaca page, homepage weather strip, and Peringatan Dini cuaca card — 23 kabupaten/kota in Aceh. The early-warning card only surfaces notable live conditions (heavy rain, thunderstorm, strong wind) from this same payload.",
    href: "https://open-meteo.com/",
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
      "Homepage Peringatan Dini card 2 — latest Aceh-relevant gempa (bbox or wilayah text). If live MAGMA is unreachable or unreadable, the card is empty and marked delayed — a last-known fixture event is not shown as current. Card links to MAGMA home.",
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
      "Homepage Peringatan Dini card 3 — latest 1–3 Aceh medium/high hotspots. Card links to the official Sipongi map.",
    href: "https://sipongi.gakkum.kehutanan.go.id/peta",
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
