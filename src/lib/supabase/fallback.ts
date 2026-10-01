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

/** Why a loader served the fixture instead of Supabase rows. */
export type FallbackReason = "no-client" | "error" | "empty";

export type LoadedWithFallback<T> = Loaded<T> & {
  /** Set only when `source` is `"fixture"`. */
  fallbackReason?: FallbackReason;
};

type FallbackOptions<T> = {
  label?: string;
  isEmpty?: (value: T) => boolean;
  /**
   * Supabase client to read with. When the key is present (even `null`) it is
   * used as-is and the anon `createServerClient()` is never created, so staff
   * loaders read as the signed-in user and RLS decides what comes back.
   */
  client?: TypedSupabaseClient | null;
  /**
   * Called whenever the fixture is served. Default: `console.warn` for errors,
   * and for every fallback when `client` was passed explicitly (staff loaders).
   */
  onFallback?: (info: { label: string; reason: FallbackReason; error?: unknown }) => void;
};

function defaultOnFallback(info: { label: string; reason: FallbackReason; error?: unknown }) {
  if (info.error !== undefined) {
    console.warn(`[trySupabaseThenFixture:${info.label}] fixture fallback (${info.reason})`, info.error);
  } else {
    console.warn(`[trySupabaseThenFixture:${info.label}] fixture fallback (${info.reason})`);
  }
}

/**
 * Try a Supabase loader; on missing client, error, null, or empty, use the fixture.
 * Every fixture fallback is reported through `onFallback` and `fallbackReason`.
 */
export async function trySupabaseThenFixture<T>(
  loadSupabase: (client: TypedSupabaseClient) => Promise<T | null | undefined>,
  loadFixture: () => Promise<T>,
  options?: FallbackOptions<T>
): Promise<LoadedWithFallback<T>> {
  const label = options?.label ?? "domain";
  const explicitClient = options !== undefined && "client" in options;
  const client = explicitClient ? options.client ?? null : createServerClient();

  let reason: FallbackReason = "no-client";
  let error: unknown;
  if (client) {
    try {
      const value = await loadSupabase(client);
      if (value != null && !options?.isEmpty?.(value)) {
        return { data: value, source: "supabase" };
      }
      reason = "empty";
    } catch (err) {
      reason = "error";
      error = err;
    }
  }
  const info = error === undefined ? { label, reason } : { label, reason, error };
  if (options?.onFallback) options.onFallback(info);
  else if (explicitClient || error !== undefined) defaultOnFallback(info);
  return { data: await loadFixture(), source: "fixture", fallbackReason: reason };
}
