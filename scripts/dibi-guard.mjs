/** Keep in sync with src/lib/dibi-guard.ts. Plain ESM so the refresh script runs without tsx. */

export const DIBI_KEJADIAN_DROP_LIMIT = 0.02;

export function sumTahunKejadian(rows) {
  if (!Array.isArray(rows)) return null;
  let sum = 0;
  for (const row of rows) {
    const n = row?.kejadian;
    if (typeof n !== "number" || !Number.isFinite(n)) return null;
    sum += n;
  }
  return sum;
}

export function assessDibiLive(live, baselineKejadian) {
  const total = live?.totals?.kejadian;
  const sum = sumTahunKejadian(live?.by_tahun);
  if (typeof total !== "number" || !Number.isFinite(total) || sum == null || total !== sum) {
    return { ok: false, reason: "year-sum-mismatch" };
  }
  if (!Array.isArray(live?.by_kabupaten) || live.by_kabupaten.length === 0) {
    return { ok: false, reason: "empty-kabupaten" };
  }
  if (
    typeof baselineKejadian === "number" &&
    Number.isFinite(baselineKejadian) &&
    baselineKejadian > 0 &&
    (baselineKejadian - total) / baselineKejadian > DIBI_KEJADIAN_DROP_LIMIT
  ) {
    return { ok: false, reason: "kejadian-drop" };
  }
  return { ok: true };
}
