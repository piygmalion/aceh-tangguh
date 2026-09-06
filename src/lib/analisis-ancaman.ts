import type { IrbiKab } from "@/lib/irbi";
import {
  kawasanOverlappingKab,
  lookupKrbKabupaten,
  lookupKrbWilayah,
  parseKrbJenis,
  type KrbJenisKode,
} from "@/lib/krb-by-kab";
import { kabupatenNamesMatch } from "@/lib/kabupaten-join";
import type { KrbKawasan, KrbPayload } from "@/lib/krb-filter";
import type { RumahRusakCounts } from "@/lib/kejadian-analisis";
import {
  buildProyeksiDampak,
  type DampakCard,
  type ProyeksiDampak,
} from "@/lib/proyeksi-dampak";

const JENIS_TO_KRB: Record<string, KrbJenisKode> = {
  "gempa bumi": "gempabumi",
  "banjir": "banjir",
  "banjir bandang": "banjir_bandang",
  "tanah longsor": "tanah_longsor",
  "longsor": "tanah_longsor",
  "abrasi": "gelombang_ekstrim_abrasi",
  "kekeringan": "kekeringan",
  "kebakaran hutan dan lahan": "kebakaran_hutan_lahan",
  "angin puting beliung": "cuaca_ekstrem",
  tsunami: "tsunami",
};

const KRB_TO_JENIS: Record<KrbJenisKode, string[]> = {
  banjir: ["Banjir"],
  gempabumi: ["Gempa Bumi"],
  tsunami: ["Tsunami"],
  letusan_gunung_api: [],
  banjir_bandang: ["Banjir Bandang"],
  gelombang_ekstrim_abrasi: ["Abrasi"],
  kebakaran_hutan_lahan: ["Kebakaran Hutan dan Lahan"],
  tanah_longsor: ["Longsor", "Tanah Longsor"],
  kekeringan: ["Kekeringan"],
  likuefaksi: [],
  cuaca_ekstrem: ["Angin Puting Beliung"],
};

export type AncamanHistoryInput = {
  jumlahKejadian: number;
  kejadianTerakhir: string | null;
  localImpacts: RumahRusakCounts[];
  provincialImpacts: RumahRusakCounts[];
  localCards?: DampakCard[];
  provincialCards?: DampakCard[];
};

export type AnalogRange = {
  min: number;
  median: number;
  max: number;
};

export type AnalogDamage = {
  grain: "kabupaten" | "provinsi" | "none";
  n: number;
  rr: AnalogRange | null;
  rs: AnalogRange | null;
  rb: AnalogRange | null;
};

export type AncamanKelas = {
  kelas: string;
  skor: number | null;
};

export type AncamanRiwayat = {
  ready: boolean;
  kodeKabupaten: string | null;
  irbi: (AncamanKelas & { irbKab: number | null; kelasKab: string | null }) | null;
  krb: AncamanKelas | null;
  kawasan: Pick<KrbKawasan, "id" | "nama" | "zona">[];
  history: {
    punyaRiwayat: boolean;
    jumlahKejadian: number;
    kejadianTerakhir: string | null;
  };
  analog: AnalogDamage;
  proyeksi: ProyeksiDampak;
};

function foldJenis(raw: string): string {
  return raw.normalize("NFC").trim().toLowerCase();
}

export function disasterJenisToKrbJenis(
  jenis: string | null | undefined
): KrbJenisKode | null {
  if (!jenis) return null;
  return JENIS_TO_KRB[foldJenis(jenis)] ?? null;
}

export function krbJenisToDisasterJenis(kode: string | null | undefined): string[] {
  const parsed = parseKrbJenis(kode);
  if (!parsed) return [];
  return KRB_TO_JENIS[parsed];
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asKelas(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const kelas = value.trim().toUpperCase();
  return kelas === "RENDAH" || kelas === "SEDANG" || kelas === "TINGGI" ? kelas : null;
}

function hasHousingDamage(row: RumahRusakCounts): boolean {
  return row.rr + row.rs + row.rb > 0;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

function rangeOf(values: number[]): AnalogRange {
  return {
    min: Math.min(...values),
    median: median(values),
    max: Math.max(...values),
  };
}

export function projectAnalogDamage(
  localImpacts: RumahRusakCounts[],
  provincialImpacts: RumahRusakCounts[] = []
): AnalogDamage {
  const local = localImpacts.filter(hasHousingDamage);
  const source = local.length > 0 ? local : provincialImpacts.filter(hasHousingDamage);
  if (source.length === 0) {
    return { grain: "none", n: 0, rr: null, rs: null, rb: null };
  }
  return {
    grain: local.length > 0 ? "kabupaten" : "provinsi",
    n: source.length,
    rr: rangeOf(source.map((row) => row.rr)),
    rs: rangeOf(source.map((row) => row.rs)),
    rb: rangeOf(source.map((row) => row.rb)),
  };
}

export function buildAncamanRiwayat(input: {
  kab: string;
  ancaman: string;
  irbi: readonly IrbiKab[];
  krb: KrbPayload;
  history: AncamanHistoryInput;
}): AncamanRiwayat {
  const analog = projectAnalogDamage(
    input.history.localImpacts,
    input.history.provincialImpacts
  );
  const proyeksi = buildProyeksiDampak({
    local: input.history.localCards ?? [],
    provincial: input.history.provincialCards ?? [],
    ancaman: input.ancaman,
    irbiKelas: null,
  });
  const empty: AncamanRiwayat = {
    ready: false,
    kodeKabupaten: null,
    irbi: null,
    krb: null,
    kawasan: [],
    history: {
      punyaRiwayat: input.history.jumlahKejadian > 0,
      jumlahKejadian: input.history.jumlahKejadian,
      kejadianTerakhir: input.history.kejadianTerakhir,
    },
    analog,
    proyeksi,
  };

  const kab = input.kab.trim();
  const ancaman = parseKrbJenis(input.ancaman);
  if (!kab || !ancaman) return empty;

  const kabRow = lookupKrbKabupaten(input.krb.kabupaten, { nama: kab });
  const kodeKabupaten = kabRow?.kode_kabupaten ?? null;
  const rawIrbi = input.irbi.find((row) =>
    kabupatenNamesMatch(String(row.kabupaten_kota ?? ""), kab)
  );

  const irbiKelas = asKelas(rawIrbi?.[`kelas_${ancaman}`]);
  const irbiSkor = asFiniteNumber(rawIrbi?.[`ir_${ancaman}`]);
  const irbi =
    rawIrbi && (irbiKelas || irbiSkor != null)
      ? {
          kelas: irbiKelas ?? "",
          skor: irbiSkor,
          irbKab: asFiniteNumber(rawIrbi.irb_2025),
          kelasKab: asKelas(rawIrbi.kelas_risiko),
        }
      : null;

  const wilayah = lookupKrbWilayah(input.krb.wilayah, {
    kode: kodeKabupaten,
    nama: kab,
    jenis: ancaman,
  });
  const krbKelas = wilayah ? asKelas(wilayah.kelas_ancaman) : null;
  const krbSkor = wilayah ? asFiniteNumber(wilayah.skor_irbi) : null;
  const krb =
    wilayah && (krbKelas || krbSkor != null)
      ? {
          kelas: krbKelas ?? "",
          skor: krbSkor,
        }
      : null;

  const kawasan = kawasanOverlappingKab(input.krb.kawasan, kodeKabupaten)
    .filter((row) => row.jenis_bahaya === ancaman)
    .map((row) => ({ id: row.id, nama: row.nama, zona: row.zona }));

  return {
    ready: true,
    kodeKabupaten,
    irbi,
    krb,
    kawasan,
    history: empty.history,
    analog,
    proyeksi: buildProyeksiDampak({
      local: input.history.localCards ?? [],
      provincial: input.history.provincialCards ?? [],
      ancaman,
      irbiKelas: irbiKelas,
    }),
  };
}

export { parseKrbJenis };
