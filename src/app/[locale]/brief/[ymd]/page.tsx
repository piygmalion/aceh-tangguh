import { getTranslations, setRequestLocale } from "next-intl/server";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { Link } from "@/i18n/routing";
import { parseBriefYmd } from "@/lib/daily-brief/compose";
import { loadPublicBrief } from "@/lib/daily-brief/service";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";
import type { DailyBriefFeedKind } from "@/lib/daily-brief/compose";

export const dynamic = "force-dynamic";
export function generateStaticParams() {
  return [];
}
export const dynamicParams = true;

const FEED_KEYS: Record<DailyBriefFeedKind, "cuaca" | "magma" | "sipongi" | "tatonas" | "gempa" | "kejadian"> = {
  cuaca: "cuaca",
  magma: "magma",
  sipongi: "sipongi",
  tatonas: "tatonas",
  gempa: "gempa",
  kejadian: "kejadian",
};

export default async function DailyBriefPage({
  params,
}: {
  params: { locale: string; ymd: string };
}) {
  setRequestLocale(params.locale);
  const t = await getTranslations("dailyBrief");
  const ymd = parseBriefYmd(params.ymd);
  const summary = ymd ? await loadPublicBrief(ymd) : null;

  return (
    <>
      <SiteNav />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-28">
        <p className="text-sm text-[var(--text-dim)]">
          <Link href="/" className="hover:text-[var(--primary)]">
            {t("backHome")}
          </Link>
        </p>
        <p className="type-kicker mt-4 text-[var(--accent-soft)]">{t("kicker")}</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{t("title")}</h1>
        <p className={cn("mt-3 max-w-2xl text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{t("lead")}</p>
        {ymd ? <p className="mt-2 text-sm text-[var(--text-dim)]">{ymd}</p> : null}

        {!summary ? (
          <GlassPanel className="mt-8 p-5">
            <p className="text-sm text-[var(--text-dim)]">{t("notFound")}</p>
          </GlassPanel>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            {summary.feeds.map((feed) => (
              <GlassPanel key={feed.kind} className="p-4">
                <p className="text-sm font-medium">{t(FEED_KEYS[feed.kind])}</p>
                <p className={cn("mt-1 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                  {feed.availability === "unavailable"
                    ? t("unavailable")
                    : feed.availability === "empty" || !feed.headline
                      ? t("empty")
                      : feed.headline}
                  {feed.availability === "stale" ? ` · ${t("stale")}` : ""}
                </p>
                <p className={cn("mt-2 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{feed.sourceLabel}</p>
              </GlassPanel>
            ))}
          </div>
        )}

        <p className={cn("mt-8 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{t("disclaimer")}</p>
      </main>
      <SiteFooter />
    </>
  );
}
