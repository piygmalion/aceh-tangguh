import { kabupatenQueryCandidates } from "@/lib/kabupaten-join";
import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { ProfilDesaRow } from "@/lib/supabase/types";

const PAGE_SIZE = 1000;

function kabupatenIlikeFilter(raw: string): string | null {
  const candidates = kabupatenQueryCandidates(raw);
  if (candidates.length === 0) return null;
  return candidates
    .map((value) => `kabupaten.ilike."${value.replace(/"/g, "")}"`)
    .join(",");
}

export type ProfilDesaFilter =
  | { kind: "kode_kecamatan"; value: string }
  | { kind: "kecamatan"; kabupaten?: string; kecamatan: string }
  | { kind: "kode_kabupaten"; value: string }
  | { kind: "kabupaten"; value: string }
  | { kind: "kode_desa"; value: string }
  | { kind: "id"; value: string }
  | {
      kind: "nama";
      nama: string;
      kabupaten?: string;
      kecamatan?: string;
    };

async function fetchPage(
  client: TypedSupabaseClient,
  filter: ProfilDesaFilter,
  from: number,
  to: number
): Promise<{ rows: ProfilDesaRow[]; error: string | null }> {
  let query = client.from("profil_desa").select("*");

  switch (filter.kind) {
    case "kode_kecamatan":
      query = query.eq("kode_kecamatan", filter.value);
      break;
    case "kecamatan": {
      const kabFilter = filter.kabupaten
        ? kabupatenIlikeFilter(filter.kabupaten)
        : null;
      if (kabFilter) query = query.or(kabFilter);
      query = query.ilike("kecamatan", filter.kecamatan);
      break;
    }
    case "kode_kabupaten":
      query = query.eq("kode_kabupaten", filter.value);
      break;
    case "kabupaten": {
      const kabFilter = kabupatenIlikeFilter(filter.value);
      if (kabFilter) query = query.or(kabFilter);
      break;
    }
    case "kode_desa":
      query = query.eq("kode_desa_kelurahan", filter.value);
      break;
    case "id":
      query = query.eq("id", filter.value);
      break;
    case "nama": {
      query = query.ilike("nama", filter.nama);
      const kabFilter = filter.kabupaten
        ? kabupatenIlikeFilter(filter.kabupaten)
        : null;
      if (kabFilter) query = query.or(kabFilter);
      if (filter.kecamatan) query = query.ilike("kecamatan", filter.kecamatan);
      break;
    }
  }

  const { data, error } = await query.range(from, to);
  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as ProfilDesaRow[], error: null };
}

export async function fetchProfilDesaRows(
  client: TypedSupabaseClient,
  filter: ProfilDesaFilter
): Promise<{ rows: ProfilDesaRow[]; error: string | null }> {
  const all: ProfilDesaRow[] = [];
  let from = 0;
  while (true) {
    const { rows, error } = await fetchPage(client, filter, from, from + PAGE_SIZE - 1);
    if (error) return { rows: [], error };
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return { rows: all, error: null };
}

/**
 * Prefer kabupaten+kecamatan names (map props). Use kode_kecamatan only
 * when names miss, or when names were not provided.
 */
export async function resolveKecamatanRows(
  client: TypedSupabaseClient,
  opts: { kabupaten?: string; kecamatan?: string; kodeKecamatan?: string }
): Promise<{ rows: ProfilDesaRow[]; error: string | null }> {
  const kabupaten = opts.kabupaten?.trim() || "";
  const kecamatan = opts.kecamatan?.trim() || "";
  const kodeKecamatan = opts.kodeKecamatan?.trim() || "";

  if (kabupaten && kecamatan) {
    const named = await fetchProfilDesaRows(client, {
      kind: "kecamatan",
      kabupaten,
      kecamatan,
    });
    if (named.error || named.rows.length > 0) return named;
    if (kodeKecamatan) {
      return fetchProfilDesaRows(client, {
        kind: "kode_kecamatan",
        value: kodeKecamatan,
      });
    }
    return named;
  }

  if (kodeKecamatan) {
    return fetchProfilDesaRows(client, {
      kind: "kode_kecamatan",
      value: kodeKecamatan,
    });
  }

  if (kecamatan) {
    return fetchProfilDesaRows(client, { kind: "kecamatan", kecamatan });
  }

  return { rows: [], error: null };
}

/**
 * Desa lookup: id (always unique), then kode (nullable for 4 rows),
 * then nama + kabupaten/kecamatan.
 */
export async function resolveDesaRow(
  client: TypedSupabaseClient,
  opts: {
    id?: string;
    kode?: string;
    nama?: string;
    kabupaten?: string;
    kecamatan?: string;
  }
): Promise<{ row: ProfilDesaRow | null; error: string | null }> {
  const id = opts.id?.trim() || "";
  const kode = opts.kode?.trim() || "";
  const nama = opts.nama?.trim() || "";

  if (id) {
    const byId = await fetchProfilDesaRows(client, { kind: "id", value: id });
    if (byId.error) return { row: null, error: byId.error };
    if (byId.rows[0]) return { row: byId.rows[0], error: null };
  }

  if (kode) {
    const byKode = await fetchProfilDesaRows(client, {
      kind: "kode_desa",
      value: kode,
    });
    if (byKode.error) return { row: null, error: byKode.error };
    if (byKode.rows[0]) return { row: byKode.rows[0], error: null };
  }

  if (nama) {
    const byNama = await fetchProfilDesaRows(client, {
      kind: "nama",
      nama,
      kabupaten: opts.kabupaten?.trim() || undefined,
      kecamatan: opts.kecamatan?.trim() || undefined,
    });
    if (byNama.error) return { row: null, error: byNama.error };
    if (byNama.rows.length === 1) return { row: byNama.rows[0], error: null };
    const exact = byNama.rows.find(
      (r) => r.nama.trim().toLowerCase() === nama.toLowerCase()
    );
    if (exact) return { row: exact, error: null };
  }

  return { row: null, error: null };
}
