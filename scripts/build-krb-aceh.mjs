/**
 * Build KRB Aceh fixture + SQL seed from local IRBI 2025 + kab registry.
 * Named kawasan / dokumen come from cited official sources in this file — do not invent polygons.
 *
 * Usage: node scripts/build-krb-aceh.mjs
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const irbi = JSON.parse(readFileSync(path.join(root, "public/fixtures/irbi-2025.json"), "utf8"));
const weather = JSON.parse(
  readFileSync(path.join(root, "public/fixtures/kab-weather-registry.json"), "utf8")
);

const HAZARDS = [
  {
    kode: "banjir",
    label_id: "Banjir",
    label_en: "Flood",
    kategori: "hidrometeorologi",
    sumber_otoritatif: "BNPB InaRISK / IRBI",
  },
  {
    kode: "gempabumi",
    label_id: "Gempabumi",
    label_en: "Earthquake",
    kategori: "geologi",
    sumber_otoritatif: "BNPB InaRISK / Badan Geologi",
  },
  {
    kode: "tsunami",
    label_id: "Tsunami",
    label_en: "Tsunami",
    kategori: "geologi",
    sumber_otoritatif: "BNPB InaRISK / BMKG",
  },
  {
    kode: "letusan_gunung_api",
    label_id: "Letusan gunung api",
    label_en: "Volcanic eruption",
    kategori: "geologi",
    sumber_otoritatif: "PVMBG / MAGMA Indonesia",
  },
  {
    kode: "banjir_bandang",
    label_id: "Banjir bandang",
    label_en: "Flash flood",
    kategori: "hidrometeorologi",
    sumber_otoritatif: "BNPB InaRISK / IRBI",
  },
  {
    kode: "gelombang_ekstrim_abrasi",
    label_id: "Gelombang ekstrem dan abrasi",
    label_en: "Extreme waves and abrasion",
    kategori: "hidrometeorologi",
    sumber_otoritatif: "BNPB InaRISK / BMKG",
  },
  {
    kode: "kebakaran_hutan_lahan",
    label_id: "Kebakaran hutan dan lahan",
    label_en: "Forest and land fire",
    kategori: "klimatologi",
    sumber_otoritatif: "BNPB InaRISK / Sipongi KLHK",
  },
  {
    kode: "tanah_longsor",
    label_id: "Tanah longsor",
    label_en: "Landslide",
    kategori: "geologi",
    sumber_otoritatif: "BNPB InaRISK / PVMBG",
  },
  {
    kode: "kekeringan",
    label_id: "Kekeringan",
    label_en: "Drought",
    kategori: "klimatologi",
    sumber_otoritatif: "BNPB InaRISK / BMKG",
  },
  {
    kode: "likuefaksi",
    label_id: "Likuefaksi",
    label_en: "Liquefaction",
    kategori: "geologi",
    sumber_otoritatif: "BNPB InaRISK / Badan Geologi",
  },
  {
    kode: "cuaca_ekstrem",
    label_id: "Cuaca ekstrem",
    label_en: "Extreme weather",
    kategori: "klimatologi",
    sumber_otoritatif: "BNPB InaRISK / BMKG",
  },
];

/** OpenData Aceh IRBI 2024 poin — matched by name, not swapped kemendagri codes. */
const IRBI_2024 = {
  "Aceh Selatan": 171.2,
  "Aceh Tenggara": 112.89,
  "Aceh Timur": 155.31,
  "Aceh Tengah": 116.18,
  "Aceh Barat": 173.76,
  "Aceh Besar": 195.61,
  Pidie: 151.0,
  "Aceh Utara": 166.2,
  Simeulue: 162.0,
  "Aceh Singkil": 178.0,
  Bireuen: 155.99,
  "Aceh Barat Daya": 183.2,
  "Gayo Lues": 98.4,
  "Aceh Jaya": 175.54,
  "Nagan Raya": 192.31,
  "Aceh Tamiang": 125.06,
  "Bener Meriah": 108.97,
  "Pidie Jaya": 137.6,
  "Banda Aceh": 105.8,
  Sabang: 113.73,
  Lhokseumawe: 136.99,
  Langsa: 115.04,
  Subulussalam: 87.87,
};

function normName(raw) {
  return String(raw || "")
    .toUpperCase()
    .replace(/KOTA\s+ADMINISTRATIF/g, "")
    .replace(/\b(KABUPATEN|KAB\.?|KOTA)\b/g, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

const weatherByNorm = new Map();
for (const row of weather.kabupaten_kota) {
  weatherByNorm.set(normName(row.kabupaten_kota), row);
  weatherByNorm.set(normName(row.kabupaten_kota_kode), row);
}

function sqlStr(value) {
  if (value == null) return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNum(value) {
  if (value == null || Number.isNaN(Number(value))) return "null";
  return String(value);
}

function sqlArr(values) {
  return `ARRAY[${values.map(sqlStr).join(",")}]::text[]`;
}

const kabupaten = [];
const wilayah = [];

for (const kab of irbi.kabupaten_kota) {
  const joined = weatherByNorm.get(normName(kab.kabupaten_kota))
    || weatherByNorm.get(normName(kab.kabupaten_kota_kode));
  if (!joined) {
    throw new Error(`No weather-registry join for ${kab.kabupaten_kota}`);
  }
  const displayName = joined.kabupaten_kota;
  const irbi2024 = IRBI_2024[displayName];
  if (irbi2024 == null) {
    throw new Error(`No IRBI 2024 poin for ${displayName}`);
  }

  const ancamanTinggi = HAZARDS
    .filter((h) => kab[`kelas_${h.kode}`] === "TINGGI")
    .map((h) => h.kode);

  kabupaten.push({
    kode_kabupaten: joined.adm2,
    kabupaten: displayName,
    is_kota: joined.is_kota,
    irb_2025: kab.irb_2025,
    kelas_risiko_2025: kab.kelas_risiko,
    irb_2024: irbi2024,
    ancaman_tertinggi: kab.ancaman_tertinggi,
    skor_ancaman_tertinggi: kab.skor_ancaman_tertinggi,
    kelas_ancaman_tertinggi: kab.kelas_ancaman_tertinggi,
    jumlah_ancaman_tinggi: ancamanTinggi.length,
    ancaman_tinggi: ancamanTinggi,
    latitude: kab.latitude ?? joined.latitude,
    longitude: kab.longitude ?? joined.longitude,
    sumber: "BNPB IRBI 2025 + OpenData Aceh IRBI 2024",
  });

  for (const h of HAZARDS) {
    const kelas = kab[`kelas_${h.kode}`];
    const skor = kab[`ir_${h.kode}`];
    if (!kelas) {
      throw new Error(`Missing kelas_${h.kode} for ${displayName}`);
    }
    wilayah.push({
      id: `${joined.adm2}-${h.kode}`,
      kode_kabupaten: joined.adm2,
      kabupaten: displayName,
      jenis_bahaya: h.kode,
      kelas_ancaman: kelas,
      skor_irbi: skor,
      tahun_acuan: 2025,
      sumber: "BNPB IRBI 2025",
      sumber_url: "https://inarisk.bnpb.go.id/irbi",
      latitude: kab.latitude ?? joined.latitude,
      longitude: kab.longitude ?? joined.longitude,
    });
  }
}

kabupaten.sort((a, b) => a.kode_kabupaten.localeCompare(b.kode_kabupaten));
wilayah.sort((a, b) => a.id.localeCompare(b.id));

const kawasan = [
  {
    id: "gunungapi-bur-ni-telong",
    nama: "KRB Gunungapi Bur Ni Telong",
    jenis_bahaya: "letusan_gunung_api",
    zona: "KRB_I_II_III",
    kabupaten: ["Bener Meriah"],
    kode_kabupaten: ["11.17"],
    deskripsi:
      "Peta Kawasan Rawan Bencana Gunungapi Bur Ni Telong (PVMBG, dirilis 31 Desember 2025) membagi lereng menjadi KRB III (puncak/lereng terdekat), KRB II (lembah sungai), dan KRB I (zona terluar).",
    potensi_bahaya:
      "KRB III: awan panas, lontaran batu pijar, guguran lava, gas beracun. KRB II: awan panas, aliran lava, lahar, guguran batu, hujan abu lebat. KRB I: hujan abu vulkanik dan lahar dingin.",
    latitude: 4.769,
    longitude: 96.821,
    tahun_acuan: 2025,
    sumber: "PVMBG / InfoPublik Komdigi (MC Bener Meriah)",
    sumber_url:
      "https://infopublik.id/kategori/nusantara/953658/pvmbg-rilis-peta-kawasan-rawan-bencana-gunungapi-bur-ni-telong-di-bener-meriah",
    grain: "kawasan_bernama",
    catatan: "Polygon KRB I/II/III tidak disalin ke database — acuan peta resmi PVMBG.",
  },
  {
    id: "gunungapi-seulawah-agam",
    nama: "KRB Gunungapi Seulawah Agam",
    jenis_bahaya: "letusan_gunung_api",
    zona: "KRB_I_II_III",
    kabupaten: ["Aceh Besar"],
    kode_kabupaten: ["11.06"],
    deskripsi:
      "PVMBG menyusun Peta KRB letusan Seulawah Agam (2007) dalam tiga kategori kawasan. Pos Pengamatan Gunung Api berada di Lambaro Tunong sejak 1997.",
    potensi_bahaya:
      "Aliran lava, lahar, awan panas, hujan debu, dan lontaran batu pijar sesuai zonasi KRB PVMBG.",
    latitude: 5.448,
    longitude: 95.658,
    tahun_acuan: 2007,
    sumber: "PVMBG peta KRB 2007 (dirujuk Ibnu Rusydy / Melek Bencana)",
    sumber_url: "https://www.ibnurusydy.com/mengenal-status-dan-kawasan-rawan-bencana-seulawah-agam/",
    grain: "kawasan_bernama",
    catatan: "Koordinat puncak ~5.448 N / 95.658 E, 1810 mdpl — bukan batas poligon KRB.",
  },
  {
    id: "gunungapi-peut-sague",
    nama: "KRB Gunungapi Peut Sague (Peut Sangoe)",
    jenis_bahaya: "letusan_gunung_api",
    zona: "KRB_I_II_III",
    kabupaten: ["Pidie", "Aceh Tengah"],
    kode_kabupaten: ["11.07", "11.04"],
    deskripsi:
      "Peta Kawasan Rawan Bencana Gunungapi Peut Sague, Sumatera, Provinsi Nanggroe Aceh Darussalam Tahun 2008, skala 1:50.000 (PVMBG).",
    potensi_bahaya:
      "Zona KRB gunung api sesuai peta PVMBG 2008 (awan panas, lava, lahar, abu).",
    latitude: 4.914,
    longitude: 96.329,
    tahun_acuan: 2008,
    sumber: "PVMBG / Perpustakaan Badan Geologi",
    sumber_url: "https://geologi.esdm.go.id/perpustakaan/?p=cite&id=28725&keywords=",
    grain: "kawasan_bernama",
    catatan: "Polygon 1:50.000 tidak diimpor; entri ini adalah katalog peta resmi.",
  },
  {
    id: "sesar-besar-sumatera",
    nama: "Sesar Besar Sumatera (Great Sumatran Fault)",
    jenis_bahaya: "gempabumi",
    zona: "sesar_aktif",
    kabupaten: kabupaten.map((k) => k.kabupaten),
    kode_kabupaten: kabupaten.map((k) => k.kode_kabupaten),
    deskripsi:
      "IRBI 2025 mencatat Aceh berada di zona tektonik aktif pertemuan lempeng Indo-Australia dan Eurasia, dibelah Sesar Besar Sumatera, sehingga rawan gempa.",
    potensi_bahaya: "Gempabumi tektonik darat di sepanjang sesar; likuefaksi di dataran aluvial.",
    latitude: 4.5,
    longitude: 96.5,
    tahun_acuan: 2025,
    sumber: "BNPB IRBI 2025 (Buku IRBI halaman Aceh)",
    sumber_url: "https://inarisk.bnpb.go.id/IRBI-2025/files/basic-html/page58.html",
    grain: "koridor_geologi",
    catatan: "Bukan peta sesar resolusi tinggi — grain provinsi.",
  },
  {
    id: "zona-subduksi-aceh",
    nama: "Zona subduksi Indo-Australia–Eurasia (pesisir barat Aceh)",
    jenis_bahaya: "tsunami",
    zona: "megathrust",
    kabupaten: [
      "Simeulue",
      "Aceh Singkil",
      "Aceh Selatan",
      "Aceh Barat Daya",
      "Aceh Barat",
      "Nagan Raya",
      "Aceh Jaya",
      "Aceh Besar",
      "Banda Aceh",
      "Sabang",
      "Subulussalam",
    ],
    kode_kabupaten: [
      "11.09",
      "11.10",
      "11.01",
      "11.12",
      "11.05",
      "11.15",
      "11.14",
      "11.06",
      "11.71",
      "11.72",
      "11.75",
    ],
    deskripsi:
      "IRBI 2025: Aceh di pertemuan lempeng Indo-Australia dan Eurasia. Pesisir barat-selatan menghadap Samudra Hindia — kawasan tsunami 26 Desember 2004.",
    potensi_bahaya: "Gempabumi megathrust dan tsunami pesisir.",
    latitude: 4.0,
    longitude: 95.6,
    tahun_acuan: 2025,
    sumber: "BNPB IRBI 2025",
    sumber_url: "https://inarisk.bnpb.go.id/IRBI-2025/files/basic-html/page58.html",
    grain: "koridor_geologi",
    catatan: "Daftar kab/kota pesisir barat berdasarkan geografi pantai, bukan peta inundasi desa.",
  },
  {
    id: "pesisir-utara-timur-tsunami",
    nama: "Pesisir utara–timur Aceh (Selat Malaka)",
    jenis_bahaya: "tsunami",
    zona: "pesisir",
    kabupaten: [
      "Pidie",
      "Pidie Jaya",
      "Bireuen",
      "Lhokseumawe",
      "Aceh Utara",
      "Aceh Timur",
      "Langsa",
      "Aceh Tamiang",
    ],
    kode_kabupaten: ["11.07", "11.18", "11.11", "11.73", "11.08", "11.03", "11.74", "11.16"],
    deskripsi:
      "Dataran pantai utara–timur yang landai (IRBI 2025). Kelas ancaman tsunami per kab/kota mengikuti IRBI, bukan peta run-up desa.",
    potensi_bahaya: "Tsunami dan gelombang ekstrem/abrasi di pesisir Selat Malaka.",
    latitude: 5.1,
    longitude: 97.2,
    tahun_acuan: 2025,
    sumber: "BNPB IRBI 2025",
    sumber_url: "https://inarisk.bnpb.go.id/IRBI-2025/files/basic-html/page58.html",
    grain: "koridor_pesisir",
    catatan: "Kelas per kab ada di krb_wilayah jenis tsunami.",
  },
  {
    id: "pegunungan-gayo-bukit-barisan",
    nama: "Pegunungan Gayo / Bukit Barisan (kerawanan banjir relatif rendah)",
    jenis_bahaya: "banjir",
    zona: "dataran_tinggi",
    kabupaten: ["Aceh Tengah", "Bener Meriah", "Gayo Lues"],
    kode_kabupaten: ["11.04", "11.17", "11.13"],
    deskripsi:
      "Analisis SMCE independen (MAPID, April 2026) menilai hanya Aceh Tengah, Bener Meriah, dan Gayo Lues yang indeks kerawanan banjirnya sangat aman hingga aman. Bukan peta KRB resmi BNPB.",
    potensi_bahaya: "Banjir relatif lebih rendah; longsor dan letusan (Bur Ni Telong) tetap relevan.",
    latitude: 4.4,
    longitude: 97.0,
    tahun_acuan: 2026,
    sumber: "MAPID — Analisis Kerawanan Banjir Provinsi Aceh (SMCE/AHP, bukan KRB resmi)",
    sumber_url:
      "https://mapid.co.id/blog/analisis-kerawanan-banjir-dan-alokasi-pusat-siaga-bencana-di-provinsi-aceh",
    grain: "analisis_independen",
    catatan: "Lapisan pelengkap. Kelas banjir resmi per kab tetap dari IRBI 2025 di krb_wilayah.",
  },
];

const dokumen = [
  {
    id: "irbi-2025-aceh",
    judul: "Indeks Risiko Bencana Indonesia (IRBI) Tahun 2025 — Provinsi Aceh",
    jenis: "indeks_risiko",
    wilayah: "provinsi",
    kabupaten: null,
    tahun_mulai: 2025,
    tahun_akhir: 2025,
    penerbit: "BNPB",
    status: "aktif",
    url: "https://inarisk.bnpb.go.id/irbi",
    catatan: "Kelas risiko provinsi TINGGI, nilai 192,75. 18 kabupaten + 5 kota.",
  },
  {
    id: "kajian-risiko-aceh-2021-2025",
    judul: "Dokumen Kajian Risiko Bencana Aceh Tahun 2021–2025",
    jenis: "kajian_risiko",
    wilayah: "provinsi",
    kabupaten: null,
    tahun_mulai: 2021,
    tahun_akhir: 2025,
    penerbit: "BPBA",
    status: "periode_berakhir",
    url: "https://bpba.acehprov.go.id/halaman/kajian-dan-naskah-akademik",
    catatan: "KRB di sini = Kajian Risiko Bencana (dokumen perencanaan), bukan poligon zonasi.",
  },
  {
    id: "kajian-risiko-aceh-2016-2020",
    judul: "Dokumen Kajian Risiko Bencana Aceh Tahun 2016–2020",
    jenis: "kajian_risiko",
    wilayah: "provinsi",
    kabupaten: null,
    tahun_mulai: 2016,
    tahun_akhir: 2020,
    penerbit: "BPBA",
    status: "kedaluwarsa",
    url: "https://bpba.acehprov.go.id/halaman/kajian-dan-naskah-akademik",
    catatan: "Dokumen pendahulu KRB Aceh 2021–2025.",
  },
  {
    id: "peta-wilayah-risiko-bencana-aceh",
    judul: "Peta Wilayah Risiko Bencana di Provinsi Aceh (2014–2023)",
    jenis: "peta_risiko",
    wilayah: "provinsi",
    kabupaten: null,
    tahun_mulai: 2014,
    tahun_akhir: 2023,
    penerbit: "BNPB — Portal Satu Data Bencana Indonesia",
    status: "arsip",
    url: "https://data.bnpb.go.id/dataset/peta-wilayah-resiko-bencana/resource/0eecf8d3-490a-4841-9e0b-8bd3cd0ee0d8",
    catatan: "Metadata diperbarui 22 September 2025; lisensi CC-BY.",
  },
  {
    id: "opendata-aceh-irbi-2024",
    judul: "Indeks Risiko Bencana Menurut Kabupaten/Kota — Aceh 2024",
    jenis: "indeks_risiko",
    wilayah: "provinsi",
    kabupaten: null,
    tahun_mulai: 2024,
    tahun_akhir: 2024,
    penerbit: "Pemerintah Aceh (OpenData)",
    status: "aktif",
    url: "https://data.acehprov.go.id/id/dataset/indeks-risiko-bencana/resource/4012aa22-eda2-46c0-aaf4-1ed124e6e85a",
    catatan: "Nilai poin IRBI 2024 per kab/kota; join ke kode_kabupaten lewat nama, bukan kode CSV yang tertukar.",
  },
  {
    id: "inarisk-webgis",
    judul: "InaRISK WebGIS — Peta Bahaya dan Status KRB",
    jenis: "portal_geospasial",
    wilayah: "nasional",
    kabupaten: null,
    tahun_mulai: null,
    tahun_akhir: null,
    penerbit: "BNPB",
    status: "aktif",
    url: "https://inarisk.bnpb.go.id/webgis/",
    catatan: "12 jenis peta bahaya. Status KRB kab/kota di portal ini merujuk dokumen kajian, bukan zona KRB I/II/III gunung api.",
  },
  {
    id: "inarisk-dashboard-aceh",
    judul: "WebGIS Aceh — inaRISK",
    jenis: "portal_geospasial",
    wilayah: "provinsi",
    kabupaten: null,
    tahun_mulai: null,
    tahun_akhir: null,
    penerbit: "BNPB / Pemerintah Aceh",
    status: "aktif",
    url: "https://inarisk.bnpb.go.id/dashboard_Aceh/",
    catatan: "Dashboard potensi bencana Aceh di ekosistem InaRISK.",
  },
  {
    id: "peta-krb-bur-ni-telong-2025",
    judul: "Peta Kawasan Rawan Bencana Gunungapi Bur Ni Telong",
    jenis: "peta_krb_gunungapi",
    wilayah: "kabupaten",
    kabupaten: "Bener Meriah",
    tahun_mulai: 2025,
    tahun_akhir: null,
    penerbit: "PVMBG (Badan Geologi ESDM)",
    status: "aktif",
    url: "https://infopublik.id/kategori/nusantara/953658/pvmbg-rilis-peta-kawasan-rawan-bencana-gunungapi-bur-ni-telong-di-bener-meriah",
    catatan: "Dirilis 31 Desember 2025. KRB I / II / III.",
  },
  {
    id: "peta-krb-seulawah-agam-2007",
    judul: "Peta Kawasan Rawan Bencana Gunungapi Seulawah Agam",
    jenis: "peta_krb_gunungapi",
    wilayah: "kabupaten",
    kabupaten: "Aceh Besar",
    tahun_mulai: 2007,
    tahun_akhir: null,
    penerbit: "PVMBG (Badan Geologi ESDM)",
    status: "aktif",
    url: "https://www.ibnurusydy.com/mengenal-status-dan-kawasan-rawan-bencana-seulawah-agam/",
    catatan: "Peta KRB 2007; Seulawah Agam, Peut Sangoe, dan Burni Telong dipetakan bersama.",
  },
  {
    id: "peta-krb-peut-sague-2008",
    judul: "Peta Kawasan Rawan Bencana Gunungapi Peut Sague Tahun 2008 (1:50.000)",
    jenis: "peta_krb_gunungapi",
    wilayah: "kabupaten",
    kabupaten: "Pidie",
    tahun_mulai: 2008,
    tahun_akhir: null,
    penerbit: "PVMBG (Badan Geologi ESDM)",
    status: "aktif",
    url: "https://geologi.esdm.go.id/perpustakaan/?p=cite&id=28725&keywords=",
    catatan: "Katalog perpustakaan Badan Geologi.",
  },
  {
    id: "geoportal-bnpb",
    judul: "Geoportal Data Bencana Indonesia",
    jenis: "portal_geospasial",
    wilayah: "nasional",
    kabupaten: null,
    tahun_mulai: null,
    tahun_akhir: null,
    penerbit: "BNPB",
    status: "aktif",
    url: "https://gis.bnpb.go.id/",
    catatan: "Portal peta operasional BNPB (krisis, dashboard, unduhan).",
  },
];

const metadata = {
  judul: "Database Kawasan Rawan Bencana (KRB) Aceh",
  provinsi: "Aceh",
  kode_provinsi: "11",
  terakhir_diperbarui: "2026-08-31",
  grain: {
    wilayah: "kabupaten_kota × jenis_bahaya (IRBI 2025)",
    kawasan: "fitur bernama (gunung api, sesar, koridor pesisir) tanpa poligon",
    dokumen: "katalog sumber resmi",
  },
  catatan_istilah: [
    "Kawasan Rawan Bencana (zona spasial): KRB I/II/III gunung api PVMBG dan peta bahaya InaRISK.",
    "Kajian Risiko Bencana (dokumen perencanaan): KRB BPBA 2016–2020 dan 2021–2025.",
    "Kelas ancaman krb_wilayah = kelas IRBI 2025 (RENDAH/SEDANG/TINGGI), bukan nomor zona KRB gunung api.",
    "Geometri poligon tidak disimpan di Postgres (konvensi Aceh Tangguh: fixtures/PMTiles).",
  ],
  irbi_2025: {
    nilai_irb_provinsi: irbi.metadata.nilai_irb_provinsi,
    kelas_risiko_provinsi: irbi.metadata.kelas_risiko_provinsi,
    luas_wilayah_km2: irbi.metadata.luas_wilayah_km2,
    jumlah_penduduk_2025: irbi.metadata.jumlah_penduduk_2025,
    total_kabupaten_kota: irbi.metadata.total_kabupaten_kota,
    ancaman_dibi_terbanyak: ["kebakaran_hutan_lahan", "banjir", "cuaca_ekstrem"],
  },
  jumlah: {
    jenis_bahaya: HAZARDS.length,
    kabupaten_kota: kabupaten.length,
    wilayah: wilayah.length,
    kawasan: kawasan.length,
    dokumen: dokumen.length,
  },
  sumber: [
    {
      id: "irbi-2025",
      judul: "BNPB IRBI 2025 — Aceh",
      url: "https://inarisk.bnpb.go.id/irbi",
    },
    {
      id: "irbi-2025-halaman-aceh",
      judul: "Buku IRBI 2025 halaman 58 (profil Aceh)",
      url: "https://inarisk.bnpb.go.id/IRBI-2025/files/basic-html/page58.html",
    },
    {
      id: "opendata-aceh-irbi-2024",
      judul: "OpenData Aceh — IRBI kab/kota 2024",
      url: "https://data.acehprov.go.id/id/dataset/indeks-risiko-bencana/resource/4012aa22-eda2-46c0-aaf4-1ed124e6e85a",
    },
    {
      id: "bpba-kajian",
      judul: "BPBA — Kajian dan Naskah Akademik",
      url: "https://bpba.acehprov.go.id/halaman/kajian-dan-naskah-akademik",
    },
    {
      id: "inarisk",
      judul: "InaRISK BNPB",
      url: "https://inarisk.bnpb.go.id/",
    },
    {
      id: "pvmbg-bur-ni-telong",
      judul: "PVMBG Peta KRB Bur Ni Telong",
      url: "https://infopublik.id/kategori/nusantara/953658/pvmbg-rilis-peta-kawasan-rawan-bencana-gunungapi-bur-ni-telong-di-bener-meriah",
    },
  ],
};

const fixture = {
  metadata,
  jenis_bahaya: HAZARDS,
  kabupaten,
  wilayah,
  kawasan,
  dokumen,
};

const fixturePath = path.join(root, "public/fixtures/krb-aceh.json");
writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);

const jenisSql = HAZARDS.map(
  (h) =>
    `  (${sqlStr(h.kode)}, ${sqlStr(h.label_id)}, ${sqlStr(h.label_en)}, ${sqlStr(h.kategori)}, ${sqlStr(h.sumber_otoritatif)})`
).join(",\n");

const kabSql = kabupaten
  .map(
    (k) =>
      `  (${sqlStr(k.kode_kabupaten)}, ${sqlStr(k.kabupaten)}, ${k.is_kota}, ${sqlNum(k.irb_2025)}, ${sqlStr(k.kelas_risiko_2025)}, ${sqlNum(k.irb_2024)}, ${sqlStr(k.ancaman_tertinggi)}, ${sqlNum(k.skor_ancaman_tertinggi)}, ${sqlStr(k.kelas_ancaman_tertinggi)}, ${sqlNum(k.jumlah_ancaman_tinggi)}, ${sqlArr(k.ancaman_tinggi)}, ${sqlNum(k.latitude)}, ${sqlNum(k.longitude)}, ${sqlStr(k.sumber)})`
  )
  .join(",\n");

const wilayahSql = wilayah
  .map(
    (w) =>
      `  (${sqlStr(w.id)}, ${sqlStr(w.kode_kabupaten)}, ${sqlStr(w.kabupaten)}, ${sqlStr(w.jenis_bahaya)}, ${sqlStr(w.kelas_ancaman)}, ${sqlNum(w.skor_irbi)}, ${sqlNum(w.tahun_acuan)}, ${sqlStr(w.sumber)}, ${sqlStr(w.sumber_url)}, ${sqlNum(w.latitude)}, ${sqlNum(w.longitude)})`
  )
  .join(",\n");

const kawasanSql = kawasan
  .map(
    (k) =>
      `  (${sqlStr(k.id)}, ${sqlStr(k.nama)}, ${sqlStr(k.jenis_bahaya)}, ${sqlStr(k.zona)}, ${sqlArr(k.kabupaten)}, ${sqlArr(k.kode_kabupaten)}, ${sqlStr(k.deskripsi)}, ${sqlStr(k.potensi_bahaya)}, ${sqlNum(k.latitude)}, ${sqlNum(k.longitude)}, ${sqlNum(k.tahun_acuan)}, ${sqlStr(k.sumber)}, ${sqlStr(k.sumber_url)}, ${sqlStr(k.grain)}, ${sqlStr(k.catatan)})`
  )
  .join(",\n");

const dokumenSql = dokumen
  .map(
    (d) =>
      `  (${sqlStr(d.id)}, ${sqlStr(d.judul)}, ${sqlStr(d.jenis)}, ${sqlStr(d.wilayah)}, ${sqlStr(d.kabupaten)}, ${sqlNum(d.tahun_mulai)}, ${sqlNum(d.tahun_akhir)}, ${sqlStr(d.penerbit)}, ${sqlStr(d.status)}, ${sqlStr(d.url)}, ${sqlStr(d.catatan)})`
  )
  .join(",\n");

const seedSql = `-- Seed generated by scripts/build-krb-aceh.mjs — do not hand-edit row lists.

insert into public.krb_jenis_bahaya (kode, label_id, label_en, kategori, sumber_otoritatif) values
${jenisSql}
on conflict (kode) do update set
  label_id = excluded.label_id,
  label_en = excluded.label_en,
  kategori = excluded.kategori,
  sumber_otoritatif = excluded.sumber_otoritatif,
  updated_at = now();

insert into public.krb_kabupaten (
  kode_kabupaten, kabupaten, is_kota, irb_2025, kelas_risiko_2025, irb_2024,
  ancaman_tertinggi, skor_ancaman_tertinggi, kelas_ancaman_tertinggi,
  jumlah_ancaman_tinggi, ancaman_tinggi, latitude, longitude, sumber
) values
${kabSql}
on conflict (kode_kabupaten) do update set
  kabupaten = excluded.kabupaten,
  is_kota = excluded.is_kota,
  irb_2025 = excluded.irb_2025,
  kelas_risiko_2025 = excluded.kelas_risiko_2025,
  irb_2024 = excluded.irb_2024,
  ancaman_tertinggi = excluded.ancaman_tertinggi,
  skor_ancaman_tertinggi = excluded.skor_ancaman_tertinggi,
  kelas_ancaman_tertinggi = excluded.kelas_ancaman_tertinggi,
  jumlah_ancaman_tinggi = excluded.jumlah_ancaman_tinggi,
  ancaman_tinggi = excluded.ancaman_tinggi,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  sumber = excluded.sumber,
  updated_at = now();

insert into public.krb_wilayah (
  id, kode_kabupaten, kabupaten, jenis_bahaya, kelas_ancaman, skor_irbi,
  tahun_acuan, sumber, sumber_url, latitude, longitude
) values
${wilayahSql}
on conflict (id) do update set
  kode_kabupaten = excluded.kode_kabupaten,
  kabupaten = excluded.kabupaten,
  jenis_bahaya = excluded.jenis_bahaya,
  kelas_ancaman = excluded.kelas_ancaman,
  skor_irbi = excluded.skor_irbi,
  tahun_acuan = excluded.tahun_acuan,
  sumber = excluded.sumber,
  sumber_url = excluded.sumber_url,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  updated_at = now();

insert into public.krb_kawasan (
  id, nama, jenis_bahaya, zona, kabupaten, kode_kabupaten, deskripsi, potensi_bahaya,
  latitude, longitude, tahun_acuan, sumber, sumber_url, grain, catatan
) values
${kawasanSql}
on conflict (id) do update set
  nama = excluded.nama,
  jenis_bahaya = excluded.jenis_bahaya,
  zona = excluded.zona,
  kabupaten = excluded.kabupaten,
  kode_kabupaten = excluded.kode_kabupaten,
  deskripsi = excluded.deskripsi,
  potensi_bahaya = excluded.potensi_bahaya,
  latitude = excluded.latitude,
  longitude = excluded.longitude,
  tahun_acuan = excluded.tahun_acuan,
  sumber = excluded.sumber,
  sumber_url = excluded.sumber_url,
  grain = excluded.grain,
  catatan = excluded.catatan,
  updated_at = now();

insert into public.krb_dokumen (
  id, judul, jenis, wilayah, kabupaten, tahun_mulai, tahun_akhir, penerbit, status, url, catatan
) values
${dokumenSql}
on conflict (id) do update set
  judul = excluded.judul,
  jenis = excluded.jenis,
  wilayah = excluded.wilayah,
  kabupaten = excluded.kabupaten,
  tahun_mulai = excluded.tahun_mulai,
  tahun_akhir = excluded.tahun_akhir,
  penerbit = excluded.penerbit,
  status = excluded.status,
  url = excluded.url,
  catatan = excluded.catatan,
  updated_at = now();

`

mkdirSync(path.join(root, "scripts/generated"), { recursive: true });
writeFileSync(path.join(root, "scripts/generated/krb-aceh-seed.sql"), seedSql);

console.log(
  JSON.stringify(
    {
      kabupaten: kabupaten.length,
      wilayah: wilayah.length,
      kawasan: kawasan.length,
      dokumen: dokumen.length,
      fixture: fixturePath,
    },
    null,
    2
  )
);
