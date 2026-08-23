import type { TypedSupabaseClient } from "@/lib/supabase/server";
import type { ProfilDesaRow } from "@/lib/supabase/types";

const PAGE_SIZE = 1000;

type Filter =
  | { kind: "kode_kecamatan"; value: string }
  | { kind: "kecamatan"; kabupaten?: string; kecamatan: string }
  | { kind: "kode_kabupaten"; value: string }
  | { kind: "kabupaten"; value: string }
  | { kind: "kode_desa"; value: string }
  | { kind: "id"; value: string };

async function fetchPage(
  client: TypedSupabaseClient,
  filter: Filter,
  from: number,
  to: number
): Promise<{ rows: ProfilDesaRow[]; error: string | null }> {
  let query = client.from("profil_desa").select("*");

  switch (filter.kind) {
    case "kode_kecamatan":
      query = query.eq("kode_kecamatan", filter.value);
      break;
    case "kecamatan":
      if (filter.kabupaten) {
        query = query.ilike("kabupaten", filter.kabupaten);
      }
      query = query.ilike("kecamatan", filter.kecamatan);
      break;
    case "kode_kabupaten":
      query = query.eq("kode_kabupaten", filter.value);
      break;
    case "kabupaten":
      query = query.ilike("kabupaten", filter.value);
      break;
    case "kode_desa":
      query = query.eq("kode_desa_kelurahan", filter.value);
      break;
    case "id":
      query = query.eq("id", filter.value);
      break;
  }

  const { data, error } = await query.range(from, to);
  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as ProfilDesaRow[], error: null };
}

export async function fetchProfilDesaRows(
  client: TypedSupabaseClient,
  filter: Filter
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
