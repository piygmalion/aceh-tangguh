"use client";

import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { FieldError } from "@/components/ui/field";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { Empty, EmptyContent, EmptyDescription } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReportStatus } from "@/lib/supabase/types";
import { OUTLINE_PRIMARY_CLASS, TYPE_FLOOR_CLASS, TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

type Tab = "kejadian" | "penanganan" | "legacy";
type LaporanStatusFilter =
  | "all"
  | "submitted"
  | "in_review"
  | "approved"
  | "rejected"
  | "needs_info";

type LaporanItem = {
  id: string;
  tipe: "kejadian" | "penanganan";
  nomorLaporan: string;
  jenisBencana: string;
  topic?: string;
  status: string;
  latitude: number;
  longitude: number;
  kabupaten: string;
  kecamatan: string | null;
  desa: string | null;
  skorUrgensi: number | null;
  tampilDiPeta: boolean;
  ringkasan: string;
  submittedAt: string;
  kejadianId?: string | null;
};

type LegacyItem = {
  id: string;
  topic: string;
  description: string;
  longitude: number;
  latitude: number;
  placeName?: string;
  status: ReportStatus;
  createdAt: string;
};

const LAPORAN_FILTERS: LaporanStatusFilter[] = [
  "all",
  "submitted",
  "in_review",
  "approved",
  "rejected",
  "needs_info",
];

const LEGACY_FILTERS: Array<ReportStatus | "all"> = [
  "all",
  "queued",
  "published",
  "rejected",
];

export function ModerationTable({ hideLegacy = false }: { hideLegacy?: boolean }) {
  const t = useTranslations("admin");
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("kejadian");
  const [laporanStatus, setLaporanStatus] = useState<LaporanStatusFilter>("submitted");
  const [legacyStatus, setLegacyStatus] = useState<ReportStatus | "all">("queued");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<LaporanItem[]>([]);
  const [legacyItems, setLegacyItems] = useState<LegacyItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const pageSize = 20;

  const laporanStatusLabel = useMemo(
    () => ({
      all: t("statusAll"),
      submitted: t("statusSubmitted"),
      in_review: t("statusInReview"),
      approved: t("statusApproved"),
      rejected: t("statusRejected"),
      needs_info: t("statusNeedsInfo"),
      archived: t("statusArchived"),
      draft: t("statusDraft"),
    }),
    [t]
  );

  const legacyStatusLabel = useMemo(
    () => ({
      all: t("statusAll"),
      queued: t("statusQueued"),
      published: t("statusPublished"),
      rejected: t("statusRejected"),
    }),
    [t]
  );

  async function load() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (q.trim()) params.set("q", q.trim());

    if (tab === "legacy") {
      if (hideLegacy) {
        setLoading(false);
        return;
      }
      if (legacyStatus !== "all") params.set("status", legacyStatus);
      const res = await fetch(`/api/admin/reports?${params.toString()}`, {
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as
        | { items?: LegacyItem[]; total?: number; error?: string }
        | null;
      if (!res.ok) {
        setError(data?.error || t("loadError"));
        setLoading(false);
        return;
      }
      setLegacyItems(data?.items ?? []);
      setItems([]);
      setTotal(data?.total ?? 0);
      setLoading(false);
      return;
    }

    params.set("tipe", tab);
    if (laporanStatus !== "all") params.set("status", laporanStatus);
    const res = await fetch(`/api/admin/laporan?${params.toString()}`, {
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as
      | { items?: LaporanItem[]; total?: number; error?: string }
      | null;
    if (!res.ok) {
      setError(data?.error || t("loadError"));
      setLoading(false);
      return;
    }
    setItems(data?.items ?? []);
    setLegacyItems([]);
    setTotal(data?.total ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    if (hideLegacy && tab === "legacy") setTab("kejadian");
  }, [hideLegacy, tab]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, laporanStatus, legacyStatus, page, hideLegacy]);

  async function patchLaporan(id: string, status: string, tampilDiPeta?: boolean) {
    setPendingId(id);
    const res = await fetch("/api/admin/laporan", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tipe: tab,
        id,
        status,
        tampil_di_peta: tampilDiPeta,
      }),
    });
    setPendingId(null);
    if (!res.ok) {
      setError(t("updateError"));
      return;
    }
    await load();
  }

  async function patchLegacy(id: string, status: ReportStatus) {
    setPendingId(id);
    const res = await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setPendingId(null);
    if (!res.ok) {
      setError(t("updateError"));
      return;
    }
    await load();
  }

  async function verifyAsIncident(id: string, existingId?: string | null) {
    if (existingId) {
      router.push({ pathname: "/admin/sik/kejadian/[id]", params: { id: existingId } });
      return;
    }
    setPendingId(id);
    const res = await fetch("/api/sik/verifikasi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ laporan_id: id }),
    });
    const data = (await res.json().catch(() => null)) as { kejadian_id?: string } | null;
    setPendingId(null);
    if (!res.ok || !data?.kejadian_id) {
      setError(t("updateError"));
      return;
    }
    router.push({ pathname: "/admin/sik/kejadian/[id]", params: { id: data.kejadian_id } });
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));
  const tabs: Tab[] = hideLegacy
    ? ["kejadian", "penanganan"]
    : ["kejadian", "penanganan", "legacy"];
  const listEmpty = tab === "legacy" ? legacyItems.length === 0 : items.length === 0;

  function laporanRowLabel(status: string): string {
    if (status === "submitted" || status === "in_review") return t("statusWaiting");
    return laporanStatusLabel[status as keyof typeof laporanStatusLabel] ?? status;
  }

  return (
    <GlassPanel className="flex flex-col gap-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("moderationTitle")}</h1>
          <p className={cn("mt-1 text-muted-foreground", TYPE_FLOOR_CLASS)}>{t("moderationLead")}</p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            void load();
          }}
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-52"
          />
          <Button type="submit" variant="outline" size="sm">
            {t("search")}
          </Button>
        </form>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label={t("moderationTabs")}>
        {tabs.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => {
              setTab(key);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              tab === key
                ? "bg-[var(--accent-dim)] font-medium text-[var(--accent)]"
                : "text-[var(--text-dim)] hover:bg-[var(--accent-dim)]"
            }`}
          >
            {key === "kejadian"
              ? t("tabKejadian")
              : key === "penanganan"
                ? t("tabPenanganan")
                : t("tabLegacy")}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {tab === "legacy"
          ? LEGACY_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setLegacyStatus(s);
                  setPage(1);
                }}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  legacyStatus === s
                    ? "bg-[var(--accent-dim)] font-medium text-[var(--accent)]"
                    : "text-[var(--text-dim)] hover:bg-[var(--accent-dim)]"
                }`}
              >
                {legacyStatusLabel[s]}
              </button>
            ))
          : LAPORAN_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setLaporanStatus(s);
                  setPage(1);
                }}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  laporanStatus === s
                    ? "bg-[var(--accent-dim)] font-medium text-[var(--accent)]"
                    : "text-[var(--text-dim)] hover:bg-[var(--accent-dim)]"
                }`}
              >
                {laporanStatusLabel[s]}
              </button>
            ))}
      </div>

      {error ? (
        <Empty className="border border-dashed" data-testid="moderation-error">
          <div className="flex flex-col items-center gap-3">
            <FieldError>{error}</FieldError>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={OUTLINE_PRIMARY_CLASS}
              onClick={() => void load()}
            >
              {t("retry")}
            </Button>
          </div>
        </Empty>
      ) : null}

      {!error && loading ? (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <tbody>
              {[0, 1, 2].map((row) => (
                <tr key={row} data-testid="moderation-skeleton-row">
                  <td className="px-2 py-3">
                    <Skeleton className="h-8 w-full" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {!error && !loading && listEmpty ? (
        <Empty className="border border-dashed" data-testid="moderation-empty">
          <EmptyDescription className={TYPE_FLOOR_CLASS}>
            {t("emptyKabDescription")}
          </EmptyDescription>
          <EmptyContent>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={OUTLINE_PRIMARY_CLASS}
              onClick={() => void load()}
            >
              {t("retry")}
            </Button>
          </EmptyContent>
        </Empty>
      ) : null}

      {!error && !loading && !listEmpty ? (
      <div className="overflow-x-auto">
        <table className={cn("min-w-full text-left", TYPE_FLOOR_CLASS)}>
          <thead className="text-[var(--text-dim)]">
            <tr>
              <th className="px-2 py-2 font-medium">{t("colStatus")}</th>
              <th className="px-2 py-2 font-medium">
                {tab === "legacy" ? t("colTopic") : t("colNomor")}
              </th>
              <th className="px-2 py-2 font-medium">{t("colDescription")}</th>
              <th className="px-2 py-2 font-medium">{t("colPlace")}</th>
              <th className="px-2 py-2 font-medium">{t("colCreated")}</th>
              <th className="px-2 py-2 font-medium">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {tab === "legacy"
              ? legacyItems.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--border)] align-top">
                    <td className="px-2 py-3">
                      <StatusBadge status={item.status} label={legacyStatusLabel[item.status]} />
                    </td>
                    <td className="px-2 py-3 capitalize">{item.topic}</td>
                    <td className="max-w-xs px-2 py-3 text-[var(--text-dim)]">{item.description}</td>
                    <td className="px-2 py-3 text-[var(--text-dim)]">
                      {item.placeName ?? "—"}
                      <div className={cn("opacity-70", TYPE_FLOOR_CLASS)}>
                        {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-[var(--text-dim)]">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-col gap-1">
                        {item.status !== "published" ? (
                          <PendingButton
                            size="sm"
                            pending={pendingId === item.id}
                            onClick={() => void patchLegacy(item.id, "published")}
                          >
                            {t("actionPublish")}
                          </PendingButton>
                        ) : null}
                        {item.status !== "rejected" ? (
                          <PendingButton
                            size="sm"
                            variant="destructive"
                            pending={pendingId === item.id}
                            onClick={() => void patchLegacy(item.id, "rejected")}
                          >
                            {t("actionReject")}
                          </PendingButton>
                        ) : null}
                        {item.status !== "queued" ? (
                          <PendingButton
                            size="sm"
                            variant="outline"
                            pending={pendingId === item.id}
                            onClick={() => void patchLegacy(item.id, "queued")}
                          >
                            {t("actionQueue")}
                          </PendingButton>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              : items.map((item) => (
                <tr key={item.id} className="border-t border-[var(--border)] align-top">
                  <td className="px-2 py-3">
                    <StatusBadge
                      status={item.status}
                      label={laporanRowLabel(item.status)}
                    />
                    {item.tampilDiPeta ? (
                      <div className={cn("mt-1 text-[var(--primary)]", TYPE_KICKER_CLASS)}>
                        {t("onMap")}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-2 py-3">
                    <div className="font-medium">{item.nomorLaporan}</div>
                    <div className={cn("capitalize text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                      {item.jenisBencana}
                      {item.topic ? ` · ${item.topic}` : ""}
                      {item.skorUrgensi != null ? ` · ${item.skorUrgensi}` : ""}
                    </div>
                  </td>
                  <td className="max-w-xs px-2 py-3 text-[var(--text-dim)]">
                    {item.ringkasan || "—"}
                  </td>
                  <td className="px-2 py-3 text-[var(--text-dim)]">
                    {[item.desa, item.kecamatan, item.kabupaten].filter(Boolean).join(", ") || "—"}
                    <div className={cn("opacity-70", TYPE_FLOOR_CLASS)}>
                      {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-2 py-3 text-[var(--text-dim)]">
                    {new Date(item.submittedAt).toLocaleString()}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex flex-col gap-1">
                      {item.tipe === "kejadian" ? (
                        item.kejadianId ? (
                          <Link
                            href={{ pathname: "/admin/sik/kejadian/[id]", params: { id: item.kejadianId } }}
                            className={cn("text-[var(--primary)] hover:underline", TYPE_FLOOR_CLASS)}
                          >
                            {t("navKejadianOps")}
                          </Link>
                        ) : (
                          <PendingButton
                            size="sm"
                            variant="outline"
                            pending={pendingId === item.id}
                            onClick={() => void verifyAsIncident(item.id, item.kejadianId)}
                          >
                            {t("actionVerifyIncident")}
                          </PendingButton>
                        )
                      ) : null}
                      {item.status !== "approved" ? (
                        <PendingButton
                          size="sm"
                          pending={pendingId === item.id}
                          onClick={() =>
                            void patchLaporan(item.id, "approved", true)
                          }
                        >
                          {t("actionApprove")}
                        </PendingButton>
                      ) : item.status === "approved" && !item.tampilDiPeta ? (
                        <PendingButton
                          size="sm"
                          pending={pendingId === item.id}
                          onClick={() => void patchLaporan(item.id, "approved", true)}
                        >
                          {t("actionShowMap")}
                        </PendingButton>
                      ) : null}
                      {item.status !== "rejected" ? (
                        <PendingButton
                          size="sm"
                          variant="destructive"
                          pending={pendingId === item.id}
                          onClick={() => void patchLaporan(item.id, "rejected")}
                        >
                          {t("actionReject")}
                        </PendingButton>
                      ) : null}
                      {item.status !== "in_review" ? (
                        <PendingButton
                          size="sm"
                          variant="outline"
                          pending={pendingId === item.id}
                          onClick={() => void patchLaporan(item.id, "in_review")}
                        >
                          {t("actionReview")}
                        </PendingButton>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between text-sm text-[var(--text-dim)]">
        <span>
          {t("showing", {
            from: total === 0 ? 0 : (page - 1) * pageSize + 1,
            to: Math.min(page * pageSize, total),
            total,
          })}
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t("prev")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("next")}
          </Button>
        </div>
      </div>
    </GlassPanel>
  );
}

function PendingButton({
  pending,
  children,
  ...props
}: ComponentProps<typeof Button> & { pending: boolean }) {
  return (
    <Button
      {...props}
      disabled={pending || props.disabled}
      data-icon={pending ? "inline-start" : undefined}
    >
      {pending ? <Spinner /> : null}
      {children}
    </Button>
  );
}
