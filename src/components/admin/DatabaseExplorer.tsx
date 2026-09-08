"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { AdminPager } from "@/components/admin/AdminListChrome";
import { listWindow } from "@/lib/list-window";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { CmsCoverField } from "@/components/admin/CmsCoverField";
import { isCmsCoverUrlColumn } from "@/lib/cms/cover-fields";
import {
  ADMIN_TABLES,
  ADMIN_TABLE_KEYS,
  type AdminColumn,
  type AdminTableConfig,
  type AdminTableKey,
} from "@/lib/auth/tables";

type Row = Record<string, unknown>;

const selectClassName =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

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
  const [creating, setCreating] = useState(false);
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
    setCreating(false);
    setEditing(row);
    const next: Record<string, string> = {};
    for (const col of config.columns) {
      const value = row[col.key];
      next[col.key] =
        col.type === "json" ? JSON.stringify(value ?? null, null, 2) : value == null ? "" : String(value);
    }
    setDraft(next);
  }

  function openCreate() {
    setEditing(null);
    setCreating(true);
    const next: Record<string, string> = {};
    for (const col of config.columns) {
      if (col.key === "updated_at") continue;
      if (col.type === "boolean") next[col.key] = "false";
      else if (col.type === "json") next[col.key] = col.key === "tags" ? "[]" : "[]";
      else next[col.key] = "";
    }
    setDraft(next);
  }

  function closeForm() {
    setEditing(null);
    setCreating(false);
  }

  function columnWritable(col: AdminColumn): boolean {
    if (creating) return col.key !== "updated_at";
    return col.editable;
  }

  async function save() {
    if (!creating && !editing) return;
    setBusy(true);
    setError(null);
    const payload: Record<string, unknown> = {};
    for (const col of config.columns) {
      if (!columnWritable(col)) continue;
      const raw = draft[col.key] ?? "";
      try {
        payload[col.key] = parseColumn(col, raw);
      } catch {
        setError(t("invalidJson"));
        setBusy(false);
        return;
      }
    }
    const res = await fetch("/api/admin/database", {
      method: creating ? "POST" : "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        creating
          ? { table, row: payload }
          : {
              table,
              id: String(editing![config.pk]),
              patch: payload,
            }
      ),
    });
    setBusy(false);
    if (!res.ok) {
      setError(t("updateError"));
      return;
    }
    closeForm();
    await load();
  }

  async function removeRow(row: Row) {
    if (!config.allowDelete) return;
    if (!window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/database", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table, id: String(row[config.pk]) }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(t("updateError"));
      return;
    }
    await load();
  }

  const formOpen = editing != null || creating;

  return (
    <GlassPanel className="p-4 sm:p-6">
      <h1 className="text-xl font-semibold">{t("dbTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("dbLead")}</p>
      {config.note ? (
        <p className="mt-2 text-sm text-muted-foreground">{config.note}</p>
      ) : null}

      <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <Field className="w-auto">
          <FieldLabel htmlFor="db-table">{t("dbTable")}</FieldLabel>
          <select
            id="db-table"
            value={table}
            onChange={(e) => {
              setTable(e.target.value as AdminTableKey);
              setPage(1);
              setEditing(null);
              setCreating(false);
            }}
            className={selectClassName}
          >
            {ADMIN_TABLE_KEYS.map((key) => (
              <option key={key} value={key}>
                {ADMIN_TABLES[key].label}
              </option>
            ))}
          </select>
        </Field>
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
          <Button type="submit" size="sm" variant="outline">
            {t("search")}
          </Button>
          {config.allowInsert ? (
            <Button type="button" size="sm" onClick={openCreate}>
              {t("create")}
            </Button>
          ) : null}
        </form>
      </div>

      {error ? <FieldError className="mt-3">{error}</FieldError> : null}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-muted-foreground">
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
                  className="px-2 py-8 text-center text-muted-foreground"
                >
                  {t("loading")}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={listColumns.length + 1}
                  className="px-2 py-8 text-center text-muted-foreground"
                >
                  {t("empty")}
                </td>
              </tr>
            ) : (
              items.map((row, i) => (
                <tr key={String(row[config.pk] ?? i)} className="border-t border-border">
                  {listColumns.map((col) => (
                    <td key={col.key} className="max-w-[14rem] truncate px-2 py-2">
                      {formatCell(row[col.key])}
                    </td>
                  ))}
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                        {t("edit")}
                      </Button>
                      {config.allowDelete ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => void removeRow(row)}
                        >
                          {t("delete")}
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

      <AdminPager
        page={page}
        pageSize={pageSize}
        total={total}
        showingLabel={t("showing", listWindow(page, pageSize, total))}
        onPrev={() => setPage((p) => p - 1)}
        onNext={() => setPage((p) => p + 1)}
        prevLabel={t("prev")}
        nextLabel={t("next")}
      />

      <Dialog open={formOpen} onOpenChange={(open) => { if (!open) closeForm(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader className="flex flex-col gap-1.5">
            <DialogTitle>{creating ? t("create") : t("edit")}</DialogTitle>
            {!creating && editing ? (
              <DialogDescription className="font-mono">
                {config.pk}: {String(editing[config.pk])}
              </DialogDescription>
            ) : (
              <DialogDescription className="sr-only">{t("dbTitle")}</DialogDescription>
            )}
          </DialogHeader>
          <FieldGroup className="gap-3">
            {config.columns.map((col) => {
              const writable = columnWritable(col);
              const fieldId = `db-field-${col.key}`;
              return (
                <Field key={col.key} orientation={col.type === "boolean" ? "horizontal" : "vertical"}>
                  <FieldLabel htmlFor={fieldId}>
                    {col.label}
                    {!writable ? ` · ${t("readOnly")}` : ""}
                  </FieldLabel>
                  {col.type === "select" && col.options ? (
                    <select
                      id={fieldId}
                      disabled={!writable}
                      value={draft[col.key] ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [col.key]: e.target.value }))
                      }
                      className={selectClassName}
                    >
                      {col.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : col.type === "boolean" ? (
                    <input
                      id={fieldId}
                      type="checkbox"
                      disabled={!writable}
                      checked={draft[col.key] === "true"}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          [col.key]: e.target.checked ? "true" : "false",
                        }))
                      }
                    />
                  ) : col.type === "json" ? (
                    <Textarea
                      id={fieldId}
                      rows={6}
                      disabled={!writable}
                      value={draft[col.key] ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [col.key]: e.target.value }))
                      }
                      className="font-mono"
                    />
                  ) : isCmsCoverUrlColumn(col.key) ? (
                    <CmsCoverField
                      id={fieldId}
                      disabled={!writable}
                      value={draft[col.key] ?? ""}
                      onUrl={(url) => setDraft((d) => ({ ...d, [col.key]: url }))}
                    />
                  ) : (
                    <Input
                      id={fieldId}
                      disabled={!writable}
                      value={draft[col.key] ?? ""}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, [col.key]: e.target.value }))
                      }
                    />
                  )}
                </Field>
              );
            })}
          </FieldGroup>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={closeForm}>
              {t("cancel")}
            </Button>
            <Button disabled={busy} onClick={() => void save()} data-icon={busy ? "inline-start" : undefined}>
              {busy ? <Spinner /> : null}
              {t("save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
