import type { GuideIntentId } from "./types";

export type GuideIntentDef = {
  id: Exclude<GuideIntentId, "unknown">;
  priority: number;
  patterns: { id: string[]; en: string[] };
};

export const GUIDE_INTENTS: GuideIntentDef[] = [
  {
    id: "nomor",
    priority: 10,
    patterns: {
      id: [
        "nomor penting",
        "nomor darurat",
        "nomor telepon",
        "kontak darurat",
        "telepon darurat",
        "hubungi bpba",
        "pusdalops",
        "call center",
        "112",
      ],
      en: [
        "emergency number",
        "emergency contact",
        "emergency contacts",
        "hotline",
        "call bpba",
        "phone number",
        "112",
      ],
    },
  },
  {
    id: "lapor",
    priority: 20,
    patterns: {
      id: [
        "cara lapor",
        "laporkan kejadian",
        "lapor kejadian",
        "lapor penanganan",
        "kirim laporan",
        "melapor",
        "form lapor",
        "laporkan",
      ],
      en: [
        "how to report",
        "report an incident",
        "report incident",
        "submit a report",
        "citizen report",
        "file a report",
      ],
    },
  },
  {
    id: "tour",
    priority: 30,
    patterns: {
      id: [
        "mulai tur",
        "jelajahi situs",
        "jelajah situs",
        "tur situs",
        "panduan situs",
        "tunjukkan beranda",
        "apa saja di sini",
        "apa yang ada di situs",
        "jelajahi",
      ],
      en: [
        "start tour",
        "explore the site",
        "site tour",
        "show me around",
        "what's on this site",
        "whats on this site",
        "guide me",
      ],
    },
  },
  {
    id: "peringatan",
    priority: 40,
    patterns: {
      id: [
        "peringatan dini",
        "status peringatan",
        "gempa terkini",
        "gempa terbaru",
        "hotspot",
        "karhutla hari ini",
        "magma",
        "sipongi",
        "tatonas",
        "muka air",
        "pos hidrologi",
        "hidrologi",
        "ada peringatan",
      ],
      en: [
        "early warning",
        "current warning",
        "latest earthquake",
        "earthquake now",
        "hotspot",
        "magma",
        "sipongi",
        "tatonas",
        "water level",
        "hydrology station",
      ],
    },
  },
  {
    id: "cuaca",
    priority: 50,
    patterns: {
      id: ["cuaca ekstrem", "prakiraan cuaca", "cuaca", "hujan lebat", "bmkg"],
      en: ["extreme weather", "weather forecast", "weather", "heavy rain", "bmkg"],
    },
  },
  {
    id: "peta",
    priority: 60,
    patterns: {
      id: ["buka peta", "peta bencana", "peta penuh", "lihat peta", "peta aceh", "peta"],
      en: ["open the map", "open map", "disaster map", "full map", "show the map", "map"],
    },
  },
  {
    id: "destana",
    priority: 70,
    patterns: {
      id: ["destana", "desa tangguh", "ketangguhan desa"],
      en: ["destana", "resilient village", "village resilience"],
    },
  },
  {
    id: "kejadian",
    priority: 80,
    patterns: {
      id: [
        "kejadian aktif",
        "kejadian bencana",
        "data bencana",
        "bencana aktif",
        "apa yang terjadi",
        "kejadian",
        "bencana di",
      ],
      en: [
        "active incident",
        "disaster data",
        "disaster events",
        "what happened",
        "incidents",
        "incident",
      ],
    },
  },
  {
    id: "analisisData",
    priority: 85,
    patterns: {
      id: ["analisis data", "analisis data bencana"],
      en: ["disaster analysis", "disaster data analysis"],
    },
  },
  {
    id: "dibi",
    priority: 90,
    patterns: {
      id: [
        "dibi",
        "sejarah bencana",
        "rekap bencana",
        "statistik bencana",
        "berapa kejadian",
        "tren bencana",
      ],
      en: [
        "dibi",
        "disaster history",
        "disaster statistics",
        "how many disasters",
        "historical disasters",
      ],
    },
  },
  {
    id: "anggaran",
    priority: 100,
    patterns: {
      id: ["anggaran bencana", "belanja tidak terduga", "anggaran", "btt", "apba"],
      en: ["disaster budget", "budget", "unforeseen expenditure"],
    },
  },
  {
    id: "irbi",
    priority: 110,
    patterns: {
      id: ["irbi", "indeks risiko", "kelas risiko", "risiko bencana"],
      en: ["irbi", "risk index", "disaster risk class", "disaster risk"],
    },
  },
  {
    id: "krb",
    priority: 120,
    patterns: {
      id: ["krb", "kawasan rawan", "zona rawan", "zona krb"],
      en: ["krb", "hazard zone", "hazard area"],
    },
  },
  {
    id: "pelatihan",
    priority: 130,
    patterns: {
      id: ["pelatihan", "diklat", "bimtek"],
      en: ["training", "workshop", "capacity building"],
    },
  },
  {
    id: "mitra",
    priority: 140,
    patterns: {
      id: ["mitra", "lembaga mitra"],
      en: ["partners", "partner organizations"],
    },
  },
  {
    id: "publikasi",
    priority: 150,
    patterns: {
      id: ["publikasi", "artikel", "kegiatan bpba"],
      en: ["publications", "articles", "bpba activities"],
    },
  },
  {
    id: "metodologi",
    priority: 160,
    patterns: {
      id: ["metodologi", "sumber data", "dari mana data", "cara menghitung"],
      en: ["methodology", "data source", "data sources", "where does the data"],
    },
  },
  {
    id: "tentang",
    priority: 170,
    patterns: {
      id: [
        "apa itu aceh tangguh",
        "tentang aceh tangguh",
        "tentang situs",
        "siapa aceh tangguh",
        "halo",
        "hai",
        "selamat pagi",
        "selamat siang",
        "selamat sore",
      ],
      en: [
        "what is aceh tangguh",
        "about aceh tangguh",
        "about this site",
        "hello",
        "hi",
        "hey",
      ],
    },
  },
];

export const CONTEXT_FOR_INTENT: Record<
  Exclude<GuideIntentId, "unknown">,
  import("./types").GuideContextKey[]
> = {
  tour: [],
  peringatan: ["peringatan"],
  cuaca: ["peringatan", "weather"],
  lapor: [],
  peta: [],
  destana: ["destana"],
  nomor: ["nomor"],
  kejadian: ["liveStats", "sikStats", "kejadian"],
  analisisData: [],
  dibi: ["dibi"],
  anggaran: ["anggaran"],
  irbi: ["irbi"],
  krb: ["krb", "irbi"],
  pelatihan: ["pelatihan"],
  mitra: ["mitra"],
  publikasi: ["publikasi"],
  metodologi: [],
  tentang: ["liveStats"],
};
