"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/GlassPanel";
import {
  ADMIN_TABLES,
  ADMIN_TABLE_KEYS,
  type AdminColumn,
  type AdminTableConfig,
  type AdminTableKey,
} from "@/lib/auth/tables";

type Row = Record<string, unknown>;

export function DatabaseExplorer() {
  const t = useTranslations("admin");
  const [table, setTable] = useState<AdminTableKey>("reports");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [config, setConfig] = useState<AdminTableConfig>(ADMIN_TABLES.reports);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const pageSize = 20;

  const listColumns = useMemo(
    () => config.columns.filter((c) => c.type !== "json").slice(0, 6),
    [config]
  );

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({
      table,
      page: String(page),
      pageSize: String(pageSize),
    });
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/admin/database?${params}`, { cache: "no-store" });
    if (!res.ok) {
      setError(t("loadError"));
      setLoading(false);
      return;
    }
    const data = (await res.json()) as {
      table: AdminTableConfig;
      items: Row[];
      total: number;
    };
    setConfig(data.table);
    setItems(data.items);
    setTotal(data.total);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, page]);

  function openEdit(row: Row) {
    setEditing(row);
    const next: Record<string, string> = {};
    for (const col of config.columns) {
      const value = row[col.key];
      next[col.key] =
        col.type === "json" ? JSON.stringify(value ?? null, null, 2) : value == null ? "" : String(value);
    }
    setDraft(next);
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    setError(null);
    const patch: Record<string, unknown> = {};
    for (const col of config.columns) {
      if (!col.editable) continue;
      const raw = draft[col.key] ?? "";
      try {
        patch[col.key] = parseColumn(col, raw);
      } catch {
        setError(t("invalidJson"));
        setBusy(false);
        return;
      }
    }
    const res = await fetch("/api/admin/database", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table,
        id: String(editing[config.pk]),
        patch,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(t("updateError"));
      return;
    }
    setEditing(null);
    await load();
  }

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <GlassPanel className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold">{t("dbTitle")}</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">{t("dbLead")}</p>
      {config.note ? (
        <p className="mt-2 text-xs text-[var(--text-dim)]">{config.note}</p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-xs text-[var(--text-dim)]">{t("dbTable")}</span>
          <select
            value={table}
            onChange={(e) => {
              setTable(e.target.value as AdminTableKey);
              setPage(1);
              setEditing(null);
            }}
            className="rounded-full border border-[var(--glass-border)] bg-[var(--bg)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--ring)]"
          >
            {ADMIN_TABLE_KEYS.map((key) => (
              <option key={key} value={key}>
                {ADMIN_TABLES[key].label}
              </option>
            ))}
          </select>
        </label>
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
            className="w-52 rounded-full border border-[var(--glass-border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
          <Button type="submit" size="sm" variant="outline">
            {t("search")}
          </Button>
        </form>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-[var(--text-dim)]">
            <tr>
              {listColumns.map((col) => (
                <th key={col.key} className="px-2 py-2 font-medium">
                  {col.label}
                </th>
              ))}
              <th className="px-2 py-2 font-medium">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={listColumns.length + 1}
                  className="px-2 py-8 text-center text-[var(--text-dim)]"
                >
                  {t("loading")}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={listColumns.length + 1}
                  className="px-2 py-8 text-center text-[var(--text-dim)]"
                >
                  {t("empty")}
                </td>
              </tr>
            ) : (
              items.map((row, i) => (
                <tr key={String(row[config.pk] ?? i)} className="border-t border-[var(--border)]">
                  {listColumns.map((col) => (
                    <td key={col.key} className="max-w-[14rem] truncate px-2 py-2">
                      {formatCell(row[col.key])}
                    </td>
                  ))}
                  <td className="px-2 py-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                      {t("edit")}
                    </Button>
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
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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

      {editing ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div className="glass max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl p-5">
            <h2 className="text-lg font-semibold">{t("edit")}</h2>
            <p className="mt-1 font-mono text-xs text-[var(--text-dim)]">
              {config.pk}: {String(editing[config.pk])}
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {config.columns.map((col) => (
                <label key={col.key} className="flex flex-col gap-1 text-sm">
                  <span className="text-xs text-[var(--text-dim)]">
                    {col.label}
                    {!col.editable ? ` · ${t("readOnly")}` : ""}
                  </span>
                  {col.type === "select" && col.options ? (
                    <select
                      disabled={!col.editable}
                      value={draft[col.key] ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [col.key]: e.target.value }))
                      }
                      className="rounded-xl border border-[var(--glass-border)] bg-[var(--bg)] px-3 py-2"
                    >
                      {col.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : col.type === "boolean" ? (
                    <input
                      type="checkbox"
                      disabled={!col.editable}
                      checked={draft[col.key] === "true"}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          [col.key]: e.target.checked ? "true" : "false",
                        }))
                      }
                    />
                  ) : col.type === "json" ? (
                    <textarea
                      rows={6}
                      disabled={!col.editable}
                      value={draft[col.key] ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [col.key]: e.target.value }))
                      }
                      className="rounded-xl border border-[var(--glass-border)] bg-[var(--bg)] px-3 py-2 font-mono text-xs"
                    />
                  ) : (
                    <input
                      disabled={!col.editable}
                      value={draft[col.key] ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [col.key]: e.target.value }))
                      }
                      className="rounded-xl border border-[var(--glass-border)] bg-[var(--bg)] px-3 py-2"
                    />
                  )}
                </label>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                {t("cancel")}
              </Button>
              <Button disabled={busy} onClick={() => void save()}>
                {t("save")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </GlassPanel>
  );
}

function formatCell(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function parseColumn(col: AdminColumn, raw: string): unknown {
  if (col.type === "boolean") return raw === "true";
  if (col.type === "number") {
    if (raw.trim() === "") return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) throw new Error("number");
    return n;
  }
  if (col.type === "json") {
    if (raw.trim() === "") return col.key === "tags" ? [] : {};
    return JSON.parse(raw);
  }
  if (raw.trim() === "") return null;
  return raw;
}
