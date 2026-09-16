import type { PeringatanDiniResponse } from "@/lib/peringatan-dini-types";
import type { TatonasHighlight } from "@/lib/tatonas/types";
import type {
  DailyBriefAction,
  DailyBriefExecutive,
  DailyBriefFeed,
  DailyBriefFeedKind,
  DailyBriefHeader,
  DailyBriefPriority,
  DailyBriefPriorityRow,
  DailyBriefQuality,
  DailyBriefSummaryV2,
  FeedAvailability,
  HotspotBriefItem,
  KejadianBriefItem,
  OverlayQuakeRow,
  PosBriefItem,
} from "./compose";

const COVERAGE = "Aceh";

const RANK: Record<DailyBriefPriority, number> = {
  tinggi: 4,
  sedang: 3,
  rendah: 2,
  informasional: 1,
};

export type SituasiInput = {
  briefDate: string;
  composedAt: string;
  peringatan: PeringatanDiniResponse;
  feeds: DailyBriefFeed[];
  disclaimer: string;
  overlayQuakes: OverlayQuakeRow[];
  hotspotCoords: HotspotBriefItem[];
  kejadianItems: KejadianBriefItem[];
  yesterdayDate: string | null;
  yesterdayCounts: Partial<Record<DailyBriefFeedKind, number | null>> | null;
};

function feed(feeds: DailyBriefFeed[], kind: DailyBriefFeedKind): DailyBriefFeed | undefined {
  return feeds.find((row) => row.kind === kind);
}

function worstPriority(rows: DailyBriefPriorityRow[]): DailyBriefPriority {
  if (rows.length === 0) return "informasional";
  return rows.reduce((best, row) => (RANK[row.priority] > RANK[best] ? row.priority : best), rows[0].priority);
}

function buildPriorities(
  feeds: DailyBriefFeed[],
  peringatan: PeringatanDiniResponse,
  kejadianItems: KejadianBriefItem[]
): DailyBriefPriorityRow[] {
  const rows: DailyBriefPriorityRow[] = [];
  const kejadian = feed(feeds, "kejadian");
  if (kejadian?.availability === "live" && (kejadian.count ?? 0) > 0) {
    const loc =
      kejadianItems.map((item) => item.kabupaten).filter(Boolean).slice(0, 2).join(", ") || "belum ada";
    rows.push({
      kind: "kejadian",
      priority: "tinggi",
      issue: `${kejadian.count} kejadian operasional aktif`,
      location: loc,
      status: "Aktif",
      action: "Verifikasi status dan kebutuhan lapangan",
    });
  }
  const sipongi = feed(feeds, "sipongi");
  if (sipongi?.availability === "live" && (sipongi.count ?? 0) > 0) {
    const hasHigh = peringatan.sipongi.points.some((p) => p.confidence_level === "high");
    rows.push({
      kind: "sipongi",
      priority: "sedang",
      issue: `${sipongi.count} hotspot Aceh (${hasHigh ? "ada keyakinan tinggi" : "sedang"})`,
      location: "Aceh",
      status: "Belum terverifikasi",
      action: "Identifikasi lokasi titik pada umpan Sipongi",
    });
  }
  const cuaca = feed(feeds, "cuaca");
  if (cuaca?.availability === "live" && cuaca.headline) {
    rows.push({
      kind: "cuaca",
      priority: "sedang",
      issue: cuaca.headline,
      location: peringatan.cuaca.highlights[0]?.kabupaten ?? "Aceh",
      status: peringatan.cuaca.stale ? "Tertunda" : "Terpantau",
      action: "Pantau kegiatan luar ruang bila petir atau hujan lebat",
    });
  }
  const magma = feed(feeds, "magma");
  if (magma?.availability === "live" && magma.headline) {
    rows.push({
      kind: "magma",
      priority: "rendah",
      issue: magma.headline,
      location: peringatan.magma.event?.wilayah ?? "belum ada",
      status: "Informasi awal",
      action: "Pantau laporan kerusakan; tulis belum ada laporan, bukan tidak ada dampak",
    });
  }
  const gempa = feed(feeds, "gempa");
  if (gempa?.availability === "live" && (gempa.count ?? 0) > 0) {
    rows.push({
      kind: "gempa",
      priority: "rendah",
      issue: `${gempa.count} gempa overlay cache Aceh`,
      location: "Aceh",
      status: "Cache overlay",
      action: "Pantau gempa susulan pada overlay BMKG",
    });
  } else if (gempa?.availability === "empty") {
    rows.push({
      kind: "gempa",
      priority: "informasional",
      issue: "Overlay gempa",
      location: "Aceh",
      status: "Tidak ada pada umpan hari ini",
      action: "Tetap dipantau",
    });
  }
  return rows.slice(0, 5);
}

function buildExecutive(
  briefDate: string,
  rows: DailyBriefPriorityRow[],
  feeds: DailyBriefFeed[]
): DailyBriefExecutive {
  const liveIssues = rows.filter((row) => row.priority !== "informasional");
  const where = Array.from(
    new Set(liveIssues.map((row) => row.location).filter((loc) => loc && loc !== "belum ada"))
  );
  const worst = worstPriority(rows);
  return {
    what: liveIssues.length
      ? liveIssues.map((row) => row.issue).join("; ")
      : "Tidak ada isu prioritas pada umpan hari ini.",
    where: where.length ? where.join("; ") : "belum ada",
    howSerious: `Prioritas pemantauan umpan: ${worst}. Bukan status siaga resmi.`,
    whoWhat: "Dampak penduduk dan infrastruktur: belum ada di umpan brief ini.",
    nextAction: liveIssues[0]?.action ?? "Tetap pantau umpan; untuk darurat hubungi 112 / Pusdalops.",
    briefDate,
  };
}

function cuacaNeedsAdvice(headline: string | null): boolean {
  if (!headline) return false;
  return /petir|hujan lebat|hujan ekstrem|angin kencang/i.test(headline);
}

function buildActions(feeds: DailyBriefFeed[]): DailyBriefAction[] {
  const actions: DailyBriefAction[] = [];
  const kejadian = feed(feeds, "kejadian");
  if (kejadian?.availability === "live" && (kejadian.count ?? 0) > 0) {
    actions.push({
      window: "1-3h",
      text: `Memverifikasi ${kejadian.count} kejadian operasional aktif.`,
    });
  }
  const sipongi = feed(feeds, "sipongi");
  if (sipongi?.availability === "live" && (sipongi.count ?? 0) > 0) {
    actions.push({
      window: "1-3h",
      text: `Mengidentifikasi lokasi ${sipongi.count} hotspot pada umpan Sipongi.`,
    });
  }
  const tatonas = feed(feeds, "tatonas");
  if (tatonas?.availability === "live" && (tatonas.count ?? 0) > 0) {
    actions.push({
      window: "1-3h",
      text: `Mengonfirmasi ${tatonas.count} pos yang melewati ambang pemantauan.`,
    });
  }
  const cuaca = feed(feeds, "cuaca");
  if (cuaca?.availability === "live" && cuacaNeedsAdvice(cuaca.headline)) {
    actions.push({
      window: "1-3h",
      text: "Mengeluarkan imbauan kegiatan luar ruang bila petir atau hujan lebat masih berlangsung.",
    });
  }
  const magma = feed(feeds, "magma");
  if (magma?.availability === "live" && magma.headline) {
    actions.push({
      window: "1-3h",
      text: "Memeriksa apakah ada laporan kerusakan gempa; jika belum, tulis belum ada laporan.",
    });
  }
  return actions;
}

function mapPos(row: TatonasHighlight): PosBriefItem {
  return {
    posName: row.pos_name,
    sensor: row.sensor,
    value: row.value,
    satuan: row.satuan,
    level: row.level,
    timeLocal: row.time_local,
  };
}

function delta(
  yesterday: Partial<Record<DailyBriefFeedKind, number | null>> | null,
  kind: DailyBriefFeedKind,
  today: number | null
): number | null {
  if (!yesterday || today == null) return null;
  const prev = yesterday[kind];
  if (prev == null) return null;
  return today - prev;
}

export function composeSituasi(input: SituasiInput): DailyBriefSummaryV2 {
  const { feeds, peringatan } = input;
  const priorities = buildPriorities(feeds, peringatan, input.kejadianItems);
  const header: DailyBriefHeader = {
    briefDate: input.briefDate,
    composedAt: input.composedAt,
    period: "24 jam terakhir",
    coverage: COVERAGE,
    worstPriority: worstPriority(priorities),
  };
  const executive: DailyBriefExecutive = buildExecutive(input.briefDate, priorities, feeds);
  const cuacaFeed = feed(feeds, "cuaca");
  const highlight = peringatan.cuaca.highlights[0];
  const magmaAvail = feed(feeds, "magma")?.availability ?? "unavailable";
  const magmaEvent = magmaAvail === "unavailable" ? null : peringatan.magma.event;
  const sipongiAvail = feed(feeds, "sipongi")?.availability ?? "unavailable";
  const hotspots: HotspotBriefItem[] =
    sipongiAvail === "unavailable"
      ? []
      : peringatan.sipongi.points.map((point) => {
          const match = input.hotspotCoords.find(
            (row) =>
              row.desa === point.desa &&
              row.kecamatan === point.kecamatan &&
              row.kabkota === point.kabkota
          );
          return {
            kabkota: point.kabkota,
            kecamatan: point.kecamatan,
            desa: point.desa,
            confidence: point.confidence_level,
            tanggal: point.tanggal,
            lat: match?.lat ?? null,
            lng: match?.lng ?? null,
          };
        });
  const tatonasAvail = feed(feeds, "tatonas")?.availability ?? "unavailable";
  const posts: PosBriefItem[] =
    tatonasAvail === "unavailable" ? [] : peringatan.tatonas.highlights.map(mapPos);
  const gempaFeed = feed(feeds, "gempa");
  const overlayQuakes = gempaFeed?.availability === "unavailable" ? [] : input.overlayQuakes;
  const kejadianFeed = feed(feeds, "kejadian");
  const kejadianItems = kejadianFeed?.availability === "unavailable" ? [] : input.kejadianItems;
  const quality: DailyBriefQuality = {
    staleKinds: feeds.filter((row) => row.availability === "stale").map((row) => row.kind),
    yesterdayDate: input.yesterdayDate,
    sipongiDelta: delta(input.yesterdayCounts, "sipongi", feed(feeds, "sipongi")?.count ?? null),
    tatonasDelta: delta(input.yesterdayCounts, "tatonas", feed(feeds, "tatonas")?.count ?? null),
    gempaDelta: delta(input.yesterdayCounts, "gempa", feed(feeds, "gempa")?.count ?? null),
    kejadianDelta: delta(input.yesterdayCounts, "kejadian", feed(feeds, "kejadian")?.count ?? null),
  };

  return {
    version: 2,
    briefDate: input.briefDate,
    disclaimer: input.disclaimer,
    feeds,
    header,
    executive,
    priorities,
    sectors: {
      cuaca: {
        availability: cuacaFeed?.availability ?? "unavailable",
        kabupaten: highlight?.kabupaten ?? null,
        kondisi: highlight?.kondisi ?? null,
        rainMm: highlight?.curah_hujan_mm ?? null,
        periode: highlight?.periode ?? null,
        fetchedAt: peringatan.cuaca.fetched_at,
        sourceLabel: cuacaFeed?.sourceLabel ?? "BMKG / Open-Meteo",
        href: peringatan.cuaca.href,
      },
      magma: {
        availability: magmaAvail,
        headline: magmaAvail === "unavailable" ? "data tertunda" : magmaEvent
          ? `${magmaEvent.magnitude_text} ${magmaEvent.wilayah}`.trim()
          : null,
        magnitudeText: magmaEvent?.magnitude_text ?? null,
        wilayah: magmaEvent?.wilayah ?? null,
        waktu: magmaEvent?.waktu_kejadian ?? null,
        depthText: magmaEvent?.koordinat_kedalaman || null,
        intensitas: magmaEvent?.intensitas_mmi ?? null,
        fetchedAt: peringatan.magma.fetched_at,
        href: peringatan.magma.href,
      },
      overlayGempa: {
        availability: gempaFeed?.availability ?? "unavailable",
        count: gempaFeed?.count ?? null,
        items: overlayQuakes,
        href: "/peta?overlays=bmkgQuakes",
      },
      hotspot: {
        availability: sipongiAvail,
        count: sipongiAvail === "unavailable" ? null : hotspots.length,
        items: hotspots,
        fetchedAt: peringatan.sipongi.fetched_at,
        href: peringatan.sipongi.href,
      },
      pos: {
        availability: tatonasAvail,
        count: tatonasAvail === "unavailable" ? null : posts.length,
        items: posts,
        fetchedAt: peringatan.tatonas.fetched_at,
        href: peringatan.tatonas.href,
      },
      kejadian: {
        availability: kejadianFeed?.availability ?? "unavailable",
        count: kejadianFeed?.count ?? null,
        items: kejadianItems,
        href: "/id/admin/sik/kejadian",
      },
    },
    actions: buildActions(feeds),
    quality,
  };
}
