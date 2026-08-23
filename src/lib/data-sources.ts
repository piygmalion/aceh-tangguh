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
    id: "compiled-r3p",
    titleId: "Compiled R3P (kerusakan rumah RR+RS+RB)",
    titleEn: "Compiled R3P (housing damage RR+RS+RB)",
    source: "Aceh Tanggapi / Drive — Compiled_R3P_Data.xlsx",
    license: "Internal operational dataset — attribution to data providers",
    date: "2025–2026 (snapshot used 2026-08-22)",
    format: "XLSX → aggregated GeoJSON",
    usedFor:
      "Kabupaten and village choropleth values (rumah rusak ringan/sedang/berat totals)",
    href: undefined,
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
    id: "titik-pengungsian",
    titleId: "Titik pengungsian",
    titleEn: "Displacement / shelter points",
    source: "Aceh Tanggapi / Drive — Dataset_titik_pengungsian_25_Feb_2025.xlsx",
    license: "Internal operational dataset — attribution to data providers",
    date: "2025-02-25",
    format: "XLSX → GeoJSON (tendPoints / markers)",
    usedFor: "Shelter and posko-related point layers on the map",
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
    titleId: "Peta dasar Carto (Positron / Dark Matter)",
    titleEn: "Carto basemap tiles (Positron / Dark Matter)",
    source: "Carto basemaps CDN (basemaps.cartocdn.com)",
    license: "Carto basemap terms; © OpenStreetMap contributors",
    date: "Live tiles",
    format: "Raster XYZ PNG",
    usedFor: "Light and dark operational basemaps",
    href: "https://carto.com/basemaps/",
  },
  {
    id: "basemap-esri",
    titleId: "Citra satelit Esri World Imagery",
    titleEn: "Esri World Imagery satellite basemap",
    source: "Esri ArcGIS Online — World_Imagery",
    license: "Esri Terms of Use; attribution required",
    date: "Live tiles",
    format: "Raster XYZ",
    usedFor: "Satellite basemap option on the map",
    href: "https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9",
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
