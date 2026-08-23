import { readFile } from "fs/promises";
import path from "path";

export type PublikasiAuthor = {
  name: string;
  role?: string;
};

export type PublikasiItem = {
  slug: string;
  title: string;
  description: string;
  url: string;
  list_context_url?: string;
  author: PublikasiAuthor;
  published_at: string;
  thumbnail?: string;
  thumbnail_url?: string;
  tags: string[];
  read_time?: number;
  json_ld?: unknown;
  html_content?: string;
  structured_data?: Record<string, unknown>;
  mdx_bundle?: unknown;
};

export type PublikasiMetadata = {
  judul: string;
  deskripsi: string;
  sumber: string;
  list_url?: string;
  catalog_js_url?: string;
  terakhir_diperbarui?: string;
  total_publikasi: number;
};

export type PublikasiFixture = {
  metadata: PublikasiMetadata;
  publikasi: PublikasiItem[];
};

/** List card payload — heavy fields stripped. */
export type PublikasiListItem = Omit<
  PublikasiItem,
  "html_content" | "mdx_bundle" | "json_ld"
>;

export type PublikasiListResponse = {
  metadata: PublikasiMetadata;
  publikasi: PublikasiListItem[];
  source: "fixture";
  tags: string[];
};

export type PublikasiDetailResponse = {
  metadata: PublikasiMetadata;
  item: PublikasiItem;
  source: "fixture";
};

const HEAVY_KEYS = ["html_content", "mdx_bundle", "json_ld"] as const;

let cache: PublikasiFixture | null = null;

export async function loadPublikasiFixture(): Promise<PublikasiFixture> {
  if (cache) return cache;
  const file = path.join(
    process.cwd(),
    "public/fixtures/publikasi-btt.json",
  );
  const raw = await readFile(file, "utf8");
  const data = JSON.parse(raw) as PublikasiFixture;
  cache = {
    metadata: data.metadata,
    publikasi: Array.isArray(data.publikasi) ? data.publikasi : [],
  };
  return cache;
}

export function toListItem(item: PublikasiItem): PublikasiListItem {
  const copy = { ...item };
  for (const key of HEAVY_KEYS) {
    delete (copy as Record<string, unknown>)[key];
  }
  return copy as PublikasiListItem;
}

export function collectTags(items: PublikasiItem[]): string[] {
  const set = new Set<string>();
  for (const item of items) {
    for (const tag of item.tags ?? []) {
      if (tag) set.add(tag);
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export async function getPublikasiList(): Promise<PublikasiListResponse> {
  const data = await loadPublikasiFixture();
  const sorted = [...data.publikasi].sort((a, b) =>
    (b.published_at || "").localeCompare(a.published_at || ""),
  );
  return {
    metadata: data.metadata,
    publikasi: sorted.map(toListItem),
    source: "fixture",
    tags: collectTags(data.publikasi),
  };
}

export async function getPublikasiBySlug(
  slug: string,
): Promise<PublikasiDetailResponse | null> {
  const data = await loadPublikasiFixture();
  const item = data.publikasi.find((p) => p.slug === slug);
  if (!item) return null;
  return {
    metadata: data.metadata,
    item,
    source: "fixture",
  };
}
