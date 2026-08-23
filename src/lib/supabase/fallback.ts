import { createServerClient, type TypedSupabaseClient } from "./server";

export type DomainSource = "supabase" | "fixture";

export type Loaded<T> = {
  data: T;
  source: DomainSource;
};

const PAGE_SIZE = 1000;

export function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

export function isNonEmptyArray<T>(value: T[] | null | undefined): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * Page through a PostgREST select (default max 1000 rows per request).
 */
export async function fetchAllRows<T>(
  query: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await query(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    out.push(...data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return out;
}

/** Read a JSON snapshot from `irbi_documents` or `data_documents` by preferred key order. */
export async function readDocumentPayload(
  client: TypedSupabaseClient,
  table: "irbi_documents" | "data_documents",
  keys: string[]
): Promise<unknown | null> {
  if (keys.length === 0) return null;
  const { data, error } = await client
    .from(table)
    .select("key, payload")
    .in("key", keys);

  if (error || !data?.length) return null;
  for (const key of keys) {
    const row = data.find((r) => r.key === key);
    if (row) return row.payload;
  }
  return data[0]?.payload ?? null;
}

/**
 * Try a Supabase loader; on missing client, error, null, or empty, use the fixture.
 */
export async function trySupabaseThenFixture<T>(
  loadSupabase: (client: TypedSupabaseClient) => Promise<T | null | undefined>,
  loadFixture: () => Promise<T>,
  options?: { label?: string; isEmpty?: (value: T) => boolean }
): Promise<Loaded<T>> {
  const client = createServerClient();
  if (client) {
    try {
      const value = await loadSupabase(client);
      if (value != null && !options?.isEmpty?.(value)) {
        return { data: value, source: "supabase" };
      }
    } catch (err) {
      const label = options?.label ?? "domain";
      console.warn(`[trySupabaseThenFixture:${label}]`, err);
    }
  }
  return { data: await loadFixture(), source: "fixture" };
}
