/**
 * Shared villageDistribution classification.
 * Metric: rumah_rr + rumah_rs + rumah_rb. Do not invent rumah totals.
 * Quintiles are locked from positive desa totals in the committed fixture (n=172).
 */

export const VILLAGE_DISTRIBUTION_BUCKETS = Object.freeze([
  "sangat_rendah",
  "rendah",
  "sedang",
  "tinggi",
  "sangat_tinggi",
  "belum_diketahui",
]);

/** Positive-only quintile breaks (20 / 40 / 60 / 80 %). */
export const VILLAGE_DISTRIBUTION_QUINTILES = Object.freeze({
  q1: 20,
  q2: 191,
  q3: 731,
  q4: 2849,
});

export const CHOROPLETH_DAMAGED_HOME = Object.freeze({
  sangat_rendah: "#C5D2B8",
  rendah: "#8A9A5B",
  sedang: "#C4A35A",
  tinggi: "#FF7722",
  sangat_tinggi: "#B42318",
  belum_diketahui: "#52524B",
});

/**
 * @param {unknown} value
 * @returns {number | null}
 */
export function nullableNumber(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {unknown} rr
 * @param {unknown} rs
 * @param {unknown} rb
 * @returns {number}
 */
export function rumahTotal(rr, rs, rb) {
  return (nullableNumber(rr) ?? 0) + (nullableNumber(rs) ?? 0) + (nullableNumber(rb) ?? 0);
}

/**
 * Leftover without a BPS village kode, or all three rumah fields null.
 *
 * @param {{ kodeDesa?: unknown, rumah_rr?: unknown, rumah_rs?: unknown, rumah_rb?: unknown }} props
 */
export function isUnknownVillageBucket(props) {
  const kode = props?.kodeDesa == null ? "" : String(props.kodeDesa).trim();
  if (!kode || kode === "null" || kode === "undefined") return true;
  const rr = nullableNumber(props.rumah_rr);
  const rs = nullableNumber(props.rumah_rs);
  const rb = nullableNumber(props.rumah_rb);
  return rr == null && rs == null && rb == null;
}

/**
 * @param {unknown} total
 * @param {{ unknown?: boolean }} [opts]
 * @returns {(typeof VILLAGE_DISTRIBUTION_BUCKETS)[number]}
 */
export function villageDistributionBucket(total, opts = {}) {
  if (opts.unknown) return "belum_diketahui";
  const n = Number(total);
  const value = Number.isFinite(n) ? n : 0;
  if (value <= VILLAGE_DISTRIBUTION_QUINTILES.q1) return "sangat_rendah";
  if (value <= VILLAGE_DISTRIBUTION_QUINTILES.q2) return "rendah";
  if (value <= VILLAGE_DISTRIBUTION_QUINTILES.q3) return "sedang";
  if (value <= VILLAGE_DISTRIBUTION_QUINTILES.q4) return "tinggi";
  return "sangat_tinggi";
}

/**
 * @param {number[]} positives
 * @returns {{ q1: number, q2: number, q3: number, q4: number }}
 */
export function quintileBreaks(positives) {
  const sorted = positives.filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  if (sorted.length === 0) {
    return { q1: 0, q2: 0, q3: 0, q4: 0 };
  }
  const at = (p) => {
    const i = Math.max(0, Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1));
    return sorted[i];
  };
  return { q1: at(0.2), q2: at(0.4), q3: at(0.6), q4: at(0.8) };
}

/**
 * @param {Record<string, unknown> | null | undefined} props
 */
export function bucketFromVillageProps(props) {
  const p = props ?? {};
  const unknown = isUnknownVillageBucket({
    kodeDesa: p.kode_desa_kelurahan,
    rumah_rr: p.rumah_rr,
    rumah_rs: p.rumah_rs,
    rumah_rb: p.rumah_rb,
  });
  return villageDistributionBucket(rumahTotal(p.rumah_rr, p.rumah_rs, p.rumah_rb), {
    unknown,
  });
}

export function normalizeKabupatenName(value) {
  const name = value == null ? "" : String(value).trim();
  if (!name) return "";
  if (name === "Kota Langsa") return "Langsa";
  if (name === "Kota Sabang") return "Sabang";
  return name;
}

/**
 * Sum RR+RS+RB by existing kabupaten name. Do not regroup by sliced kode —
 * some village rows already carry a kabupaten name that disagrees with the
 * 4-digit prefix, and this ticket does not invent replacement BPS codes.
 *
 * @param {Array<{ properties?: Record<string, unknown> | null }>} features
 */
export function groupVillageTotalsByKabupatenName(features) {
  /** @type {Map<string, { rumah_rr: number, rumah_rs: number, rumah_rb: number, value: number }>} */
  const totals = new Map();
  for (const feature of features ?? []) {
    const props = feature?.properties ?? {};
    const name = normalizeKabupatenName(props.kabupaten);
    if (!name) continue;
    const cur = totals.get(name) ?? { rumah_rr: 0, rumah_rs: 0, rumah_rb: 0, value: 0 };
    cur.rumah_rr += nullableNumber(props.rumah_rr) ?? 0;
    cur.rumah_rs += nullableNumber(props.rumah_rs) ?? 0;
    cur.rumah_rb += nullableNumber(props.rumah_rb) ?? 0;
    cur.value = cur.rumah_rr + cur.rumah_rs + cur.rumah_rb;
    totals.set(name, cur);
  }
  return totals;
}

export function villageDistributionLegendItems() {
  const q = VILLAGE_DISTRIBUTION_QUINTILES;
  return [
    { color: CHOROPLETH_DAMAGED_HOME.sangat_rendah, label: `Sangat rendah (≤${q.q1})` },
    { color: CHOROPLETH_DAMAGED_HOME.rendah, label: `Rendah (≤${q.q2})` },
    { color: CHOROPLETH_DAMAGED_HOME.sedang, label: `Sedang (≤${q.q3})` },
    { color: CHOROPLETH_DAMAGED_HOME.tinggi, label: `Tinggi (≤${q.q4})` },
    { color: CHOROPLETH_DAMAGED_HOME.sangat_tinggi, label: `Sangat tinggi (>${q.q4})` },
    { color: CHOROPLETH_DAMAGED_HOME.belum_diketahui, label: "Belum diketahui" },
  ];
}
