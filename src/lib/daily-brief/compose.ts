import { todayJakartaYmd } from "@/lib/sik/kunci-statis";
import type { PeringatanDiniResponse, PeringatanSource } from "@/lib/peringatan-dini-types";
import { composeSituasi } from "./situasi";

export type FeedAvailability = "live" | "empty" | "unavailable" | "stale";

export type DailyBriefFeedKind =
  | "cuaca"
  | "magma"
  | "sipongi"
  | "tatonas"
  | "gempa"
  | "kejadian";

export type DailyBriefFeed = {
  kind: DailyBriefFeedKind;
  availability: FeedAvailability;
  headline: string | null;
  count: number | null;
  sourceLabel: string;
};

export type DailyBriefPriority = "tinggi" | "sedang" | "rendah" | "informasional";

export type DailyBriefHeader = {
  briefDate: string;
  composedAt: string;
  period: string;
  coverage: string;
  worstPriority: DailyBriefPriority;
};

export type DailyBriefExecutive = {
  what: string;
  where: string;
  howSerious: string;
  whoWhat: string;
  nextAction: string;
  briefDate: string;
};

export type DailyBriefPriorityRow = {
  kind: DailyBriefFeedKind;
  priority: DailyBriefPriority;
  issue: string;
  location: string;
  status: string;
  action: string;
};

export type OverlayQuakeRow = {
  title: string | null;
  magnitude: string | null;
  depth: string | null;
  occurredAt: string | null;
  lat: number | null;
  lng: number | null;
};

export type HotspotBriefItem = {
  kabkota: string;
  kecamatan: string;
  desa: string;
  confidence: "medium" | "high";
  tanggal: string;
  lat: number | null;
  lng: number | null;
};

export type PosBriefItem = {
  posName: string;
  sensor: string;
  value: number | null;
  satuan: string;
  level: string;
  timeLocal: string | null;
};

export type KejadianBriefItem = {
  id: string;
  nomor: string;
  jenis: string;
  nama: string;
  status: string;
  kabupaten: string | null;
  kecamatan: string | null;
  desa: string | null;
  waktu: string | null;
  lat: number | null;
  lng: number | null;
};

export type DailyBriefAction = {
  window: "1-3h";
  text: string;
};

export type DailyBriefQuality = {
  staleKinds: DailyBriefFeedKind[];
  yesterdayDate: string | null;
  sipongiDelta: number | null;
  tatonasDelta: number | null;
  gempaDelta: number | null;
  kejadianDelta: number | null;
};

export type DailyBriefSectors = {
  cuaca: {
    availability: FeedAvailability;
    kabupaten: string | null;
    kondisi: string | null;
    rainMm: number | null;
    periode: string | null;
    fetchedAt: string | null;
    sourceLabel: string;
    href: string;
  };
  magma: {
    availability: FeedAvailability;
    headline: string | null;
    magnitudeText: string | null;
    wilayah: string | null;
    waktu: string | null;
    depthText: string | null;
    intensitas: string | null;
    fetchedAt: string | null;
    href: string;
  };
  overlayGempa: {
    availability: FeedAvailability;
    count: number | null;
    items: OverlayQuakeRow[];
    href: string;
  };
  hotspot: {
    availability: FeedAvailability;
    count: number | null;
    items: HotspotBriefItem[];
    fetchedAt: string | null;
    href: string;
  };
  pos: {
    availability: FeedAvailability;
    count: number | null;
    items: PosBriefItem[];
    fetchedAt: string | null;
    href: string;
  };
  kejadian: {
    availability: FeedAvailability;
    count: number | null;
    items: KejadianBriefItem[];
    href: string;
  };
};

export type DailyBriefSummaryV1 = {
  briefDate: string;
  feeds: DailyBriefFeed[];
  disclaimer: string;
  version?: undefined;
};

export type DailyBriefSummaryV2 = {
  version: 2;
  briefDate: string;
  feeds: DailyBriefFeed[];
  disclaimer: string;
  header: DailyBriefHeader;
  executive: DailyBriefExecutive;
  priorities: DailyBriefPriorityRow[];
  sectors: DailyBriefSectors;
  actions: DailyBriefAction[];
  quality: DailyBriefQuality;
};

export type DailyBriefSummary = DailyBriefSummaryV1 | DailyBriefSummaryV2;

export function isDailyBriefV2(summary: DailyBriefSummary): summary is DailyBriefSummaryV2 {
  return summary.version === 2 && Array.isArray(summary.feeds);
}

export type DailyBriefSubscriberStatus = "active" | "inactive" | "unsubscribed";

export type SubscriberPublic = {
  id: string;
  name: string | null;
  status: DailyBriefSubscriberStatus;
  phoneMasked: string;
  subscribedAt: string;
};

export type OverlayQuakeInput = {
  queryOk: boolean;
  count: number | null;
};

export type LiveStatsInput = {
  rowOk: boolean;
  activeIncidents: number | null;
};

export type ComposeInput = {
  briefDate: string;
  peringatan: PeringatanDiniResponse;
  gempa: OverlayQuakeInput;
  kejadian: LiveStatsInput;
  composedAt?: string;
  overlayQuakes?: OverlayQuakeRow[];
  hotspotCoords?: HotspotBriefItem[];
  kejadianItems?: KejadianBriefItem[];
  yesterdayDate?: string | null;
  yesterdayCounts?: Partial<Record<DailyBriefFeedKind, number | null>> | null;
};

const DISCLAIMER =
  "Ini ringkasan umpan di situs, bukan saluran darurat. Untuk darurat hubungi 112 / Pusdalops.";

export function parseBriefYmd(raw: string): string | null {
  const compact = raw.replace(/-/g, "");
  if (!/^\d{8}$/.test(compact)) return null;
  const y = compact.slice(0, 4);
  const m = compact.slice(4, 6);
  const d = compact.slice(6, 8);
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${y}-${m}-${d}`;
}

export function briefPathForDate(briefDate: string, locale = "id"): string {
  return `/${locale}/brief/${briefDate}`;
}

export function maskWhatsAppPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 6) return "***";
  return `${digits.slice(0, 4)}***${digits.slice(-2)}`;
}

export function looksLikeWhatsAppPhone(raw: string): boolean {
  return raw.replace(/\D/g, "").length >= 10;
}

export function resolveDailyBriefSubscriberInput(
  phone: string,
  name: string
): { phone: string; name: string; swapped: boolean } {
  const phoneTrim = phone.trim();
  const nameTrim = name.trim();
  if (!looksLikeWhatsAppPhone(phoneTrim) && looksLikeWhatsAppPhone(nameTrim)) {
    return { phone: nameTrim, name: phoneTrim, swapped: true };
  }
  return { phone: phoneTrim, name: nameTrim, swapped: false };
}

export function feedAvailability(card: {
  empty: boolean;
  source: PeringatanSource | string;
  stale?: boolean;
}): FeedAvailability {
  if (card.source === "unavailable") return "unavailable";
  if (card.source !== "live") return "unavailable";
  if (card.empty) return "empty";
  if (card.stale) return "stale";
  return "live";
}

function cardHeadline(
  availability: FeedAvailability,
  liveText: string | null
): string | null {
  if (availability === "unavailable") return "data tertunda";
  if (availability === "empty") return null;
  return liveText;
}

export function composeDailyBrief(input: ComposeInput): DailyBriefSummary {
  const cuacaAvail = feedAvailability(input.peringatan.cuaca);
  const magmaAvail = feedAvailability(input.peringatan.magma);
  const sipongiAvail = feedAvailability(input.peringatan.sipongi);
  const tatonasAvail = feedAvailability(input.peringatan.tatonas);

  const cuacaHighlight = input.peringatan.cuaca.highlights[0];
  const cuacaText = cuacaHighlight
    ? `${cuacaHighlight.kabupaten}: ${cuacaHighlight.kondisi}`
    : null;

  const magmaEvent = input.peringatan.magma.event;
  const magmaText =
    magmaAvail === "unavailable"
      ? null
      : magmaEvent
        ? `${magmaEvent.magnitude_text} ${magmaEvent.wilayah}`.trim()
        : null;

  const sipongiCount =
    sipongiAvail === "unavailable" ? null : input.peringatan.sipongi.points.length;
  const sipongiText =
    sipongiCount != null && sipongiCount > 0
      ? `${sipongiCount} hotspot Aceh (medium/tinggi)`
      : null;

  const tatonasCount =
    tatonasAvail === "unavailable" ? null : input.peringatan.tatonas.highlights.length;

  const gempaAvail: FeedAvailability = input.gempa.queryOk
    ? input.gempa.count === 0
      ? "empty"
      : "live"
    : "unavailable";
  const gempaCount = input.gempa.queryOk ? input.gempa.count : null;

  const kejadianAvail: FeedAvailability = input.kejadian.rowOk ? "live" : "unavailable";
  const kejadianCount = input.kejadian.rowOk ? input.kejadian.activeIncidents : null;

  const feeds: DailyBriefFeed[] = [
      {
        kind: "cuaca",
        availability: cuacaAvail,
        headline: cardHeadline(cuacaAvail, cuacaText),
        count: null,
        sourceLabel: "BMKG / Open-Meteo",
      },
      {
        kind: "magma",
        availability: magmaAvail,
        headline: cardHeadline(magmaAvail, magmaText),
        count: null,
        sourceLabel: "MAGMA",
      },
      {
        kind: "sipongi",
        availability: sipongiAvail,
        headline: cardHeadline(sipongiAvail, sipongiText),
        count: sipongiCount,
        sourceLabel: "Sipongi",
      },
      {
        kind: "tatonas",
        availability: tatonasAvail,
        headline: cardHeadline(
          tatonasAvail,
          tatonasCount != null && tatonasCount > 0
            ? `${tatonasCount} pos melewati ambang pemantauan`
            : null
        ),
        count: tatonasCount,
        sourceLabel: "Tatonas",
      },
      {
        kind: "gempa",
        availability: gempaAvail,
        headline:
          gempaAvail === "unavailable"
            ? "data tertunda"
            : gempaAvail === "empty"
              ? null
              : `${gempaCount} kejadian di cache overlay Aceh`,
        count: gempaCount,
        sourceLabel: "overlay bmkgQuakes",
      },
      {
        kind: "kejadian",
        availability: kejadianAvail,
        headline:
          kejadianAvail === "unavailable"
            ? "data tertunda"
            : kejadianCount == null
              ? null
              : `${kejadianCount} kejadian operasional aktif`,
        count: kejadianCount,
        sourceLabel: input.kejadianItems ? "kejadian_operasi" : "live_stats",
      },
    ];

  return composeSituasi({
    briefDate: input.briefDate,
    composedAt: input.composedAt ?? new Date().toISOString(),
    peringatan: input.peringatan,
    feeds,
    disclaimer: DISCLAIMER,
    overlayQuakes: gempaAvail === "unavailable" ? [] : (input.overlayQuakes ?? []),
    hotspotCoords: input.hotspotCoords ?? [],
    kejadianItems: kejadianAvail === "unavailable" ? [] : (input.kejadianItems ?? []),
    yesterdayDate: input.yesterdayDate ?? null,
    yesterdayCounts: input.yesterdayCounts ?? null,
  });
}

export function composeForJakartaToday(
  peringatan: PeringatanDiniResponse,
  gempa: OverlayQuakeInput,
  kejadian: LiveStatsInput,
  now = new Date()
): DailyBriefSummary {
  return composeDailyBrief({
    briefDate: todayJakartaYmd(now),
    composedAt: now.toISOString(),
    peringatan,
    gempa,
    kejadian,
  });
}

export function buildDailyBriefWhatsApp(
  summary: DailyBriefSummary,
  locale = "id"
): string {
  const lines = summary.feeds.map((feed) => {
    if (feed.availability === "unavailable") {
      return `• ${labelId(feed.kind)}: data tertunda`;
    }
    if (feed.availability === "empty" || !feed.headline) {
      return `• ${labelId(feed.kind)}: tidak ada pada umpan hari ini`;
    }
    const stale = feed.availability === "stale" ? " (tertunda)" : "";
    return `• ${labelId(feed.kind)}: ${feed.headline}${stale}`;
  });

  return [
    "Aceh Tangguh — ringkasan harian",
    summary.briefDate,
    "",
    ...lines,
    "",
    `Analisis lengkap: ${briefPathForDate(summary.briefDate, locale)}`,
    "",
    summary.disclaimer,
  ].join("\n");
}

function labelId(kind: DailyBriefFeedKind): string {
  switch (kind) {
    case "cuaca":
      return "Cuaca";
    case "magma":
      return "MAGMA";
    case "sipongi":
      return "Sipongi";
    case "tatonas":
      return "Tatonas";
    case "gempa":
      return "Gempa overlay";
    case "kejadian":
      return "Kejadian ops";
  }
}
