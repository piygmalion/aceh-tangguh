export const CMS_COVER_URL_COLUMNS = [
  "foto_sampul_url",
  "foto_sampul_thumbnail_url",
] as const;

export function isCmsCoverUrlColumn(key: string): boolean {
  return (CMS_COVER_URL_COLUMNS as readonly string[]).includes(key);
}
