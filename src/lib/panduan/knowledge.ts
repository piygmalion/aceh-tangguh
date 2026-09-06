import { DATA_SOURCES } from "@/lib/data-sources";
import { JENIS_BENCANA_JUKLAK, klasifikasiLabel } from "@/lib/sik/jenis-bencana";
import { STATIC_GUIDE_FAQ } from "./faq";
import type { GuideHref } from "./types";

export type KnowledgeCard = {
  sourceId: string;
  title: string;
  bodyId: string;
  bodyEn: string;
  href: GuideHref;
  hash?: string;
  labelKey: string;
  terms: string[];
};

const DATA_SOURCE_IDS = new Set([
  "dibi-aceh",
  "kejadian-bencana",
  "irbi-2025",
  "krb-aceh",
  "weather-forecast",
  "magma-gempa",
  "sipongi-hotspot",
  "tatonas-monitoring",
  "analisis-anggaran-2026",
  "publikasi-btt",
  "publikasi-kegiatan",
  "laporan-kejadian",
  "titik-pengungsian",
]);

function juklakCards(): KnowledgeCard[] {
  const cards: KnowledgeCard[] = [];
  for (const entry of JENIS_BENCANA_JUKLAK) {
    const names = entry.namaKejadian.map((row) => row.nama).join(", ");
    const klas = klasifikasiLabel(entry.klasifikasi);
    cards.push({
      sourceId: `juklak-${entry.kode}`,
      title: entry.jenis,
      bodyId: `${entry.jenis} (kode ${entry.kode}) adalah ${klas} dalam Juklak Standar Data Kejadian dan Dampak Bencana BNPB No. 7 Tahun 2023 yang dipakai SIK Aceh Tangguh. Nama kejadian dalam jenis ini: ${names}. Ini label katalog, bukan jumlah korban, SK darurat, atau perintah evakuasi.`,
      bodyEn: `${entry.jenis} (code ${entry.kode}) is a ${entry.klasifikasi} hazard in BNPB Juklak No. 7/2023 used by Aceh Tangguh SIK. Event names in this type: ${names}. This is a catalogue label, not a casualty count, emergency decree, or evacuation order.`,
      href: "/data-bencana",
      labelKey: "linkDataBencana",
      terms: [
        entry.jenis,
        entry.labelPeta,
        ...entry.namaKejadian.map((row) => row.nama),
        ...entry.namaKejadian.map((row) => row.slug.replaceAll("-", " ")),
        "juklak",
        "jenis bencana",
      ],
    });
    for (const nama of entry.namaKejadian) {
      cards.push({
        sourceId: `juklak-${nama.slug}`,
        title: nama.nama,
        bodyId: `${nama.nama} tercatat sebagai nama kejadian pada jenis ${entry.jenis} (kode ${entry.kode}, ${klas}) menurut Juklak BNPB No. 7 Tahun 2023. Situs ini memakai label itu di SIK dan peta. Angka kejadian atau korban hanya dari umpan resmi saat tersedia — tidak dari definisi ini.`,
        bodyEn: `${nama.nama} is an event name under ${entry.jenis} (code ${entry.kode}) in BNPB Juklak No. 7/2023. This site uses that label in SIK and on the map. Incident or casualty figures come only from official feeds when available — not from this definition.`,
        href: "/data-bencana",
        labelKey: "linkDataBencana",
        terms: [nama.nama, nama.slug.replaceAll("-", " "), entry.jenis],
      });
    }
  }
  return cards;
}

function staticConceptCards(): KnowledgeCard[] {
  return [
    {
      sourceId: "concept-destana",
      title: "Destana",
      bodyId:
        "Destana adalah status ketangguhan desa (belum / pratama / madya / utama) dari katalog SIK publik. Ini penilaian kesiapsiagaan desa, bukan zona evakuasi dan bukan SK darurat.",
      bodyEn:
        "Destana is village-resilience status (not yet / pratama / madya / utama) from the public SIK catalogue. It is a preparedness rating, not an evacuation zone and not an emergency decree.",
      href: "/destana",
      labelKey: "linkDestana",
      terms: ["destana", "desa tangguh", "ketangguhan desa", "pratama", "madya", "utama"],
    },
    {
      sourceId: "concept-irbi-krb",
      title: "IRBI dan KRB",
      bodyId:
        "IRBI adalah kelas indeks risiko BNPB. Situs ini menampilkan kelas IRBI, bukan zona KRB I/II/III. Poligon KRB resmi tetap di InaRISK/PVMBG. Kelas risiko bukan status siaga operasional.",
      bodyEn:
        "IRBI is BNPB’s risk-index class. This site shows IRBI classes, not KRB I/II/III zones. Official KRB polygons stay on InaRISK/PVMBG. A risk class is not an operational alert level.",
      href: "/metodologi",
      labelKey: "linkMetodologi",
      terms: ["irbi", "krb", "indeks risiko", "kawasan rawan", "zona rawan", "kelas risiko"],
    },
    {
      sourceId: "concept-peringatan",
      title: "Peringatan dini beranda",
      bodyId:
        "Kartu peringatan dini beranda mandiri: cuaca (BMKG/Open-Meteo, hanya kondisi yang perlu perhatian), gempa MAGMA yang lolos filter Aceh, hotspot Sipongi medium/tinggi, dan hidrologi Tatonas (muka air/pos). Kartu yang gagal berlabel data tertunda — angka tidak diisi dari ingatan. Bukan perintah evakuasi.",
      bodyEn:
        "Home early-warning cards are independent: weather (BMKG/Open-Meteo, attention-worthy conditions only), MAGMA quakes that pass the Aceh filter, Sipongi medium/high hotspots, and Tatonas hydrology (water level/posts). A failed card is marked delayed — figures are not filled from memory. Not an evacuation order.",
      href: "/",
      hash: "status",
      labelKey: "linkPeringatan",
      terms: [
        "peringatan dini",
        "tatonas",
        "muka air",
        "pos hidrologi",
        "magma",
        "sipongi",
        "hotspot",
        "bmkg",
      ],
    },
    {
      sourceId: "concept-dibi",
      title: "DIBI Aceh",
      bodyId:
        "Dasbor DIBI BNPB di situs ini hanya Provinsi Aceh (filter provinsi=Aceh, is_bencana=true). Angka DIBI adalah rekap historis, bukan status darurat hari ini. Jika umpan DIBI gagal, kartu memakai snapshot fixture atau berlabel tertunda.",
      bodyEn:
        "The BNPB DIBI dashboard on this site is Aceh-only (provinsi=Aceh, is_bencana=true). DIBI figures are historical totals, not today’s emergency status. If the DIBI feed fails, the card uses a fixture snapshot or is marked delayed.",
      href: "/",
      hash: "dibi",
      labelKey: "linkDibi",
      terms: ["dibi", "statistik bencana", "rekap bencana", "sejarah bencana"],
    },
    {
      sourceId: "concept-lapor",
      title: "Laporan warga",
      bodyId:
        "Warga memilih laporan kejadian atau penanganan, isi lokasi, lalu kirim. Laporan tampil di peta setelah dimoderasi Pusdalops BPBA. Identitas tidak ditampilkan di peta publik.",
      bodyEn:
        "Residents choose an incident or response report, add the location, then submit. Reports appear on the map after BPBA Pusdalops moderation. Identity is not shown on the public map.",
      href: "/lapor/kejadian",
      labelKey: "linkLaporKejadian",
      terms: ["lapor", "laporan warga", "cara lapor", "partisipasi"],
    },
    {
      sourceId: "concept-112",
      title: "Darurat",
      bodyId:
        "Tanggapi bukan pengganti 112 atau instruksi Pusdalops BPBA saat darurat. Nomor yang dipublikasikan ada di halaman nomor penting. Saya tidak memberi perintah evakuasi.",
      bodyEn:
        "Tanggapi does not replace 112 or BPBA Pusdalops instructions in an emergency. Published numbers are on the contacts page. I do not issue evacuation orders.",
      href: "/nomor-penting",
      labelKey: "linkNomor",
      terms: ["112", "darurat", "pusdalops", "nomor penting", "ambulans"],
    },
    {
      sourceId: "concept-tanggapi-asisten",
      title: "Tanggapi asisten situs",
      bodyId:
        "Tanggapi adalah asisten riset sipil di Aceh Tangguh: menavigasi situs dan merangkai cuplikan sumber resmi yang sudah ada di situs. Bukan chatbot merek xAI di UI, dan bukan portal publikasi Tanggapi Aceh. Saya tidak mengarang angka korban, SK darurat, atau perintah evakuasi.",
      bodyEn:
        "Tanggapi is the civic research assistant on Aceh Tangguh: it navigates the site and rephrases official snippets already on this site. It is not an xAI-branded chatbot in the UI, and it is not the Tanggapi Aceh publication portal. I do not invent casualty figures, emergency decrees, or evacuation orders.",
      href: "/",
      labelKey: "linkSection",
      terms: [
        "tanggapi",
        "apa itu tanggapi",
        "asisten tanggapi",
        "asisten riset",
        "grokbot",
      ],
    },
    {
      sourceId: "concept-tanggapi-publikasi",
      title: "Tanggapi Aceh publikasi",
      bodyId:
        "Tanggapi Aceh (tanggapi.acehprov.go.id) adalah kanal publikasi analisis kebijakan untuk dataset Belanja Tidak Terduga (BTT). Itu portal terpisah. Cuplikan artikel BTT di situs ini ada di halaman publikasi — bukan jawaban operasional hari ini, dan bukan asisten Tanggapi di widget ini.",
      bodyEn:
        "Tanggapi Aceh (tanggapi.acehprov.go.id) is the policy-analysis publication channel for the Unexpected Expenditure (BTT) dataset. That is a separate portal. BTT article snippets on this site live on the publications page — they are not today’s operational status, and they are not this widget’s Tanggapi assistant.",
      href: "/publikasi",
      labelKey: "linkPublikasi",
      terms: [
        "tanggapi aceh",
        "publikasi tanggapi",
        "portal tanggapi",
        "btt",
        "belanja tidak terduga",
        "tanggapi.acehprov",
      ],
    },
    {
      sourceId: "concept-analisis-data",
      title: "Analisis data bencana",
      bodyId:
        "Halaman Analisis data memotong katalog kejadian yang sama dengan Data bencana. Filter mengubah grafik dan URL. Bukan artikel publikasi Tanggapi Aceh. Angka DIBI nasional tidak dijumlahkan ke total halaman itu.",
      bodyEn:
        "The Data analysis page slices the same event catalogue as Disaster data. Filters update the charts and the URL. It is not a Tanggapi Aceh publication article. National DIBI figures are not added into that page’s totals.",
      href: "/analisis-data",
      labelKey: "linkAnalisisData",
      terms: [
        "analisis data",
        "analisis data bencana",
        "disaster analysis",
        "disaster data analysis",
      ],
    },
    {
      sourceId: "method-dibi",
      title: "Metodologi DIBI Aceh",
      bodyId:
        "Dasbor bencana Aceh menarik agregat dari dasbor publik DIBI BNPB, dataset dampak kejadian, dengan filter provinsi=Aceh dan is_bencana=true. Bukan kanal CKAN Satu Data. Jika DIBI gagal, aplikasi memakai snapshot fixture atau menandai data tertunda — angka korban tidak diisi dari ingatan.",
      bodyEn:
        "The Aceh disaster dashboard pulls aggregates from the public BNPB DIBI dashboard (impact dataset), filtered to provinsi=Aceh and is_bencana=true. It is not the Satu Data CKAN channel. If DIBI fails, the app uses a fixture snapshot or marks data delayed — casualty figures are not filled from memory.",
      href: "/metodologi",
      labelKey: "linkMetodologi",
      terms: ["dibi", "metodologi dibi", "dasbor bencana", "cara membaca dibi", "bagaimana membaca dibi"],
    },
    {
      sourceId: "method-peringatan",
      title: "Metodologi peringatan dini",
      bodyId:
        "Kartu peringatan dini beranda gagal secara mandiri: cuaca (hanya kondisi yang perlu perhatian), MAGMA (filter Aceh; gagal = kosong berlabel tertunda), Sipongi (Aceh, kepercayaan medium/tinggi), dan hidrologi Tatonas. Angka gempa, hotspot, atau petugas siaga tidak pernah diciptakan. Bukan perintah evakuasi.",
      bodyEn:
        "Home early-warning cards fail independently: weather (attention-worthy conditions only), MAGMA (Aceh filter; failure = empty and delayed), Sipongi (Aceh, medium/high confidence), and Tatonas hydrology. Quake, hotspot, or alert-level figures are never invented. Not an evacuation order.",
      href: "/metodologi",
      labelKey: "linkMetodologi",
      terms: ["metodologi peringatan", "cara membaca peringatan", "kartu peringatan"],
    },
    {
      sourceId: "method-irbi-krb",
      title: "Cara membaca IRBI dan KRB",
      bodyId:
        "Kelas IRBI di situs ini adalah indeks risiko BNPB, bukan peta zona KRB I/II/III. Poligon KRB resmi tetap di InaRISK/PVMBG. Membaca kelas risiko tidak sama dengan membaca status siaga atau perintah evakuasi.",
      bodyEn:
        "IRBI classes on this site are BNPB risk-index scores, not KRB I/II/III zone maps. Official KRB polygons stay on InaRISK/PVMBG. Reading a risk class is not the same as reading an alert level or an evacuation order.",
      href: "/metodologi",
      labelKey: "linkMetodologi",
      terms: [
        "cara membaca irbi",
        "cara membaca krb",
        "bagaimana membaca irbi",
        "bagaimana membaca risiko",
        "bandingkan",
        "vs",
        "perbedaan",
      ],
    },
  ];
}

function faqCards(): KnowledgeCard[] {
  return STATIC_GUIDE_FAQ.map((entry) => ({
    sourceId: `faq-${entry.id}`,
    title: entry.id,
    bodyId: entry.bodyId,
    bodyEn: entry.bodyEn,
    href: entry.href,
    hash: entry.hash,
    labelKey: entry.labelKey,
    terms: [...entry.patterns.id, ...entry.patterns.en],
  }));
}

function dataSourceCards(): KnowledgeCard[] {
  return DATA_SOURCES.filter((row) => DATA_SOURCE_IDS.has(row.id)).map((row) => ({
    sourceId: `source-${row.id}`,
    title: row.titleId,
    bodyId: `${row.titleId}. Sumber: ${row.source}. Dipakai untuk: ${row.usedFor}`.slice(0, 480),
    bodyEn: `${row.titleEn}. Source: ${row.source}. Used for: ${row.usedFor}`.slice(0, 480),
    href: row.id === "analisis-anggaran-2026" ? "/anggaran-bencana" : "/sumber-data",
    labelKey: row.id === "analisis-anggaran-2026" ? "linkAnggaran" : "linkSumber",
    terms: [row.id.replaceAll("-", " "), row.titleId, row.titleEn],
  }));
}

let cached: KnowledgeCard[] | null = null;

export function getKnowledgeCards(): KnowledgeCard[] {
  if (!cached) {
    cached = [...staticConceptCards(), ...faqCards(), ...juklakCards(), ...dataSourceCards()];
  }
  return cached;
}

export function knowledgeBody(card: KnowledgeCard, locale: "id" | "en"): string {
  return locale === "en" ? card.bodyEn : card.bodyId;
}
