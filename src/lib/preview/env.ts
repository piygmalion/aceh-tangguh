/** True when the GitHub Pages / static-export build is active. */
export function isStaticExport(): boolean {
  return (
    process.env.NEXT_PUBLIC_STATIC_EXPORT === "1" ||
    process.env.STATIC_EXPORT === "1" ||
    process.env.GITHUB_PAGES === "1" ||
    process.env.NEXT_PUBLIC_GITHUB_PAGES === "1"
  );
}

/** Project Pages base path, e.g. `/aceh-tangguh`. Empty for the Node host. */
export function publicBasePath(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  if (!raw || raw === "/") return "";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

/** Prefix a root-relative public asset path for GitHub Pages (`/aceh-tangguh/...`). */
export function withBasePath(path: string): string {
  if (!path.startsWith("/")) return path;
  const base = publicBasePath();
  if (!base) return path;
  if (path === base || path.startsWith(`${base}/`)) return path;
  return `${base}${path}`;
}
