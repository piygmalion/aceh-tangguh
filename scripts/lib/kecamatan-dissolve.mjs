/**
 * Dissolve villageDistribution → kecamatanDistribution (property rules).
 *
 * Group key is properties.kode_kecamatan (6-digit BPS) ONLY — never kecamatan name
 * (names repeat across kabupaten). Features without a 6-digit kode stay out.
 * Do not invent codes.
 *
 * Bucket: sum(rumah_rr + rumah_rs + rumah_rb), then the same villageDistribution
 * tercile breaks as desa (legend t1=106, t2=1184). Not recomputed, not majority.
 */

export const SIX_DIGIT_KODE = /^\d{6}$/;

/** Same breaks as public/fixtures/areas/villageDistribution.legend.json terciles. */
export const VILLAGE_DISTRIBUTION_TERCILES = Object.freeze({ t1: 106, t2: 1184 });

/**
 * @param {unknown} value
 * @returns {string | null}
 */
export function sixDigitKode(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return SIX_DIGIT_KODE.test(s) ? s : null;
}

/**
 * Desa / kecamatan Distribusi bucket — do not invent new breaks.
 * Rendah ≤106, sedang ≤1184, tinggi >1184.
 *
 * @param {unknown} total
 * @returns {"rendah" | "sedang" | "tinggi"}
 */
export function villageDistributionBucket(total) {
  const t = Number(total);
  const n = Number.isFinite(t) ? t : 0;
  if (n <= VILLAGE_DISTRIBUTION_TERCILES.t1) return "rendah";
  if (n <= VILLAGE_DISTRIBUTION_TERCILES.t2) return "sedang";
  return "tinggi";
}

/**
 * @param {unknown} value
 * @returns {number}
 */
export function sumNumeric(value) {
  if (value == null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Keep a label only when every non-empty member agrees.
 *
 * @param {unknown[]} values
 * @returns {string | null}
 */
export function consistentString(values) {
  const uniq = [
    ...new Set(
      (values || [])
        .map((v) => (v == null ? "" : String(v).trim()))
        .filter((s) => s && s !== "null" && s !== "undefined")
    ),
  ];
  return uniq.length === 1 ? uniq[0] : null;
}

/**
 * @param {Array<{ properties?: Record<string, unknown> | null, geometry?: object | null }>} features
 */
export function groupVillageFeaturesByKodeKecamatan(features) {
  /** @type {Map<string, {
   *   kode_kecamatan: string,
   *   geometries: object[],
   *   rumah_rr: number,
   *   rumah_rs: number,
   *   rumah_rb: number,
   *   value: number,
   *   valueNumericCount: number,
   *   kecamatan: unknown[],
   *   kabupaten: unknown[],
   *   kode_kabupaten: unknown[],
   *   memberCount: number,
   * }>} */
  const groups = new Map();
  let leftover_excluded = 0;
  let skipped_non_six_digit = 0;

  for (const feature of features || []) {
    const raw = feature?.properties?.kode_kecamatan;
    const kode = sixDigitKode(raw);
    if (!kode) {
      if (raw != null && String(raw).trim() !== "") skipped_non_six_digit += 1;
      else leftover_excluded += 1;
      continue;
    }
    let group = groups.get(kode);
    if (!group) {
      group = {
        kode_kecamatan: kode,
        geometries: [],
        rumah_rr: 0,
        rumah_rs: 0,
        rumah_rb: 0,
        value: 0,
        valueNumericCount: 0,
        kecamatan: [],
        kabupaten: [],
        kode_kabupaten: [],
        memberCount: 0,
      };
      groups.set(kode, group);
    }
    const p = feature.properties ?? {};
    group.memberCount += 1;
    if (feature.geometry) group.geometries.push(feature.geometry);
    group.rumah_rr += sumNumeric(p.rumah_rr);
    group.rumah_rs += sumNumeric(p.rumah_rs);
    group.rumah_rb += sumNumeric(p.rumah_rb);
    if (p.value != null && p.value !== "" && Number.isFinite(Number(p.value))) {
      group.value += Number(p.value);
      group.valueNumericCount += 1;
    }
    group.kecamatan.push(p.kecamatan);
    group.kabupaten.push(p.kabupaten);
    group.kode_kabupaten.push(p.kode_kabupaten);
  }

  return { groups, leftover_excluded, skipped_non_six_digit };
}

/**
 * @param {ReturnType<typeof groupVillageFeaturesByKodeKecamatan>["groups"] extends Map<string, infer G> ? G : never} group
 */
export function buildKecamatanProperties(group) {
  const rumahTotal = group.rumah_rr + group.rumah_rs + group.rumah_rb;
  const kecamatan = consistentString(group.kecamatan);
  const kabupaten = consistentString(group.kabupaten);
  const kode_kabupaten = consistentString(group.kode_kabupaten);
  /** @type {Record<string, string | number>} */
  const props = {
    name: kecamatan || group.kode_kecamatan,
    kode_kecamatan: group.kode_kecamatan,
    level: "kecamatan",
    rumah_rr: group.rumah_rr,
    rumah_rs: group.rumah_rs,
    rumah_rb: group.rumah_rb,
    value: group.valueNumericCount > 0 ? group.value : rumahTotal,
    bucket: villageDistributionBucket(rumahTotal),
    source: "dissolve:kode_kecamatan",
  };
  if (kecamatan) props.kecamatan = kecamatan;
  if (kabupaten) props.kabupaten = kabupaten;
  if (kode_kabupaten) props.kode_kabupaten = kode_kabupaten;
  return props;
}
