import { readFile } from "fs/promises";
import path from "path";
import {
  asRecord,
  fetchAllRows,
  trySupabaseThenFixture,
  type DomainSource,
} from "./supabase/fallback";
import type { TypedSupabaseClient } from "./supabase/server";
import type { PublikasiMetaRow, PublikasiRow } from "./supabase/types";

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
  source: "supabase" | "fixture";
  tags: string[];
};

export type PublikasiDetailResponse = {
  metadata: PublikasiMetadata;
  item: PublikasiItem;
  source: "supabase" | "fixture";
};

const HEAVY_KEYS = ["html_content", "mdx_bundle", "json_ld"] as const;

const FALLBACK_META: PublikasiMetadata = {
  judul: "Publikasi Tanggapi",
  deskripsi: "",
  sumber: "Supabase",
  total_publikasi: 0,
};

let cache: PublikasiFixture | null = null;

function asMetadata(payload: unknown): PublikasiMetadata | null {
  const rec = asRecord(payload);
  if (typeof rec.judul !== "string" && typeof rec.total_publikasi !== "number") {
    return null;
  }
  return rec as unknown as PublikasiMetadata;
}

function publikasiFromRow(row: PublikasiRow): PublikasiItem {
  const payload = asRecord(row.payload) as Partial<PublikasiItem>;
  const published = payload.published_at || row.published_at || "";
  return {
    ...(payload as PublikasiItem),
    slug: row.slug,
    title: payload.title || row.title,
    description: payload.description ?? row.description ?? "",
    published_at: typeof published === "string" ? published : String(published),
    tags: payload.tags ?? row.tags ?? [],
    url: payload.url || "",
    author: payload.author ?? { name: "" },
  };
}

async function loadPublikasiFromSupabase(
  client: TypedSupabaseClient
): Promise<PublikasiFixture | null> {
  const { data: metaRow, error: metaError } = await client
    .from("publikasi_meta")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (metaError) throw new Error(metaError.message);

  const rows = await fetchAllRows<PublikasiRow>((from, to) =>
    client.from("publikasi").select("*").range(from, to)
  );
  if (rows.length === 0) return null;

  const metadata =
    asMetadata((metaRow as PublikasiMetaRow | null)?.payload) ?? {
      ...FALLBACK_META,
      total_publikasi: rows.length,
    };

  return {
    metadata: { ...metadata, total_publikasi: rows.length },
    publikasi: rows.map(publikasiFromRow),
  };
}

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

export async function loadPublikasi(): Promise<{
  data: PublikasiFixture;
  source: DomainSource;
}> {
  return trySupabaseThenFixture(loadPublikasiFromSupabase, loadPublikasiFixture, {
    label: "publikasi",
    isEmpty: (value) => value.publikasi.length === 0,
  });
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
  const { data, source } = await loadPublikasi();
  const sorted = [...data.publikasi].sort((a, b) =>
    (b.published_at || "").localeCompare(a.published_at || ""),
  );
  return {
    metadata: data.metadata,
    publikasi: sorted.map(toListItem),
    source,
    tags: collectTags(data.publikasi),
  };
}

export async function getPublikasiBySlug(
  slug: string,
): Promise<PublikasiDetailResponse | null> {
  const { data, source } = await loadPublikasi();
  const item = data.publikasi.find((p) => p.slug === slug);
  if (!item) return null;
  return {
    metadata: data.metadata,
    item,
    source,
  };
}
