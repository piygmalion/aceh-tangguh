import { todayJakartaYmd } from "@/lib/sik/kunci-statis";
import type { PeringatanDiniResponse, PeringatanSource } from "@/lib/peringatan-dini-types";

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

export type DailyBriefSummary = {
  briefDate: string;
  feeds: DailyBriefFeed[];
  disclaimer: string;
};

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
  const tatonasText =
    tatonasCount != null && tatonasCount > 0
      ? `${tatonasCount} pos di atas ambang umpan`
      : null;

  const gempaAvail: FeedAvailability = input.gempa.queryOk
    ? input.gempa.count === 0
      ? "empty"
      : "live"
    : "unavailable";
  const gempaCount = input.gempa.queryOk ? input.gempa.count : null;

  const kejadianAvail: FeedAvailability = input.kejadian.rowOk ? "live" : "unavailable";
  const kejadianCount = input.kejadian.rowOk ? input.kejadian.activeIncidents : null;

  return {
    briefDate: input.briefDate,
    disclaimer: DISCLAIMER,
    feeds: [
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
        headline: cardHeadline(tatonasAvail, tatonasText),
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
        sourceLabel: "live_stats",
      },
    ],
  };
}

export function composeForJakartaToday(
  peringatan: PeringatanDiniResponse,
  gempa: OverlayQuakeInput,
  kejadian: LiveStatsInput,
  now = new Date()
): DailyBriefSummary {
  return composeDailyBrief({
    briefDate: todayJakartaYmd(now),
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
