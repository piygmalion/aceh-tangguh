"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { AdminPager } from "@/components/admin/AdminListChrome";
import { listWindow } from "@/lib/list-window";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { KejadianBencanaRow } from "@/lib/supabase/types";

const emptyForm = {
  id: "",
  jenis_bencana: "",
  hari_tanggal: "",
  kabupaten: "",
  kecamatan: "",
  desa: "",
  longitude: "",
  latitude: "",
  payload: "{}",
};

export function CmsKejadianManager() {
  const t = useTranslations("admin");
  const [items, setItems] = useState<KejadianBencanaRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const pageSize = 20;

  async function load() {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/admin/cms/kejadian?${params}`, { cache: "no-store" });
    if (!res.ok) {
      setError(t("loadError"));
      setLoading(false);
      return;
    }
    const data = (await res.json()) as {
      items: KejadianBencanaRow[];
      total: number;
    };
    setItems(data.items);
    setTotal(data.total);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function startCreate() {
    setEditing(false);
    setForm(emptyForm);
  }

  function startEdit(row: KejadianBencanaRow) {
    setEditing(true);
    setForm({
      id: row.id,
      jenis_bencana: row.jenis_bencana,
      hari_tanggal: row.hari_tanggal ?? "",
      kabupaten: row.kabupaten ?? "",
      kecamatan: row.kecamatan ?? "",
      desa: row.desa ?? "",
      longitude: row.longitude == null ? "" : String(row.longitude),
      latitude: row.latitude == null ? "" : String(row.latitude),
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
    const lon = form.longitude.trim() ? Number(form.longitude) : null;
    const lat = form.latitude.trim() ? Number(form.latitude) : null;
    if (
      (lon != null && !Number.isFinite(lon)) ||
      (lat != null && !Number.isFinite(lat))
    ) {
      setError(t("invalidCoords"));
      setBusy(false);
      return;
    }
    const body = {
      id: form.id.trim() || `kb-${Date.now()}`,
      jenis_bencana: form.jenis_bencana.trim(),
      hari_tanggal: form.hari_tanggal.trim() || null,
      kabupaten: form.kabupaten.trim() || null,
      kecamatan: form.kecamatan.trim() || null,
      desa: form.desa.trim() || null,
      longitude: lon,
      latitude: lat,
      payload,
    };
    const res = await fetch("/api/admin/cms/kejadian", {
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

  async function remove(id: string) {
    if (!window.confirm(t("confirmDelete"))) return;
    const res = await fetch(`/api/admin/cms/kejadian?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError(t("updateError"));
      return;
    }
    if (form.id === id) startCreate();
    await load();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <GlassPanel className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">{t("cmsKejadianTitle")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("cmsKejadianLead")}</p>
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
                <th className="px-2 py-2 font-medium">ID</th>
                <th className="px-2 py-2 font-medium">{t("colJenis")}</th>
                <th className="px-2 py-2 font-medium">{t("colPlace")}</th>
                <th className="px-2 py-2 font-medium">{t("colDate")}</th>
                <th className="px-2 py-2 font-medium">{t("colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-2 py-8 text-center text-muted-foreground">
                    {t("loading")}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-8 text-center text-muted-foreground">
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="border-t border-border">
                    <td className="px-2 py-2 font-mono text-sm">{row.id}</td>
                    <td className="px-2 py-2">{row.jenis_bencana}</td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {[row.kabupaten, row.kecamatan, row.desa].filter(Boolean).join(" · ") ||
                        "—"}
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">
                      {row.hari_tanggal ?? "—"}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEdit(row)}>
                          {t("edit")}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => void remove(row.id)}>
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
      </GlassPanel>

      <GlassPanel className="h-fit p-4 sm:p-5">
        <h2 className="font-semibold">{editing ? t("edit") : t("create")}</h2>
        <FieldGroup className="mt-3 gap-3">
          {(
            [
              ["id", "ID", editing],
              ["jenis_bencana", t("colJenis"), false],
              ["hari_tanggal", t("colDate"), false],
              ["kabupaten", "Kabupaten", false],
              ["kecamatan", "Kecamatan", false],
              ["desa", "Desa", false],
              ["longitude", "Longitude", false],
              ["latitude", "Latitude", false],
            ] as const
          ).map(([key, label, disabled]) => (
            <Field key={key}>
              <FieldLabel htmlFor={`cms-kejadian-${key}`}>{label}</FieldLabel>
              <Input
                id={`cms-kejadian-${key}`}
                disabled={disabled}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </Field>
          ))}
          <Field>
            <FieldLabel htmlFor="cms-kejadian-payload">Payload JSON</FieldLabel>
            <Textarea
              id="cms-kejadian-payload"
              rows={7}
              value={form.payload}
              onChange={(e) => setForm((f) => ({ ...f, payload: e.target.value }))}
              className="font-mono"
            />
          </Field>
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
