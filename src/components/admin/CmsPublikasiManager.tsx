"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/GlassPanel";
import type { PublikasiRow } from "@/lib/supabase/types";

const emptyForm = {
  slug: "",
  title: "",
  description: "",
  published_at: "",
  tags: "",
  payload: "{}",
};

export function CmsPublikasiManager() {
  const t = useTranslations("admin");
  const [items, setItems] = useState<PublikasiRow[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const params = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    const res = await fetch(`/api/admin/cms/publikasi${params}`, { cache: "no-store" });
    if (!res.ok) {
      setError(t("loadError"));
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { items: PublikasiRow[] };
    setItems(data.items);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCreate() {
    setEditing(false);
    setForm(emptyForm);
  }

  function startEdit(row: PublikasiRow) {
    setEditing(true);
    setForm({
      slug: row.slug,
      title: row.title,
      description: row.description ?? "",
      published_at: row.published_at ?? "",
      tags: (row.tags ?? []).join(", "),
      payload: JSON.stringify(row.payload ?? {}, null, 2),
    });
  }

  async function save() {
    setBusy(true);
    setError(null);
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(form.payload || "{}") as Record<string, unknown>;
    } catch {
      setError(t("invalidJson"));
      setBusy(false);
      return;
    }
    const body = {
      slug: form.slug.trim(),
      title: form.title.trim(),
      description: form.description.trim() || null,
      published_at: form.published_at.trim() || null,
      tags: form.tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      payload,
    };
    const res = await fetch("/api/admin/cms/publikasi", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(false);
    if (!res.ok) {
      setError(t("updateError"));
      return;
    }
    startCreate();
    await load();
  }

  async function remove(slug: string) {
    if (!window.confirm(t("confirmDelete"))) return;
    const res = await fetch(`/api/admin/cms/publikasi?slug=${encodeURIComponent(slug)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError(t("updateError"));
      return;
    }
    if (form.slug === slug) startCreate();
    await load();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <GlassPanel className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">{t("cmsPublikasiTitle")}</h1>
            <p className="mt-1 text-sm text-[var(--text-dim)]">{t("cmsPublikasiLead")}</p>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void load();
            }}
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-44 rounded-full border border-[var(--glass-border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--ring)]"
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
                <th className="px-2 py-2 font-medium">Slug</th>
                <th className="px-2 py-2 font-medium">{t("colTitle")}</th>
                <th className="px-2 py-2 font-medium">{t("colPublished")}</th>
                <th className="px-2 py-2 font-medium">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-2 py-8 text-center text-[var(--text-dim)]">
                    {t("loading")}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-8 text-center text-[var(--text-dim)]">
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.slug} className="border-t border-[var(--border)]">
                    <td className="px-2 py-2 font-mono text-xs">{row.slug}</td>
                    <td className="px-2 py-2">{row.title}</td>
                    <td className="px-2 py-2 text-[var(--text-dim)]">
                      {row.published_at
                        ? new Date(row.published_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEdit(row)}>
                          {t("edit")}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => void remove(row.slug)}>
                          {t("delete")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassPanel>

      <GlassPanel className="h-fit p-4 sm:p-5">
        <h2 className="font-semibold">{editing ? t("edit") : t("create")}</h2>
        <div className="mt-3 flex flex-col gap-3 text-sm">
          <Field
            label="Slug"
            value={form.slug}
            disabled={editing}
            onChange={(v) => setForm((f) => ({ ...f, slug: v }))}
          />
          <Field
            label={t("colTitle")}
            value={form.title}
            onChange={(v) => setForm((f) => ({ ...f, title: v }))}
          />
          <Field
            label={t("colDescription")}
            value={form.description}
            onChange={(v) => setForm((f) => ({ ...f, description: v }))}
            multiline
          />
          <Field
            label={t("colPublished")}
            value={form.published_at}
            onChange={(v) => setForm((f) => ({ ...f, published_at: v }))}
          />
          <Field
            label="Tags"
            value={form.tags}
            onChange={(v) => setForm((f) => ({ ...f, tags: v }))}
          />
          <Field
            label="Payload JSON"
            value={form.payload}
            onChange={(v) => setForm((f) => ({ ...f, payload: v }))}
            multiline
            mono
          />
          <div className="flex gap-2">
            <Button disabled={busy} onClick={() => void save()}>
              {t("save")}
            </Button>
            <Button variant="ghost" onClick={startCreate}>
              {t("reset")}
            </Button>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  multiline,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  multiline?: boolean;
  mono?: boolean;
}) {
  const cls = `w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--ring)] ${
    mono ? "font-mono text-xs" : ""
  }`;
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium text-[var(--text-dim)]">{label}</span>
      {multiline ? (
        <textarea
          rows={6}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      ) : (
        <input
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
        />
      )}
    </label>
  );
}
