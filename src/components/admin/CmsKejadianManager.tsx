"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button-legacy";
import { GlassPanel } from "@/components/ui/GlassPanel";
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

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <GlassPanel className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold">{t("cmsKejadianTitle")}</h1>
            <p className="mt-1 text-sm text-[var(--text-dim)]">{t("cmsKejadianLead")}</p>
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
                  <td colSpan={5} className="px-2 py-8 text-center text-[var(--text-dim)]">
                    {t("loading")}
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-8 text-center text-[var(--text-dim)]">
                    {t("empty")}
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--border)]">
                    <td className="px-2 py-2 font-mono text-xs">{row.id}</td>
                    <td className="px-2 py-2">{row.jenis_bencana}</td>
                    <td className="px-2 py-2 text-[var(--text-dim)]">
                      {[row.kabupaten, row.kecamatan, row.desa].filter(Boolean).join(" · ") ||
                        "—"}
                    </td>
                    <td className="px-2 py-2 text-[var(--text-dim)]">
                      {row.hari_tanggal ?? "—"}
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEdit(row)}>
                          {t("edit")}
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => void remove(row.id)}>
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
        <div className="mt-4 flex justify-end gap-2">
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
      </GlassPanel>

      <GlassPanel className="h-fit p-4 sm:p-5">
        <h2 className="font-semibold">{editing ? t("edit") : t("create")}</h2>
        <div className="mt-3 flex flex-col gap-3 text-sm">
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
            <label key={key} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--text-dim)]">{label}</span>
              <input
                disabled={disabled}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg)] px-3 py-2 outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
            </label>
          ))}
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-[var(--text-dim)]">Payload JSON</span>
            <textarea
              rows={7}
              value={form.payload}
              onChange={(e) => setForm((f) => ({ ...f, payload: e.target.value }))}
              className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg)] px-3 py-2 font-mono text-xs outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
          </label>
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
