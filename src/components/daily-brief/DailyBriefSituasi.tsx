import { Link } from "@/i18n/routing";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import {
  isDailyBriefV2,
  type DailyBriefFeed,
  type DailyBriefFeedKind,
  type DailyBriefPriority,
  type DailyBriefSummary,
  type DailyBriefSummaryV2,
  type FeedAvailability,
} from "@/lib/daily-brief/compose";

type TFn = (key: string) => string;

const FEED_KEYS: Record<DailyBriefFeedKind, string> = {
  cuaca: "cuaca",
  magma: "magma",
  sipongi: "sipongi",
  tatonas: "tatonas",
  gempa: "gempa",
  kejadian: "kejadian",
};

const PRIORITY_KEYS: Record<DailyBriefPriority, string> = {
  tinggi: "priorityTinggi",
  sedang: "prioritySedang",
  rendah: "priorityRendah",
  informasional: "priorityInfo",
};

function availabilityText(t: TFn, availability: FeedAvailability, headline: string | null): string {
  if (availability === "unavailable") return t("unavailable");
  if (availability === "empty" || !headline) return t("empty");
  return headline;
}

function fieldOrMissing(t: TFn, value: string | number | null | undefined): string {
  if (value == null || value === "") return t("belumAda");
  return String(value);
}

function FeedList({ feeds, t }: { feeds: DailyBriefFeed[]; t: TFn }) {
  return (
    <div className="mt-8 flex flex-col gap-3">
      {feeds.map((feed) => (
        <GlassPanel key={feed.kind} className="p-4">
          <p className="text-sm font-medium">{t(FEED_KEYS[feed.kind])}</p>
          <p className={cn("mt-1 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {availabilityText(t, feed.availability, feed.headline)}
            {feed.availability === "stale" ? ` · ${t("stale")}` : ""}
          </p>
          <p className={cn("mt-2 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{feed.sourceLabel}</p>
        </GlassPanel>
      ))}
    </div>
  );
}

function SituasiBody({ summary, t }: { summary: DailyBriefSummaryV2; t: TFn }) {
  const { header, executive, priorities, sectors, actions, quality } = summary;
  return (
    <div className="mt-8 flex flex-col gap-6">
      <GlassPanel className="p-5">
        <p className="text-sm font-medium">{t("headerTitle")}</p>
        <p className={cn("mt-2 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
          {header.briefDate} · {header.period} · {header.coverage}
        </p>
        <p className={cn("mt-1 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
          {t("composedAt")}: {header.composedAt}
        </p>
        <p className="mt-2 text-sm">
          {t("priorityFeed")}: {t(PRIORITY_KEYS[header.worstPriority])}
        </p>
        <p className={cn("mt-2 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{t("notOfficialSiaga")}</p>
      </GlassPanel>

      <GlassPanel className="p-5">
        <p className="text-sm font-medium">{t("executiveTitle")}</p>
        <dl className={cn("mt-3 grid gap-3 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
          <div>
            <dt className="font-medium text-[var(--text)]">{t("what")}</dt>
            <dd>{executive.what}</dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--text)]">{t("where")}</dt>
            <dd>{executive.where}</dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--text)]">{t("howSerious")}</dt>
            <dd>{executive.howSerious}</dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--text)]">{t("whoWhat")}</dt>
            <dd>{executive.whoWhat}</dd>
          </div>
          <div>
            <dt className="font-medium text-[var(--text)]">{t("nextAction")}</dt>
            <dd>{executive.nextAction}</dd>
          </div>
        </dl>
      </GlassPanel>

      <GlassPanel className="overflow-x-auto p-5">
        <p className="text-sm font-medium">{t("prioritiesTitle")}</p>
        {priorities.length === 0 ? (
          <p className={cn("mt-3 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{t("empty")}</p>
        ) : (
          <table className={cn("mt-3 w-full min-w-[36rem] text-left text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            <thead>
              <tr>
                <th className="pr-3 font-medium text-[var(--text)]">{t("colIssue")}</th>
                <th className="pr-3 font-medium text-[var(--text)]">{t("colLocation")}</th>
                <th className="pr-3 font-medium text-[var(--text)]">{t("colPriority")}</th>
                <th className="pr-3 font-medium text-[var(--text)]">{t("colStatus")}</th>
                <th className="font-medium text-[var(--text)]">{t("colAction")}</th>
              </tr>
            </thead>
            <tbody>
              {priorities.map((row) => (
                <tr key={`${row.kind}-${row.issue}`} className="align-top">
                  <td className="py-2 pr-3">{row.issue}</td>
                  <td className="py-2 pr-3">{row.location}</td>
                  <td className="py-2 pr-3">{t(PRIORITY_KEYS[row.priority])}</td>
                  <td className="py-2 pr-3">{row.status}</td>
                  <td className="py-2">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassPanel>

      <div className="grid gap-3">
        <GlassPanel className="p-4">
          <p className="text-sm font-medium">{t("cuaca")}</p>
          <p className={cn("mt-1 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {availabilityText(t, sectors.cuaca.availability, sectors.cuaca.kondisi)}
          </p>
          <p className={cn("mt-2 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {t("kabupaten")}: {fieldOrMissing(t, sectors.cuaca.kabupaten)} · {t("rainMm")}:{" "}
            {fieldOrMissing(t, sectors.cuaca.rainMm)} · {t("periode")}: {fieldOrMissing(t, sectors.cuaca.periode)}
          </p>
        </GlassPanel>
        <GlassPanel className="p-4">
          <p className="text-sm font-medium">{t("magma")}</p>
          <p className={cn("mt-1 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {availabilityText(t, sectors.magma.availability, sectors.magma.headline)}
          </p>
          <p className={cn("mt-2 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {fieldOrMissing(t, sectors.magma.magnitudeText)} · {fieldOrMissing(t, sectors.magma.wilayah)} ·{" "}
            {fieldOrMissing(t, sectors.magma.depthText)}
          </p>
          <p className={cn("mt-1 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {t("belumAdaLaporan")}
          </p>
        </GlassPanel>
        <GlassPanel className="p-4">
          <p className="text-sm font-medium">{t("overlayGempa")}</p>
          <p className={cn("mt-1 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {sectors.overlayGempa.availability === "unavailable"
              ? t("unavailable")
              : sectors.overlayGempa.availability === "empty"
                ? t("empty")
                : `${fieldOrMissing(t, sectors.overlayGempa.count)}`}
          </p>
          <ul className={cn("mt-2 list-disc pl-5 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {sectors.overlayGempa.items.map((item, index) => (
              <li key={`${item.occurredAt ?? index}`}>
                {fieldOrMissing(t, item.title)} · M {fieldOrMissing(t, item.magnitude)} ·{" "}
                {fieldOrMissing(t, item.depth)}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm">
            <Link href={{ pathname: "/peta", query: { overlays: "bmkgQuakes" } }} className="text-[var(--primary)] hover:underline">
              {t("mapQuakes")}
            </Link>
          </p>
        </GlassPanel>
        <GlassPanel className="p-4">
          <p className="text-sm font-medium">{t("hotspot")}</p>
          <p className={cn("mt-1 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {sectors.hotspot.availability === "unavailable"
              ? t("unavailable")
              : sectors.hotspot.availability === "empty"
                ? t("empty")
                : `${fieldOrMissing(t, sectors.hotspot.count)}`}
          </p>
          <ul className={cn("mt-2 list-disc pl-5 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {sectors.hotspot.items.map((item, index) => (
              <li key={`${item.desa}-${index}`}>
                {item.kabkota} / {item.kecamatan} / {item.desa} · {item.confidence}
                {item.lat != null && item.lng != null ? ` · ${item.lat}, ${item.lng}` : ` · ${t("belumAda")}`}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-sm">
            <Link href={{ pathname: "/peta", query: { overlays: "sipongiHotspots" } }} className="text-[var(--primary)] hover:underline">
              {t("mapHotspots")}
            </Link>
          </p>
        </GlassPanel>
        <GlassPanel className="p-4">
          <p className="text-sm font-medium">{t("pos")}</p>
          <p className={cn("mt-1 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {sectors.pos.availability === "unavailable"
              ? t("unavailable")
              : sectors.pos.availability === "empty"
                ? t("empty")
                : `${fieldOrMissing(t, sectors.pos.count)}`}
          </p>
          <ul className={cn("mt-2 list-disc pl-5 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {sectors.pos.items.map((item) => (
              <li key={`${item.posName}-${item.sensor}`}>
                {item.posName} · {item.sensor} · {fieldOrMissing(t, item.value)} {item.satuan} · {item.level}
              </li>
            ))}
          </ul>
        </GlassPanel>
        <GlassPanel className="p-4">
          <p className="text-sm font-medium">{t("kejadian")}</p>
          <p className={cn("mt-1 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {sectors.kejadian.availability === "unavailable"
              ? t("unavailable")
              : `${fieldOrMissing(t, sectors.kejadian.count)}`}
          </p>
          <ul className={cn("mt-2 list-disc pl-5 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {sectors.kejadian.items.map((item) => (
              <li key={item.id}>
                {item.nomor} · {item.jenis} · {item.nama} · {fieldOrMissing(t, item.kabupaten)} · {item.status}
              </li>
            ))}
          </ul>
          <p className={cn("mt-2 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{t("noCasualtiesInvented")}</p>
        </GlassPanel>
      </div>

      <GlassPanel className="p-5">
        <p className="text-sm font-medium">{t("actionsTitle")}</p>
        {actions.length === 0 ? (
          <p className={cn("mt-3 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{t("belumAda")}</p>
        ) : (
          <ul className={cn("mt-3 list-disc pl-5 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
            {actions.map((row) => (
              <li key={row.text}>
                {t("window1to3")}: {row.text}
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>

      <GlassPanel className="p-5">
        <p className="text-sm font-medium">{t("appendixTitle")}</p>
        <ul className={cn("mt-3 list-disc pl-5 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
          {summary.feeds.map((feed) => (
            <li key={feed.kind}>
              {t(FEED_KEYS[feed.kind])}: {feed.sourceLabel} · {feed.availability}
              {feed.availability === "stale" ? ` · ${t("stale")}` : ""}
            </li>
          ))}
        </ul>
        <p className={cn("mt-3 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
          {t("deltaYesterday")}: {quality.yesterdayDate ?? t("belumAda")} · Sipongi {fieldOrMissing(t, quality.sipongiDelta)} ·
          Tatonas {fieldOrMissing(t, quality.tatonasDelta)} · Gempa {fieldOrMissing(t, quality.gempaDelta)} ·{" "}
          {t("kejadian")} {fieldOrMissing(t, quality.kejadianDelta)}
        </p>
        <p className={cn("mt-2 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
          {t("fetchedAt")}: {t("cuaca")} {fieldOrMissing(t, sectors.cuaca.fetchedAt)} · {t("magma")}{" "}
          {fieldOrMissing(t, sectors.magma.fetchedAt)} · {t("sipongi")} {fieldOrMissing(t, sectors.hotspot.fetchedAt)} ·{" "}
          {t("tatonas")} {fieldOrMissing(t, sectors.pos.fetchedAt)}
        </p>
      </GlassPanel>
    </div>
  );
}

export function DailyBriefBody({ summary, t }: { summary: DailyBriefSummary; t: TFn }) {
  if (isDailyBriefV2(summary)) {
    return <SituasiBody summary={summary} t={t} />;
  }
  return <FeedList feeds={summary.feeds} t={t} />;
}
