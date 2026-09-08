"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Boxes, LayoutDashboard } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { GlassPanel } from "@/components/ui/GlassPanel";
import type {
  OpsDashboardView,
  OpsFeedId,
  OpsLifecycleKey,
} from "@/lib/sik/ops-dashboard";
import { TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

type FilterId = "all" | "logistik" | "kejadian" | "destana" | "rehab";

const LIFECYCLE_LABEL: Record<OpsLifecycleKey, "opsDashPhaseIncoming" | "opsDashPhaseReview" | "opsDashPhaseApproved" | "opsDashPhaseOps" | "opsDashPhaseLogistics"> = {
  incoming: "opsDashPhaseIncoming",
  review: "opsDashPhaseReview",
  approved: "opsDashPhaseApproved",
  ops: "opsDashPhaseOps",
  logistics: "opsDashPhaseLogistics",
};

const FEED_NAV: Record<OpsFeedId, "navModeration" | "navKejadianOps" | "navLogistik" | "navDestana" | "navRehab" | "navDisabilitas" | "navPublikCms" | "navMaster" | "navDailyBrief"> = {
  moderasi: "navModeration",
  kejadian: "navKejadianOps",
  logistik: "navLogistik",
  destana: "navDestana",
  rehab: "navRehab",
  disabilitas: "navDisabilitas",
  publikCms: "navPublikCms",
  master: "navMaster",
  dailyBrief: "navDailyBrief",
};

const METRIC_LABEL: Record<string, string> = {
  incoming: "opsDashPhaseIncoming",
  review: "opsDashPhaseReview",
  approved: "opsDashPhaseApproved",
  ops: "opsDashPhaseOps",
  calon: "opsDashMetricCalon",
  darurat: "opsDashMetricDarurat",
  stock: "opsDashStock",
  distributed: "opsDashDistributed",
  personil: "opsDashMetricPersonil",
  peralatan: "opsDashMetricPeralatan",
  kebutuhan: "opsDashMetricKebutuhan",
  programs: "opsDashMetricPrograms",
  aktivitas: "opsDashMetricAktivitas",
  pkd: "opsDashMetricPkd",
  rehab: "opsDashMetricRehab",
  monitoring: "opsDashMetricMonitoring",
  penerima: "opsDashMetricPenerima",
  disabilitas: "navDisabilitas",
  nomor: "opsDashMetricNomor",
  pelatihan: "opsDashMetricPelatihan",
  permintaan: "opsDashMetricPermintaan",
  instansi: "opsDashMetricInstansi",
  pengungsian: "opsDashMetricPengungsian",
  subscribers: "opsDashMetricSubscribers",
  briefs: "opsDashMetricBriefs",
};

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function ProgressBar({ value }: { value: number }) {
  const width = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--glass-border)]" aria-hidden>
      <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${width}%` }} />
    </div>
  );
}

export function OpsDashboard({
  view,
  name,
  role,
}: {
  view: OpsDashboardView;
  name: string;
  role: string;
}) {
  const t = useTranslations("admin");
  const [filter, setFilter] = useState<FilterId>("all");
  const maxLifecycle = Math.max(1, ...view.lifecycle.map((step) => step.value));
  const maxBoard = Math.max(1, ...view.leaderboard.map((row) => row.volume));

  const feeds = useMemo(
    () => (filter === "all" ? view.feeds : view.feeds.filter((feed) => feed.id === filter)),
    [filter, view.feeds],
  );
  const recent = useMemo(
    () => (filter === "all" ? view.recent : view.recent.filter((row) => row.module === filter)),
    [filter, view.recent],
  );
  const board = useMemo(
    () => (filter === "all" ? view.leaderboard : view.leaderboard.filter((row) => row.id === filter)),
    [filter, view.leaderboard],
  );

  const filters: FilterId[] = ["all", "logistik", "kejadian", "destana", "rehab"];

  return (
    <div className="flex flex-col gap-4" data-testid="ops-dashboard">
      <GlassPanel className="p-5 sm:p-6">
        <p className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>{t("navOpsDash")}</p>
        <h1 className="mt-1 text-xl font-semibold">{t("opsDashTitle")}</h1>
        <p className="mt-1 text-sm text-[var(--text-dim)]">{t("opsDashHello", { name, role })}</p>
        <p className="mt-2 max-w-3xl text-sm text-[var(--text-dim)]">{t("opsDashLead")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                "rounded-full border px-3 py-1 text-[0.8125rem] transition",
                filter === id
                  ? "border-[var(--primary)] bg-[var(--primary-dim)] text-[var(--primary)]"
                  : "border-[var(--glass-border)] text-[var(--text-dim)] hover:border-[var(--primary)]",
              )}
            >
              {id === "all" ? t("opsDashFilterAll") : t(FEED_NAV[id])}
            </button>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <CoverageCard label={t("opsDashModulesWithData")} value={`${view.coverage.modulesWithData}/${view.coverage.modulesVisible}`} />
          <CoverageCard label={t("opsDashQueue")} value={view.coverage.queue} />
          <CoverageCard label={t("opsDashIncidents")} value={view.coverage.incidents} />
          <CoverageCard label={t("opsDashLogisticsBound")} value={view.coverage.logisticsBound} />
        </div>
      </GlassPanel>

      {view.lifecycle.length > 0 ? (
        <GlassPanel className="p-5">
          <div data-testid="ops-lifecycle">
          <div className="flex items-center gap-2">
            <LayoutDashboard size={16} className="text-[var(--primary)]" />
            <h2 className="text-sm font-semibold">{t("opsDashLifecycle")}</h2>
          </div>
          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-stretch">
            {view.lifecycle.map((step, index) => (
              <div key={step.key} className="flex min-w-0 flex-1 items-stretch gap-3">
                <Link href={step.href} className="min-w-0 flex-1 rounded-xl border border-[var(--glass-border)] p-3 transition hover:border-[var(--primary)]">
                  <p className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>{t(LIFECYCLE_LABEL[step.key])}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{step.value}</p>
                  <ProgressBar value={step.value / maxLifecycle} />
                </Link>
                {index < view.lifecycle.length - 1 ? (
                  <div className="hidden items-center text-[var(--text-dim)] md:flex" aria-hidden>
                    <ArrowRight size={16} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
          </div>
        </GlassPanel>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-semibold">{t("opsDashFeeds")}</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {feeds.map((feed) => (
            <GlassPanel key={feed.id} className="p-4">
              <div data-testid={feed.id === "logistik" ? "ops-module-logistik" : undefined}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>{t(FEED_NAV[feed.id])}</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{feed.volume}</p>
                </div>
                {feed.id === "logistik" ? <Boxes size={16} className="text-[var(--primary)]" /> : null}
              </div>
              <p className="mt-1 text-[0.8125rem] text-[var(--text-dim)]">
                {t("opsDashProgress")}: {percent(feed.progress)}
              </p>
              <ProgressBar value={feed.progress} />
              <dl className="mt-3 grid grid-cols-2 gap-2 text-[0.8125rem]">
                {feed.metrics.slice(0, 4).map((metric) => (
                  <div key={metric.key}>
                    <dt className="text-[var(--text-dim)]">
                      {t((METRIC_LABEL[metric.key] ?? "opsDashProgress") as "opsDashProgress")}
                    </dt>
                    <dd className="font-medium tabular-nums">{metric.value}</dd>
                  </div>
                ))}
              </dl>
              <Link href={feed.href} className="mt-3 inline-flex items-center gap-1 text-sm text-[var(--primary)]">
                {t("opsDashOpen")}
                <ArrowRight size={14} />
              </Link>
              </div>
            </GlassPanel>
          ))}
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-5">
        <GlassPanel className="p-4 lg:col-span-3">
          <div data-testid="ops-recent">
          <h2 className="text-sm font-semibold">{t("opsDashRecent")}</h2>
          {recent.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--text-dim)]">{t("opsDashEmptyRecent")}</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left text-sm">
                <thead>
                  <tr className="text-[var(--text-dim)]">
                    <th className="pb-2 pr-3 font-medium">{t("opsDashColTitle")}</th>
                    <th className="pb-2 pr-3 font-medium">{t("opsDashColMeta")}</th>
                    <th className="pb-2 font-medium">{t("opsDashColStatus")}</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((row) => (
                    <tr key={`${row.module}-${row.id}`} className="border-t border-[var(--glass-border)]">
                      <td className="py-2 pr-3">
                        <p className="font-medium">{row.title}</p>
                        <p className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>{t(FEED_NAV[row.module])}</p>
                      </td>
                      <td className="py-2 pr-3 text-[var(--text-dim)]">{row.meta || "—"}</td>
                      <td className="py-2 text-[var(--text-dim)]">{row.status || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </GlassPanel>
        <GlassPanel className="p-4 lg:col-span-2">
          <div data-testid="ops-leaderboard">
          <h2 className="text-sm font-semibold">{t("opsDashLeaderboard")}</h2>
          <ol className="mt-3 flex flex-col gap-3">
            {board.map((row) => (
              <li key={row.id}>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span>{t(FEED_NAV[row.id])}</span>
                  <span className="tabular-nums">{row.volume}</span>
                </div>
                <ProgressBar value={row.volume / maxBoard} />
              </li>
            ))}
          </ol>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

function CoverageCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--glass-border)] p-3">
      <p className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
