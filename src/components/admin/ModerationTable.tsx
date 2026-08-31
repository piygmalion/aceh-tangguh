"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { ReportStatus } from "@/lib/supabase/types";
import { TYPE_KICKER_CLASS } from "@/lib/type-floor";
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

export function ModerationTable() {
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
      if (legacyStatus !== "all") params.set("status", legacyStatus);
      const res = await fetch(`/api/admin/reports?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        setError(t("loadError"));
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { items: LegacyItem[]; total: number };
      setLegacyItems(data.items);
      setItems([]);
      setTotal(data.total);
      setLoading(false);
      return;
    }

    params.set("tipe", tab);
    if (laporanStatus !== "all") params.set("status", laporanStatus);
    const res = await fetch(`/api/admin/laporan?${params.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      setError(t("loadError"));
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { items: LaporanItem[]; total: number };
    setItems(data.items);
    setLegacyItems([]);
    setTotal(data.total);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, laporanStatus, legacyStatus, page]);

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
  const tabs: Tab[] = ["kejadian", "penanganan", "legacy"];

  return (
    <GlassPanel className="p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">{t("moderationTitle")}</h1>
          <p className="mt-1 text-sm text-[var(--text-dim)]">{t("moderationLead")}</p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            void load();
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-52 rounded-full border border-[var(--glass-border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none ring-[var(--ring)] focus:ring-2"
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
        <p className="mt-4 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
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
            {loading ? (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-center text-[var(--text-dim)]">
                  {t("loading")}
                </td>
              </tr>
            ) : tab === "legacy" ? (
              legacyItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-8 text-center text-[var(--text-dim)]">
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                legacyItems.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--border)] align-top">
                    <td className="px-2 py-3">
                      <StatusBadge status={item.status} label={legacyStatusLabel[item.status]} />
                    </td>
                    <td className="px-2 py-3 capitalize">{item.topic}</td>
                    <td className="max-w-xs px-2 py-3 text-[var(--text-dim)]">{item.description}</td>
                    <td className="px-2 py-3 text-[var(--text-dim)]">
                      {item.placeName ?? "—"}
                      <div className="text-xs opacity-70">
                        {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-2 py-3 text-[var(--text-dim)]">
                      {new Date(item.createdAt).toLocaleString()}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-col gap-1">
                        {item.status !== "published" ? (
                          <Button
                            size="sm"
                            disabled={pendingId === item.id}
                            onClick={() => void patchLegacy(item.id, "published")}
                          >
                            {t("actionPublish")}
                          </Button>
                        ) : null}
                        {item.status !== "rejected" ? (
                          <Button
                            size="sm"
                            variant="danger"
                            disabled={pendingId === item.id}
                            onClick={() => void patchLegacy(item.id, "rejected")}
                          >
                            {t("actionReject")}
                          </Button>
                        ) : null}
                        {item.status !== "queued" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pendingId === item.id}
                            onClick={() => void patchLegacy(item.id, "queued")}
                          >
                            {t("actionQueue")}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-2 py-8 text-center text-[var(--text-dim)]">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-[var(--border)] align-top">
                  <td className="px-2 py-3">
                    <StatusBadge
                      status={item.status}
                      label={
                        laporanStatusLabel[item.status as keyof typeof laporanStatusLabel] ??
                        item.status
                      }
                    />
                    {item.tampilDiPeta ? (
                      <div className={cn("mt-1 text-[var(--accent)]", TYPE_KICKER_CLASS)}>
                        {t("onMap")}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-2 py-3">
                    <div className="font-medium">{item.nomorLaporan}</div>
                    <div className="text-xs capitalize text-[var(--text-dim)]">
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
                    <div className="text-xs opacity-70">
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
                            className="text-xs text-[var(--primary)] hover:underline"
                          >
                            {t("navKejadianOps")}
                          </Link>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={pendingId === item.id}
                            onClick={() => void verifyAsIncident(item.id, item.kejadianId)}
                          >
                            {t("actionVerifyIncident")}
                          </Button>
                        )
                      ) : null}
                      {item.status !== "approved" ? (
                        <Button
                          size="sm"
                          disabled={pendingId === item.id}
                          onClick={() =>
                            void patchLaporan(item.id, "approved", true)
                          }
                        >
                          {t("actionApprove")}
                        </Button>
                      ) : item.status === "approved" && !item.tampilDiPeta ? (
                        <Button
                          size="sm"
                          disabled={pendingId === item.id}
                          onClick={() => void patchLaporan(item.id, "approved", true)}
                        >
                          {t("actionShowMap")}
                        </Button>
                      ) : null}
                      {item.status !== "rejected" ? (
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={pendingId === item.id}
                          onClick={() => void patchLaporan(item.id, "rejected")}
                        >
                          {t("actionReject")}
                        </Button>
                      ) : null}
                      {item.status !== "in_review" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pendingId === item.id}
                          onClick={() => void patchLaporan(item.id, "in_review")}
                        >
                          {t("actionReview")}
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

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
