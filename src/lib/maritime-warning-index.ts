import { createServerClient } from "@/lib/supabase/server";
import { MARITIME_WARNING_STATUS_ID } from "@/lib/peringatan-dini-types";

export type MaritimeWarningIndexRow = {
  kode: string;
  wave_cat: string;
  wave_min_m: number | null;
  wave_max_m: number | null;
};

export type MaritimeWarningStatus = {
  ok: boolean;
  fetched_at: string | null;
  expires_at: string | null;
  stale: boolean;
  source_url: string | null;
};

function isExpired(expiresAt: string | null | undefined, nowMs = Date.now()): boolean {
  if (!expiresAt) return false;
  const ms = Date.parse(expiresAt);
  return Number.isFinite(ms) && ms < nowMs;
}

export async function readMaritimeWarningStatus(): Promise<MaritimeWarningStatus | null> {
  const client = createServerClient();
  if (!client) return null;
  const { data, error } = await client
    .from("maritime_warning_cache")
    .select("wave_cat, fetched_at, expires_at, payload, source_url")
    .eq("external_id", MARITIME_WARNING_STATUS_ID)
    .maybeSingle();
  if (error || !data) return null;
  const payload = (data.payload ?? {}) as { ok?: boolean; source_url?: string };
  return {
    ok: data.wave_cat === "ok" || payload.ok === true,
    fetched_at: data.fetched_at ?? null,
    expires_at: data.expires_at ?? null,
    stale: isExpired(data.expires_at),
    source_url: data.source_url ?? payload.source_url ?? null,
  };
}

export async function readMaritimeWarningIndex(): Promise<Record<string, MaritimeWarningIndexRow>> {
  const client = createServerClient();
  if (!client) return {};
  const { data, error } = await client
    .from("maritime_warning_cache")
    .select("kode, wave_cat, wave_min_m, wave_max_m, external_id")
    .neq("external_id", MARITIME_WARNING_STATUS_ID);
  if (error || !data) return {};
  const out: Record<string, MaritimeWarningIndexRow> = {};
  for (const row of data) {
    const kode = String(row.kode ?? "").trim();
    if (!kode) continue;
    out[kode] = {
      kode,
      wave_cat: String(row.wave_cat ?? ""),
      wave_min_m: typeof row.wave_min_m === "number" ? row.wave_min_m : null,
      wave_max_m: typeof row.wave_max_m === "number" ? row.wave_max_m : null,
    };
  }
  return out;
}
