"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
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
            <p className="mt-1 text-sm text-muted-foreground">{t("cmsPublikasiLead")}</p>
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void load();
            }}
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("searchPlaceholder")}
              className="w-44"
            />
            <Button type="submit" size="sm" variant="outline">
              {t("search")}
            </Button>
          </form>
        </div>
        {error ? <FieldError className="mt-3">{error}</FieldError> : null}
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-muted-foreground">
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
                  <td colSpan={4} className="px-2 py-8 text-center text-muted-foreground">
                    {t("loading")}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-2 py-8 text-center text-muted-foreground">
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.slug} className="border-t border-border">
                    <td className="px-2 py-2 font-mono text-sm">{row.slug}</td>
                    <td className="px-2 py-2">{row.title}</td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {row.published_at
                        ? new Date(row.published_at).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEdit(row)}>
                          {t("edit")}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => void remove(row.slug)}>
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
        <FieldGroup className="mt-3 gap-3">
          <CmsField
            id="cms-publikasi-slug"
            label="Slug"
            value={form.slug}
            disabled={editing}
            onChange={(v) => setForm((f) => ({ ...f, slug: v }))}
          />
          <CmsField
            id="cms-publikasi-title"
            label={t("colTitle")}
            value={form.title}
            onChange={(v) => setForm((f) => ({ ...f, title: v }))}
          />
          <CmsField
            id="cms-publikasi-description"
            label={t("colDescription")}
            value={form.description}
            onChange={(v) => setForm((f) => ({ ...f, description: v }))}
            multiline
          />
          <CmsField
            id="cms-publikasi-published"
            label={t("colPublished")}
            value={form.published_at}
            onChange={(v) => setForm((f) => ({ ...f, published_at: v }))}
          />
          <CmsField
            id="cms-publikasi-tags"
            label="Tags"
            value={form.tags}
            onChange={(v) => setForm((f) => ({ ...f, tags: v }))}
          />
          <CmsField
            id="cms-publikasi-payload"
            label="Payload JSON"
            value={form.payload}
            onChange={(v) => setForm((f) => ({ ...f, payload: v }))}
            multiline
            mono
          />
          <div className="flex gap-2">
            <Button disabled={busy} onClick={() => void save()} data-icon={busy ? "inline-start" : undefined}>
              {busy ? <Spinner /> : null}
              {t("save")}
            </Button>
            <Button variant="ghost" onClick={startCreate}>
              {t("reset")}
            </Button>
          </div>
        </FieldGroup>
      </GlassPanel>
    </div>
  );
}

function CmsField({
  id,
  label,
  value,
  onChange,
  disabled,
  multiline,
  mono,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  multiline?: boolean;
  mono?: boolean;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {multiline ? (
        <Textarea
          id={id}
          rows={6}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={mono ? "font-mono" : undefined}
        />
      ) : (
        <Input
          id={id}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={mono ? "font-mono" : undefined}
        />
      )}
    </Field>
  );
}
