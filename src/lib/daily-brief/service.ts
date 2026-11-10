import { getPeringatanDini } from "@/lib/peringatan-dini/service";
import { encryptPii, decryptPii } from "@/lib/laporan/crypto";
import {
  normalizeWhatsAppPhone,
  sendWhatsAppGateway,
} from "@/lib/laporan/whatsapp";
import { createServerClient, createServiceClient } from "@/lib/supabase/server";
import type { DailyBriefSubscriberStatus } from "@/lib/sik/db-tables";
import { todayJakartaYmd } from "@/lib/sik/kunci-statis";
import type { Json } from "@/lib/supabase/json";
import {
  buildDailyBriefWhatsApp,
  composeDailyBrief,
  maskWhatsAppPhone,
  parseBriefYmd,
  type DailyBriefFeedKind,
  type DailyBriefSummary,
  type HotspotBriefItem,
  type KejadianBriefItem,
  type LiveStatsInput,
  type OverlayQuakeInput,
  type OverlayQuakeRow,
  type SubscriberPublic,
} from "./compose";

export type { SubscriberPublic } from "./compose";

export function jakartaDayUtcBounds(briefDate: string): { from: string; to: string } {
  const from = new Date(`${briefDate}T00:00:00+07:00`);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return { from: from.toISOString(), to: to.toISOString() };
}

export function previousJakartaYmd(briefDate: string): string {
  const noon = new Date(`${briefDate}T12:00:00+07:00`);
  return todayJakartaYmd(new Date(noon.getTime() - 24 * 60 * 60 * 1000));
}

function asText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length ? text : null;
}

function asProps(value: Json | null | undefined): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function mapOverlayQuake(row: {
  latitude: number;
  longitude: number;
  occurred_at: string | null;
  properties: Json;
}): OverlayQuakeRow {
  const props = asProps(row.properties);
  return {
    title: asText(props.title),
    magnitude: asText(props.magnitude ?? props.status),
    depth: asText(props.kedalaman ?? props.depth),
    occurredAt: row.occurred_at,
    lat: row.latitude,
    lng: row.longitude,
  };
}

function mapHotspotCoord(row: {
  latitude: number;
  longitude: number;
  properties: Json;
}): HotspotBriefItem | null {
  const props = asProps(row.properties);
  const titleParts = asText(props.title)
    ?.split(",")
    .map((part) => part.trim())
    .filter(Boolean) ?? [];
  const desa = asText(props.desa) ?? titleParts[0] ?? null;
  const kecamatan = asText(props.kecamatan) ?? titleParts[1] ?? null;
  const kabkota = asText(props.kabkota) ?? titleParts[2] ?? null;
  if (!desa || !kecamatan || !kabkota) return null;
  const confidenceRaw = (asText(props.confidence_level) ?? asText(props.status) ?? "").toLowerCase();
  const confidence: "medium" | "high" = confidenceRaw === "high" ? "high" : "medium";
  return {
    kabkota,
    kecamatan,
    desa,
    confidence,
    tanggal: asText(props.tanggal) ?? asText(props.date_hotspot) ?? "",
    lat: row.latitude,
    lng: row.longitude,
  };
}

export async function countBmkgQuakesForDate(briefDate: string): Promise<OverlayQuakeInput> {
  const client = createServiceClient() ?? createServerClient();
  if (!client) return { queryOk: false, count: null };
  const { from, to } = jakartaDayUtcBounds(briefDate);
  const { count, error } = await client
    .from("overlay_live_features")
    .select("id", { count: "exact", head: true })
    .eq("layer_key", "bmkgQuakes")
    .gte("occurred_at", from)
    .lt("occurred_at", to);
  if (error || count == null) return { queryOk: false, count: null };
  return { queryOk: true, count };
}

export async function listBmkgQuakesForDate(briefDate: string): Promise<OverlayQuakeRow[]> {
  const client = createServiceClient() ?? createServerClient();
  if (!client) return [];
  const { from, to } = jakartaDayUtcBounds(briefDate);
  const { data, error } = await client
    .from("overlay_live_features")
    .select("latitude, longitude, occurred_at, properties")
    .eq("layer_key", "bmkgQuakes")
    .gte("occurred_at", from)
    .lt("occurred_at", to)
    .order("occurred_at", { ascending: false })
    .limit(5);
  if (error || !data) return [];
  return data.map(mapOverlayQuake);
}

export async function loadSipongiHotspotCoords(): Promise<HotspotBriefItem[]> {
  const client = createServiceClient() ?? createServerClient();
  if (!client) return [];
  const { data, error } = await client
    .from("overlay_live_features")
    .select("latitude, longitude, properties")
    .eq("layer_key", "sipongiHotspots")
    .limit(200);
  if (error || !data) return [];
  return data.map(mapHotspotCoord).filter((row): row is HotspotBriefItem => row != null);
}

export async function loadLiveStatsForBrief(): Promise<LiveStatsInput> {
  const client = createServiceClient() ?? createServerClient();
  if (!client) return { rowOk: false, activeIncidents: null };
  const { data, error } = await client.from("live_stats").select("active_incidents").eq("id", 1).maybeSingle();
  if (error || !data) return { rowOk: false, activeIncidents: null };
  return { rowOk: true, activeIncidents: data.active_incidents };
}

export async function loadActiveKejadian(): Promise<{
  stats: LiveStatsInput;
  items: KejadianBriefItem[] | undefined;
}> {
  const client = createServiceClient() ?? createServerClient();
  if (!client) {
    return { stats: await loadLiveStatsForBrief(), items: undefined };
  }
  const query = client
    .from("kejadian_operasi")
    .select(
      "id, nomor, jenis_bencana, nama_kejadian, status, kabupaten, kecamatan, desa_ringkas, waktu_kejadian, latitude, longitude",
      { count: "exact" }
    )
    .eq("status", "aktif")
    .order("waktu_kejadian", { ascending: false })
    .limit(5);
  const { data, error, count } = await query;
  if (error) {
    return { stats: await loadLiveStatsForBrief(), items: undefined };
  }
  const items: KejadianBriefItem[] = (data ?? []).map((row) => ({
    id: row.id,
    nomor: row.nomor,
    jenis: row.jenis_bencana,
    nama: row.nama_kejadian,
    status: row.status,
    kabupaten: row.kabupaten,
    kecamatan: row.kecamatan,
    desa: row.desa_ringkas,
    waktu: row.waktu_kejadian,
    lat: row.latitude,
    lng: row.longitude,
  }));
  return {
    stats: { rowOk: true, activeIncidents: count ?? items.length },
    items,
  };
}

export async function loadYesterdayCounts(briefDate: string): Promise<{
  yesterdayDate: string | null;
  yesterdayCounts: Partial<Record<DailyBriefFeedKind, number | null>> | null;
}> {
  const client = createServiceClient() ?? createServerClient();
  const yesterdayDate = previousJakartaYmd(briefDate);
  if (!client) return { yesterdayDate: null, yesterdayCounts: null };
  const { data, error } = await client
    .from("daily_briefs")
    .select("summary")
    .eq("brief_date", yesterdayDate)
    .maybeSingle();
  if (error || !data?.summary || typeof data.summary !== "object") {
    return { yesterdayDate: null, yesterdayCounts: null };
  }
  const summary = data.summary as DailyBriefSummary;
  if (!Array.isArray(summary.feeds)) {
    return { yesterdayDate: null, yesterdayCounts: null };
  }
  const yesterdayCounts: Partial<Record<DailyBriefFeedKind, number | null>> = {};
  for (const feed of summary.feeds) {
    yesterdayCounts[feed.kind] = feed.count;
  }
  return { yesterdayDate, yesterdayCounts };
}

export async function buildTodaySummary(briefDate: string): Promise<DailyBriefSummary> {
  const [peringatan, gempa, overlayQuakes, hotspotCoords, kejadianLoad, yesterday] = await Promise.all([
    getPeringatanDini(),
    countBmkgQuakesForDate(briefDate),
    listBmkgQuakesForDate(briefDate),
    loadSipongiHotspotCoords(),
    loadActiveKejadian(),
    loadYesterdayCounts(briefDate),
  ]);
  return composeDailyBrief({
    briefDate,
    composedAt: new Date().toISOString(),
    peringatan,
    gempa,
    overlayQuakes: gempa.queryOk ? overlayQuakes : [],
    hotspotCoords,
    kejadian: kejadianLoad.stats,
    kejadianItems: kejadianLoad.items,
    yesterdayDate: yesterday.yesterdayDate,
    yesterdayCounts: yesterday.yesterdayCounts,
  });
}

export async function loadPublicBrief(ymd: string): Promise<DailyBriefSummary | null> {
  const briefDate = parseBriefYmd(ymd);
  if (!briefDate) return null;
  const client = createServerClient() ?? createServiceClient();
  if (!client) return null;
  const { data, error } = await client
    .from("daily_briefs")
    .select("summary")
    .eq("brief_date", briefDate)
    .maybeSingle();
  if (error || !data) return null;
  const summary = data.summary as DailyBriefSummary;
  if (!summary || typeof summary !== "object" || !Array.isArray(summary.feeds)) return null;
  return summary;
}

export async function upsertDailyBrief(
  briefDate: string,
  options: { force?: boolean } = {}
): Promise<{ summary: DailyBriefSummary; created: boolean }> {
  const client = createServiceClient();
  if (!client) throw new Error("Supabase service role missing");

  if (!options.force) {
    const { data: existing } = await client
      .from("daily_briefs")
      .select("summary")
      .eq("brief_date", briefDate)
      .maybeSingle();
    if (existing?.summary && typeof existing.summary === "object") {
      return { summary: existing.summary as DailyBriefSummary, created: false };
    }
  }

  const summary = await buildTodaySummary(briefDate);
  const sources = {
    cuaca: summary.feeds.find((f) => f.kind === "cuaca")?.availability,
    magma: summary.feeds.find((f) => f.kind === "magma")?.availability,
    sipongi: summary.feeds.find((f) => f.kind === "sipongi")?.availability,
    tatonas: summary.feeds.find((f) => f.kind === "tatonas")?.availability,
    gempa: summary.feeds.find((f) => f.kind === "gempa")?.availability,
    kejadian: summary.feeds.find((f) => f.kind === "kejadian")?.availability,
  };

  const { error } = await client.from("daily_briefs").upsert(
    {
      brief_date: briefDate,
      summary,
      sources,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "brief_date" }
  );
  if (error) throw new Error(error.message);
  return { summary, created: true };
}

function phoneFromEnc(phoneEnc: string): string | null {
  try {
    return decryptPii(phoneEnc);
  } catch {
    return null;
  }
}

export async function listSubscribers(): Promise<SubscriberPublic[]> {
  const client = createServiceClient();
  if (!client) throw new Error("Supabase service role missing");
  const { data, error } = await client
    .from("daily_brief_subscribers")
    .select("id, name, status, phone_enc, subscribed_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const phone = phoneFromEnc(row.phone_enc);
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      phoneMasked: phone ? maskWhatsAppPhone(phone) : "***",
      subscribedAt: row.subscribed_at,
    };
  });
}

export async function exportSubscriberCsv(): Promise<string> {
  const client = createServiceClient();
  if (!client) throw new Error("Supabase service role missing");
  const { data, error } = await client
    .from("daily_brief_subscribers")
    .select("id, name, status, phone_enc, subscribed_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const header = "id,name,status,phone,subscribed_at";
  const lines = (data ?? []).map((row) => {
    const phone = phoneFromEnc(row.phone_enc) ?? "";
    const name = (row.name ?? "").replaceAll(",", " ");
    return `${row.id},${name},${row.status},${phone},${row.subscribed_at}`;
  });
  return [header, ...lines].join("\n");
}

export async function addSubscriber(input: {
  phone: string;
  name?: string;
  createdBy?: string | null;
}): Promise<SubscriberPublic> {
  const client = createServiceClient();
  if (!client) throw new Error("Supabase service role missing");
  const normalized = normalizeWhatsAppPhone(input.phone);
  if (normalized.length < 10) throw new Error("Nomor tidak valid");
  const phoneEnc = encryptPii(normalized);
  const { data, error } = await client
    .from("daily_brief_subscribers")
    .upsert(
      {
        phone_enc: phoneEnc,
        name: input.name?.trim() || null,
        status: "active",
        subscribed_at: new Date().toISOString(),
        unsubscribed_at: null,
        created_by: input.createdBy ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "phone_enc" }
    )
    .select("id, name, status, subscribed_at")
    .single();
  if (error || !data) throw new Error(error?.message ?? "Gagal menambah nomor");
  return {
    id: data.id,
    name: data.name,
    status: data.status,
    phoneMasked: maskWhatsAppPhone(normalized),
    subscribedAt: data.subscribed_at,
  };
}

export async function updateSubscriberStatus(
  id: string,
  status: DailyBriefSubscriberStatus
): Promise<void> {
  const client = createServiceClient();
  if (!client) throw new Error("Supabase service role missing");
  const { error } = await client
    .from("daily_brief_subscribers")
    .update({
      status,
      unsubscribed_at: status === "unsubscribed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function enqueueAndSend(briefDate: string): Promise<{
  enqueued: number;
  sent: number;
  failed: number;
}> {
  const client = createServiceClient();
  if (!client) throw new Error("Supabase service role missing");

  const { data: brief, error: briefError } = await client
    .from("daily_briefs")
    .select("id, summary, whatsapp_enqueued_at")
    .eq("brief_date", briefDate)
    .maybeSingle();
  if (briefError || !brief) throw new Error(briefError?.message ?? "Brief belum ada");

  const summary = brief.summary as DailyBriefSummary;
  const message = buildDailyBriefWhatsApp(summary, "id");

  const { data: subscribers, error: subError } = await client
    .from("daily_brief_subscribers")
    .select("id, phone_enc")
    .eq("status", "active");
  if (subError) throw new Error(subError.message);

  let enqueued = 0;
  for (const sub of subscribers ?? []) {
    const { error } = await client.from("daily_brief_message_logs").upsert(
      {
        subscriber_id: sub.id,
        brief_id: brief.id,
        status: "pending",
      },
      { onConflict: "subscriber_id,brief_id", ignoreDuplicates: true }
    );
    if (!error) enqueued += 1;
  }

  await client
    .from("daily_briefs")
    .update({ whatsapp_enqueued_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", brief.id);

  const { data: pending, error: pendError } = await client
    .from("daily_brief_message_logs")
    .select("id, subscriber_id")
    .eq("brief_id", brief.id)
    .eq("status", "pending")
    .limit(50);
  if (pendError) throw new Error(pendError.message);

  const phoneById = new Map((subscribers ?? []).map((s) => [s.id, s.phone_enc]));
  let sent = 0;
  let failed = 0;
  for (const row of pending ?? []) {
    const enc = phoneById.get(row.subscriber_id);
    try {
      if (!enc) throw new Error("Nomor tidak ada");
      const phone = decryptPii(enc);
      await sendWhatsAppGateway(phone, message);
      await client
        .from("daily_brief_message_logs")
        .update({ status: "sent", sent_at: new Date().toISOString(), error_message: null })
        .eq("id", row.id);
      sent += 1;
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      await client
        .from("daily_brief_message_logs")
        .update({ status: "failed", error_message: msg.slice(0, 300) })
        .eq("id", row.id);
    }
  }

  return { enqueued, sent, failed };
}

/** True when this Jakarta date was already claimed, unless the caller forces a resend. */
export function dailyBriefSudahDikirim(
  enqueuedAt: string | null | undefined,
  force: boolean,
): boolean {
  if (force) return false;
  return Boolean(enqueuedAt);
}

export async function runDailyBriefCron(options: { force?: boolean } = {}): Promise<{
  briefDate: string;
  created: boolean;
  sent: number;
  failed: number;
  skipped: boolean;
}> {
  const { todayJakartaYmd } = await import("@/lib/sik/kunci-statis");
  const briefDate = todayJakartaYmd();
  const client = createServiceClient();
  if (!client) throw new Error("Supabase service role missing");

  if (!options.force) {
    const { data } = await client
      .from("daily_briefs")
      .select("whatsapp_enqueued_at")
      .eq("brief_date", briefDate)
      .maybeSingle();
    if (dailyBriefSudahDikirim(data?.whatsapp_enqueued_at, false)) {
      return { briefDate, created: false, sent: 0, failed: 0, skipped: true };
    }
  }

  const { created } = await upsertDailyBrief(briefDate, options);

  if (!options.force) {
    const claimed = await client
      .from("daily_briefs")
      .update({
        whatsapp_enqueued_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("brief_date", briefDate)
      .is("whatsapp_enqueued_at", null)
      .select("id")
      .maybeSingle();
    if (claimed.error) throw new Error(claimed.error.message);
    if (!claimed.data) {
      return { briefDate, created: false, sent: 0, failed: 0, skipped: true };
    }
  }

  const { sent, failed } = await enqueueAndSend(briefDate);
  return { briefDate, created, sent, failed, skipped: false };
}
