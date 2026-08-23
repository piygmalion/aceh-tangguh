"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { ReportStatus, ReportTopic } from "@/lib/supabase/types";

type ReportItem = {
  id: string;
  topic: ReportTopic;
  description: string;
  longitude: number;
  latitude: number;
  placeName?: string;
  consentMapDisplay: boolean;
  status: ReportStatus;
  createdAt: string;
};

const STATUSES: Array<ReportStatus | "all"> = [
  "all",
  "queued",
  "published",
  "rejected",
];

export function ModerationTable() {
  const t = useTranslations("admin");
  const [status, setStatus] = useState<ReportStatus | "all">("queued");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ReportItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const pageSize = 20;

  const statusLabel = useMemo(
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
    if (status !== "all") params.set("status", status);
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/admin/reports?${params.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      setError(t("loadError"));
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { items: ReportItem[]; total: number };
    setItems(data.items);
    setTotal(data.total);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  async function setReportStatus(id: string, next: ReportStatus) {
    setPendingId(id);
    const res = await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    setPendingId(null);
    if (!res.ok) {
      setError(t("updateError"));
      return;
    }
    await load();
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

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

      <div className="mt-4 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`rounded-full px-3 py-1.5 text-sm transition ${
              status === s
                ? "bg-[var(--accent-dim)] font-medium text-[var(--accent)]"
                : "text-[var(--text-dim)] hover:bg-[var(--accent-dim)]"
            }`}
          >
            {statusLabel[s]}
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
              <th className="px-2 py-2 font-medium">{t("colTopic")}</th>
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
                    <StatusBadge status={item.status} label={statusLabel[item.status]} />
                  </td>
                  <td className="px-2 py-3 capitalize">{item.topic}</td>
                  <td className="max-w-xs px-2 py-3 text-[var(--text-dim)]">
                    {item.description}
                  </td>
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
                          onClick={() => void setReportStatus(item.id, "published")}
                        >
                          {t("actionPublish")}
                        </Button>
                      ) : null}
                      {item.status !== "rejected" ? (
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={pendingId === item.id}
                          onClick={() => void setReportStatus(item.id, "rejected")}
                        >
                          {t("actionReject")}
                        </Button>
                      ) : null}
                      {item.status !== "queued" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pendingId === item.id}
                          onClick={() => void setReportStatus(item.id, "queued")}
                        >
                          {t("actionQueue")}
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
