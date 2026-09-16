"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Accessibility,
  ArrowRight,
  BookOpen,
  Boxes,
  ClipboardList,
  Database,
  Hammer,
  Home,
  LayoutDashboard,
  Newspaper,
  TriangleAlert,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { Chip } from "@/components/ui/Chip";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Link } from "@/i18n/routing";
import {
  OPS_FEED_HREFS,
  type OpsDashboardView,
  type OpsFeedId,
  type OpsLifecycleKey,
} from "@/lib/sik/ops-dashboard";
import { TYPE_FLOOR_CLASS, TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

type FilterId = "all" | OpsFeedId;

const LIFECYCLE_LABEL: Record<
  OpsLifecycleKey,
  | "opsDashPhaseIncoming"
  | "opsDashPhaseReview"
  | "opsDashPhaseApproved"
  | "opsDashPhaseOps"
  | "opsDashPhaseLogistics"
> = {
  incoming: "opsDashPhaseIncoming",
  review: "opsDashPhaseReview",
  approved: "opsDashPhaseApproved",
  ops: "opsDashPhaseOps",
  logistics: "opsDashPhaseLogistics",
};

const FEED_NAV: Record<
  OpsFeedId,
  | "navModeration"
  | "navKejadianOps"
  | "navLogistik"
  | "navDestana"
  | "navRehab"
  | "navDisabilitas"
  | "navPublikCms"
  | "navMaster"
  | "navDailyBrief"
> = {
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

const VOLUME_HINT: Record<
  OpsFeedId,
  | "opsDashVolumeHintModerasi"
  | "opsDashVolumeHintKejadian"
  | "opsDashVolumeHintLogistik"
  | "opsDashVolumeHintDestana"
  | "opsDashVolumeHintRehab"
  | "opsDashVolumeHintDisabilitas"
  | "opsDashVolumeHintPublik"
  | "opsDashVolumeHintMaster"
  | "opsDashVolumeHintBrief"
> = {
  moderasi: "opsDashVolumeHintModerasi",
  kejadian: "opsDashVolumeHintKejadian",
  logistik: "opsDashVolumeHintLogistik",
  destana: "opsDashVolumeHintDestana",
  rehab: "opsDashVolumeHintRehab",
  disabilitas: "opsDashVolumeHintDisabilitas",
  publikCms: "opsDashVolumeHintPublik",
  master: "opsDashVolumeHintMaster",
  dailyBrief: "opsDashVolumeHintBrief",
};

const FEED_ICON: Record<OpsFeedId, LucideIcon> = {
  moderasi: ClipboardList,
  kejadian: TriangleAlert,
  logistik: Boxes,
  destana: Home,
  rehab: Hammer,
  disabilitas: Accessibility,
  publikCms: BookOpen,
  master: Database,
  dailyBrief: Newspaper,
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

const INTERACTIVE_SURFACE =
  "transition hover:border-[var(--primary)] active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]";

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

function normalizeStatus(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
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

  const filters: FilterId[] = ["all", ...view.feeds.map((feed) => feed.id)];

  function statusChip(raw: string) {
    const key = normalizeStatus(raw);
    if (key === "draft" || key === "draf") {
      return (
        <Chip tone="neutral" className={TYPE_FLOOR_CLASS}>
          {t("statusDraft")}
        </Chip>
      );
    }
    if (key === "submitted" || key === "in_review" || key === "ditinjau") {
      return (
        <Chip tone="accent" className={TYPE_FLOOR_CLASS}>
          {t("statusWaiting")}
        </Chip>
      );
    }
    if (key === "approved" || key === "disetujui") {
      return (
        <Chip tone="forest" className={TYPE_FLOOR_CLASS}>
          {t("statusApproved")}
        </Chip>
      );
    }
    if (key === "rejected" || key === "ditolak") {
      return (
        <Chip tone="danger" className={TYPE_FLOOR_CLASS}>
          {t("statusRejected")}
        </Chip>
      );
    }
    if (key === "needs_info" || key === "perlu_info") {
      return (
        <Chip tone="warn" className={TYPE_FLOOR_CLASS}>
          {t("statusNeedsInfo")}
        </Chip>
      );
    }
    if (key === "archived" || key === "arsip" || key === "diarsipkan") {
      return (
        <Chip tone="neutral" className={TYPE_FLOOR_CLASS}>
          {t("statusArchived")}
        </Chip>
      );
    }
    return (
      <span className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{raw || "-"}</span>
    );
  }

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
                TYPE_FLOOR_CLASS,
                "rounded-full border px-3 py-1 transition",
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
          <CoverageCard label={t("opsDashQueue")} value={view.coverage.queue} />
          <CoverageCard label={t("opsDashIncidents")} value={view.coverage.incidents} />
          <CoverageCard label={t("opsDashLogisticsBound")} value={view.coverage.logisticsBound} />
          <CoverageCard
            label={t("opsDashModulesWithData")}
            value={`${view.coverage.modulesWithData}/${view.coverage.modulesVisible}`}
          />
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
                  <Link
                    href={step.href}
                    className={cn(
                      "min-w-0 flex-1 rounded-xl border border-[var(--glass-border)] p-3",
                      INTERACTIVE_SURFACE,
                    )}
                  >
                    <p className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
                      {t(LIFECYCLE_LABEL[step.key])}
                    </p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{step.value}</p>
                    {step.value > 0 ? <ProgressBar value={step.value / maxLifecycle} /> : null}
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
          {feeds.map((feed) => {
            const Icon = FEED_ICON[feed.id];
            const idle = feed.volume <= 0;
            return (
              <Link
                key={feed.id}
                href={feed.href}
                aria-label={t("opsDashOpenAria", { module: t(FEED_NAV[feed.id]) })}
                className="block"
              >
                <GlassPanel
                  className={cn(
                    "h-full border p-4",
                    INTERACTIVE_SURFACE,
                    idle ? "opacity-70" : "border-[var(--glass-border)]",
                  )}
                >
                  <div data-testid={feed.id === "logistik" ? "ops-module-logistik" : undefined}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
                          {t(FEED_NAV[feed.id])}
                        </p>
                        <p className="mt-1 text-2xl font-semibold tabular-nums">{feed.volume}</p>
                        <p className={cn("mt-1 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                          {t(VOLUME_HINT[feed.id])}
                        </p>
                      </div>
                      <Icon size={16} className="shrink-0 text-[var(--primary)]" />
                    </div>
                    {idle ? (
                      <p className={cn("mt-2 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                        {t("opsDashEmptyModule")}
                      </p>
                    ) : (
                      <>
                        {feed.volume > 0 ? (
                          <p className={cn("mt-2 text-[var(--primary)]", TYPE_FLOOR_CLASS)}>
                            {t("opsDashNeedsWork")}
                          </p>
                        ) : null}
                        <p className={cn("mt-1 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                          {t("opsDashProgress")}: {percent(feed.progress)}
                        </p>
                        <ProgressBar value={feed.progress} />
                      </>
                    )}
                    <dl className={cn("mt-3 grid grid-cols-2 gap-2", TYPE_FLOOR_CLASS)}>
                      {feed.metrics.slice(0, 4).map((metric) => (
                        <div key={metric.key}>
                          <dt className="text-[var(--text-dim)]">
                            {t((METRIC_LABEL[metric.key] ?? "opsDashProgress") as "opsDashProgress")}
                          </dt>
                          <dd className="font-medium tabular-nums">{metric.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                </GlassPanel>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-5">
        <GlassPanel className="p-4 lg:col-span-3">
          <div data-testid="ops-recent">
            <h2 className="text-sm font-semibold">{t("opsDashRecent")}</h2>
            {recent.length === 0 ? (
              <Empty className="mt-3 min-h-0 border border-dashed border-[var(--glass-border)] p-6">
                <EmptyDescription className={cn(TYPE_FLOOR_CLASS, "text-[var(--text-dim)]")}>
                  {t("opsDashEmptyRecent")}
                </EmptyDescription>
              </Empty>
            ) : (
              <ul className="mt-3 flex flex-col">
                <li
                  className={cn(
                    "grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_auto] gap-3 pb-2 text-[var(--text-dim)]",
                    TYPE_FLOOR_CLASS,
                  )}
                >
                  <span className="font-medium">{t("opsDashColTitle")}</span>
                  <span className="font-medium">{t("opsDashColMeta")}</span>
                  <span className="font-medium">{t("opsDashColStatus")}</span>
                </li>
                {recent.map((row) => (
                  <li key={`${row.module}-${row.id}`} className="border-t border-[var(--glass-border)]">
                    <Link
                      href={OPS_FEED_HREFS[row.module]}
                      className={cn(
                        "grid grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)_auto] items-center gap-3 py-2",
                        INTERACTIVE_SURFACE,
                        "rounded-lg border border-transparent px-1",
                      )}
                    >
                      <span>
                        <span className="block font-medium">{row.title}</span>
                        <span className={cn("text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
                          {t(FEED_NAV[row.module])}
                        </span>
                      </span>
                      <span className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                        {row.meta || "-"}
                      </span>
                      <span>{statusChip(row.status)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </GlassPanel>
        <GlassPanel className="p-4 lg:col-span-2">
          <div data-testid="ops-leaderboard">
            <h2 className="text-sm font-semibold">{t("opsDashLeaderboard")}</h2>
            <ol className="mt-3 flex flex-col gap-3">
              {board.map((row) => (
                <li key={row.id}>
                  <Link
                    href={OPS_FEED_HREFS[row.id]}
                    className={cn("block rounded-lg border border-transparent px-1 py-1", INTERACTIVE_SURFACE)}
                    aria-label={t("opsDashOpenAria", { module: t(FEED_NAV[row.id]) })}
                  >
                    <div className={cn("flex items-center justify-between gap-2", TYPE_FLOOR_CLASS)}>
                      <span>{t(FEED_NAV[row.id])}</span>
                      <span className="tabular-nums">{row.volume}</span>
                    </div>
                    {row.volume > 0 ? <ProgressBar value={row.volume / maxBoard} /> : null}
                  </Link>
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
