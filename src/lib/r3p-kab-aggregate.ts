/**
 * Dissolve kecamatanDistribution → r3pDistribution (kab properties).
 *
 * Group key: properties.kode_kabupaten or kode_kab (4-digit BPS) only.
 * Never invent codes. Features without a 4-digit kode stay out.
 *
 * Bucket: sum(rumah_rr+rumah_rs+rumah_rb) then r3pDistribution legend
 * terciles (t1=1362, t2=10795).
 */

export const FOUR_DIGIT_KODE = /^\d{4}$/;

/** Same breaks as public/fixtures/areas/r3pDistribution.legend.json terciles. */
export const R3P_KAB_TERCILES = Object.freeze({ t1: 1362, t2: 10795 });

export type R3pKabBucket = "rendah" | "sedang" | "tinggi";

export type R3pKabGroup = {
  kode_kab: string;
  geometries: object[];
  rumah_rr: number;
  rumah_rs: number;
  rumah_rb: number;
  value: number;
  valueNumericCount: number;
  kabupaten: unknown[];
  memberCount: number;
};

export function fourDigitKode(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return FOUR_DIGIT_KODE.test(s) ? s : null;
}

export function r3pKabBucket(total: unknown): R3pKabBucket {
  const t = Number(total);
  const n = Number.isFinite(t) ? t : 0;
  if (n <= R3P_KAB_TERCILES.t1) return "rendah";
  if (n <= R3P_KAB_TERCILES.t2) return "sedang";
  return "tinggi";
}

export function sumNumeric(value: unknown): number {
  if (value == null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function consistentString(values: unknown[]): string | null {
  const uniq = Array.from(
    new Set(
      (values || [])
        .map((v) => (v == null ? "" : String(v).trim()))
        .filter((s) => s && s !== "null" && s !== "undefined"),
    ),
  );
  return uniq.length === 1 ? uniq[0] : null;
}

function kabKodeFromFeature(props: Record<string, unknown> | null | undefined): string | null {
  const p = props ?? {};
  const direct = fourDigitKode(p.kode_kabupaten) ?? fourDigitKode(p.kode_kab);
  if (direct) return direct;
  const kec = String(p.kode_kecamatan ?? "").trim();
  if (/^\d{6}$/.test(kec)) return kec.slice(0, 4);
  return null;
}

export function groupKecamatanFeaturesByKabupaten(
  features: Array<{
    properties?: Record<string, unknown> | null;
    geometry?: object | null;
  }>,
): {
  groups: Map<string, R3pKabGroup>;
  leftover_excluded: number;
} {
  const groups = new Map<string, R3pKabGroup>();
  let leftover_excluded = 0;

  for (const feature of features || []) {
    const p = feature.properties ?? {};
    const kode = kabKodeFromFeature(p);
    if (!kode) {
      leftover_excluded += 1;
      continue;
    }
    let group = groups.get(kode);
    if (!group) {
      group = {
        kode_kab: kode,
        geometries: [],
        rumah_rr: 0,
        rumah_rs: 0,
        rumah_rb: 0,
        value: 0,
        valueNumericCount: 0,
        kabupaten: [],
        memberCount: 0,
      };
      groups.set(kode, group);
    }
    group.memberCount += 1;
    if (feature.geometry) group.geometries.push(feature.geometry);
    group.rumah_rr += sumNumeric(p.rumah_rr);
    group.rumah_rs += sumNumeric(p.rumah_rs);
    group.rumah_rb += sumNumeric(p.rumah_rb);
    if (p.value != null && p.value !== "" && Number.isFinite(Number(p.value))) {
      group.value += Number(p.value);
      group.valueNumericCount += 1;
    }
    group.kabupaten.push(p.kabupaten ?? p.name);
  }

  return { groups, leftover_excluded };
}

export function buildR3pKabProperties(group: R3pKabGroup): Record<string, string | number> {
  const rumahTotal = group.rumah_rr + group.rumah_rs + group.rumah_rb;
  const kabupaten = consistentString(group.kabupaten);
  const props: Record<string, string | number> = {
    name: kabupaten || group.kode_kab,
    kode_kab: group.kode_kab,
    level: "kab",
    rumah_rr: group.rumah_rr,
    rumah_rs: group.rumah_rs,
    rumah_rb: group.rumah_rb,
    value: group.valueNumericCount > 0 ? group.value : rumahTotal,
    bucket: r3pKabBucket(rumahTotal),
    source: "dissolve:kode_kabupaten",
  };
  if (kabupaten) props.kabupaten = kabupaten;
  props.kode_kabupaten = group.kode_kab;
  return props;
}

export function rumahTotalFromGroups(groups: Map<string, R3pKabGroup>): number {
  return Array.from(groups.values()).reduce(
    (total, group) => total + group.rumah_rr + group.rumah_rs + group.rumah_rb,
    0,
  );
}
