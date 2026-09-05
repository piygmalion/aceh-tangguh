import { resolveAdm2 } from "@/lib/aceh-kabupaten";
import { kabupatenNamesMatch, normalizeKabupatenKey } from "@/lib/kabupaten-join";
import { fetchPublicApi } from "@/lib/preview/public-api";
import type { KrbKabupaten, KrbKawasan, KrbKelasAncaman, KrbPayload, KrbWilayah } from "@/lib/krb-filter";

/**
 * Join KRB rows by registry adm2 (weather/KRB) or SIK 4-digit via
 * resolveAdm2. toDottedKabKode is shape-only — not identity.
 * Do not invent a class when no row matches.
 */

export const KRB_JENIS_KODE = [
  "banjir",
  "gempabumi",
  "tsunami",
  "letusan_gunung_api",
  "banjir_bandang",
  "gelombang_ekstrim_abrasi",
  "kebakaran_hutan_lahan",
  "tanah_longsor",
  "kekeringan",
  "likuefaksi",
  "cuaca_ekstrem",
] as const;

export type KrbJenisKode = (typeof KRB_JENIS_KODE)[number];

export function parseKrbJenis(raw: string | null | undefined): KrbJenisKode | null {
  if (!raw) return null;
  const kode = raw.trim().toLowerCase();
  return (KRB_JENIS_KODE as readonly string[]).includes(kode)
    ? (kode as KrbJenisKode)
    : null;
}

/** `1106` / `11.06` → `11.06`. Unknown shapes stay null. */
export function toDottedKabKode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^\d{2}\.\d{2}$/.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return null;
}

export function kelasToBucket(
  kelas: string | null | undefined
): "rendah" | "sedang" | "tinggi" | null {
  const u = kelas?.trim().toUpperCase();
  if (u === "RENDAH") return "rendah";
  if (u === "SEDANG") return "sedang";
  if (u === "TINGGI") return "tinggi";
  return null;
}

export function lookupKrbKabupaten(
  rows: readonly KrbKabupaten[],
  query: { kode?: string | null; nama?: string | null }
): KrbKabupaten | undefined {
  const dotted = resolveAdm2(query.kode ?? undefined);
  if (dotted) {
    const byCode = rows.find((row) => row.kode_kabupaten === dotted);
    if (byCode) return byCode;
  }
  if (query.nama) {
    return rows.find((row) => kabupatenNamesMatch(row.kabupaten, query.nama));
  }
  return undefined;
}

export function lookupKrbWilayah(
  rows: readonly KrbWilayah[],
  query: { kode?: string | null; nama?: string | null; jenis: string }
): KrbWilayah | undefined {
  const jenis = query.jenis.trim().toLowerCase();
  const dotted = resolveAdm2(query.kode ?? undefined);
  if (dotted) {
    const byCode = rows.find(
      (row) => row.kode_kabupaten === dotted && row.jenis_bahaya === jenis
    );
    if (byCode) return byCode;
  }
  if (query.nama) {
    return rows.find(
      (row) =>
        row.jenis_bahaya === jenis &&
        kabupatenNamesMatch(row.kabupaten, query.nama)
    );
  }
  return undefined;
}

export function joinKelasOntoIrbiFeatures<T extends { properties?: Record<string, unknown> | null }>(
  features: T[],
  wilayah: readonly KrbWilayah[],
  jenis: string
): T[] {
  return features.map((feature) => {
    const props = feature.properties ?? {};
    const hit = lookupKrbWilayah(wilayah, {
      kode: String(props.kode_kabupaten ?? props.kode_kab ?? ""),
      nama: String(props.name ?? props.kabupaten ?? ""),
      jenis,
    });
    const bucket = kelasToBucket(hit?.kelas_ancaman);
    if (!hit || !bucket) return feature;
    return {
      ...feature,
      properties: {
        ...props,
        bucket,
        kelas_ancaman: hit.kelas_ancaman as KrbKelasAncaman,
        skor_irbi: hit.skor_irbi,
        krb_jenis: hit.jenis_bahaya,
      },
    };
  });
}

export function kawasanOverlappingKab(
  kawasan: readonly KrbKawasan[],
  kode: string | null | undefined
): KrbKawasan[] {
  const dotted = resolveAdm2(kode);
  if (!dotted) return [];
  return kawasan.filter((row) => (row.kode_kabupaten ?? []).includes(dotted));
}

export function kawasanPoints(kawasan: readonly KrbKawasan[]) {
  return {
    type: "FeatureCollection" as const,
    features: kawasan.flatMap((row) => {
      if (row.latitude == null || row.longitude == null) return [];
      return [
        {
          type: "Feature" as const,
          id: row.id,
          geometry: {
            type: "Point" as const,
            coordinates: [row.longitude, row.latitude] as [number, number],
          },
          properties: {
            title: row.nama,
            zona: row.zona,
            kabupaten: (row.kabupaten ?? []).join(", "),
            sumber_url: row.sumber_url ?? "",
            catatan: row.catatan ?? "",
            jenis_bahaya: row.jenis_bahaya,
          },
        },
      ];
    }),
  };
}

export async function fetchKrb(query: {
  jenis?: string;
  kabupaten?: string;
  kelas?: string;
} = {}): Promise<KrbPayload> {
  const params = new URLSearchParams();
  if (query.jenis) params.set("jenis", query.jenis);
  if (query.kabupaten) params.set("kabupaten", query.kabupaten);
  if (query.kelas) params.set("kelas", query.kelas);
  const qs = params.toString();
  const res = await fetchPublicApi(qs ? `/api/krb?${qs}` : "/api/krb");
  if (!res.ok) throw new Error("krb fetch failed");
  return res.json() as Promise<KrbPayload>;
}

export { normalizeKabupatenKey };
