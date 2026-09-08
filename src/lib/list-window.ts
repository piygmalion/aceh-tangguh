/** Offset window for list pagers. Empty catalogues show 0–0, not 1–0. */
export function listWindow(page: number, pageSize: number, total: number) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  return { from, to, total };
}
