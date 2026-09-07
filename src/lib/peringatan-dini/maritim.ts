import { ACEH_PERAIRAN_CODES } from "@/lib/overlay-layers";
import { maritimeExpiresAt } from "@/lib/maritime";
import { readMaritimeWarningStatus } from "@/lib/maritime-warning-index";
import {
  MARITIME_WARNING_STATUS_ID,
  type MaritimCard,
  type PeringatanSource,
} from "@/lib/peringatan-dini-types";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import {
  buildMaritimCardFromWaters,
  filterAcehBulletinWaters,
  parsePdgtBulletin,
  PDGT_NASIONAL_URL,
  unavailableMaritimCard,
  type ParsedPdgt,
  type ParsedPdgtWater,
} from "./maritim-parse";

const UA =
  "AcehTangguh/0.1 (+https://github.com/piygmalion/aceh-tangguh; BMKG Maritim PDGT)";

const WARNING_JSON_CANDIDATES = [
  "https://maritim.bmkg.go.id/marine2026-data/warning/latest.json",
  "https://maritim.bmkg.go.id/marine2026-data/warning/gelombang.json",
] as const;

export type MaritimeWarningRefresh = {
  ok: boolean;
  source: string;
  count: number;
  error?: string;
};

function waterExternalId(water: ParsedPdgtWater, parsed: ParsedPdgt): string {
  const slug = (water.kode ?? water.nama).toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  return `${parsed.no_surat ?? "pdgt"}:${slug}:${parsed.valid_from ?? "open"}`;
}

export async function getMaritimPeringatan(): Promise<MaritimCard> {
  const fetchedAt = new Date().toISOString();
  const client = createServerClient();
  if (!client) return unavailableMaritimCard(fetchedAt);

  const status = await readMaritimeWarningStatus();
  if (!status) return unavailableMaritimCard(fetchedAt);
  if (!status.ok) return unavailableMaritimCard(status.fetched_at ?? fetchedAt);

  const { data, error } = await client
    .from("maritime_warning_cache")
    .select("kode, nama, wave_cat, wave_min_m, wave_max_m, valid_from, valid_to, issued, no_surat")
    .neq("external_id", MARITIME_WARNING_STATUS_ID);
  if (error) return unavailableMaritimCard(fetchedAt);

  const waters: ParsedPdgtWater[] = (data ?? [])
    .filter((row) => {
      const kode = row.kode ? String(row.kode) : null;
      return !kode || (ACEH_PERAIRAN_CODES as readonly string[]).includes(kode);
    })
    .map((row) => ({
      nama: String(row.nama ?? row.kode ?? ""),
      wave_cat: String(row.wave_cat ?? ""),
      wave_min_m: typeof row.wave_min_m === "number" ? row.wave_min_m : null,
      wave_max_m: typeof row.wave_max_m === "number" ? row.wave_max_m : null,
      section: row.kode === "M.01" || row.kode === "M.03" ? "indonesia" : "aceh",
      kode: row.kode ? String(row.kode) : null,
    }));

  const source: PeringatanSource = "live";
  const first = data?.[0];
  const card = buildMaritimCardFromWaters(waters, {
    fetchedAt: status.fetched_at ?? fetchedAt,
    source,
    valid_from: first?.valid_from ?? null,
    valid_to: first?.valid_to ?? null,
    issued: first?.issued ?? null,
    no_surat: first?.no_surat ?? null,
  });
  return { ...card, stale: status.stale };
}

async function fetchText(
  url: string,
  accept: string,
  timeoutMs: number,
): Promise<{ ok: boolean; status: number; text: string }> {
  const res = await fetch(url, {
    headers: { Accept: accept, "User-Agent": UA },
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

async function tryWarningJson(): Promise<ParsedPdgt | null> {
  for (const url of WARNING_JSON_CANDIDATES) {
    try {
      const res = await fetchText(url, "application/json", 8_000);
      if (!res.ok) continue;
      const data = JSON.parse(res.text) as unknown;
      if (!data || typeof data !== "object") continue;
      const blob = JSON.stringify(data);
      if (blob.length < 8) continue;
      const parsed = parsePdgtBulletin(blob);
      if (filterAcehBulletinWaters(parsed).length > 0 || parsed.waters.length > 0) {
        return parsed;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export async function refreshMaritimeWarnings(): Promise<MaritimeWarningRefresh> {
  const client = createServiceClient();
  const now = new Date();
  const fetchedAt = now.toISOString();
  const expiresAt = maritimeExpiresAt(now.getTime());

  const writeStatus = async (ok: boolean, source: string, count: number, error?: string) => {
    if (!client) return;
    await client.from("maritime_warning_cache").upsert({
      external_id: MARITIME_WARNING_STATUS_ID,
      kode: null,
      nama: "",
      wave_cat: ok ? "ok" : "failed",
      wave_min_m: null,
      wave_max_m: null,
      valid_from: null,
      valid_to: null,
      issued: null,
      no_surat: null,
      sinoptik: null,
      source_url: source,
      payload: { ok, source_url: source, count, error: error ?? null } as unknown as Json,
      fetched_at: fetchedAt,
      expires_at: expiresAt,
    });
  };

  try {
    let parsed = await tryWarningJson();
    let source = "warning-json";
    if (!parsed) {
      const page = await fetchText(PDGT_NASIONAL_URL, "text/html,text/markdown;q=0.9", 15_000);
      if (!page.ok || !page.text.trim()) {
        throw new Error(`PDGT ${page.status}`);
      }
      parsed = parsePdgtBulletin(page.text);
      source = PDGT_NASIONAL_URL;
    }

    const waters = filterAcehBulletinWaters(parsed);
    if (!client) {
      return { ok: true, source, count: waters.length, error: "no-service-role" };
    }

    await client.from("maritime_warning_cache").delete().neq("external_id", MARITIME_WARNING_STATUS_ID);

    if (waters.length > 0) {
      await client.from("maritime_warning_cache").upsert(
        waters.map((water) => ({
          external_id: waterExternalId(water, parsed),
          kode: water.kode,
          nama: water.nama,
          wave_cat: water.wave_cat,
          wave_min_m: water.wave_min_m,
          wave_max_m: water.wave_max_m,
          valid_from: parsed.valid_from,
          valid_to: parsed.valid_to,
          issued: parsed.issued,
          no_surat: parsed.no_surat,
          sinoptik: parsed.sinoptik,
          source_url: source,
          payload: water as unknown as Json,
          fetched_at: fetchedAt,
          expires_at: expiresAt,
        })),
      );
    }

    await writeStatus(true, source, waters.length);
    return { ok: true, source, count: waters.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "warning-refresh-failed";
    console.error("[maritime-warning]", err);
    await writeStatus(false, PDGT_NASIONAL_URL, 0, message);
    return { ok: false, source: PDGT_NASIONAL_URL, count: 0, error: message };
  }
}
