/** Exact kab match used by matchesKabScope. Not adm2 normalization. */

export function kabScopeEqualsRow(
  scope: string,
  row: { kode_kabupaten?: string | null; kabupaten?: string | null },
): boolean {
  const kode = row.kode_kabupaten?.trim();
  const nama = row.kabupaten?.trim();
  return kode === scope || nama === scope;
}
