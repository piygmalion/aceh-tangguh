"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/GlassPanel";
import type { KejadianOperasiRow } from "@/lib/sik/db-tables";

export function KejadianOpsList() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [items, setItems] = useState<KejadianOperasiRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const sp = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (q.trim()) sp.set("q", q.trim());
    if (status) sp.set("status", status);
    const res = await fetch(`/api/sik/kejadian?${sp}`, { cache: "no-store" });
    if (!res.ok) {
      setError(t("loadError"));
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { items: KejadianOperasiRow[]; total: number };
    setItems(data.items);
    setTotal(data.total);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, status]);

  return (
    <GlassPanel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{t("navKejadianOps")}</h1>
          <p className="mt-1 text-sm text-[var(--text-dim)]">{t("overviewKejadian")}</p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/sik/kejadian/baru">{t("create")}</Link>
        </Button>
      </div>
      <form
        className="mt-4 flex flex-wrap gap-2"
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
          className="w-52 rounded-full border border-[var(--glass-border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="rounded-full border border-[var(--glass-border)] bg-[var(--bg)] px-3 py-2 text-sm"
        >
          <option value="">{t("statusAll")}</option>
          <option value="draft">{t("statusDraft")}</option>
          <option value="aktif">Aktif</option>
          <option value="selesai">Selesai</option>
          <option value="diarsipkan">Diarsipkan</option>
        </select>
        <Button type="submit" variant="outline" size="sm">
          {t("search")}
        </Button>
      </form>
      {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-[var(--text-dim)]">
            <tr>
              <th className="px-2 py-2 font-medium">{t("colNomor")}</th>
              <th className="px-2 py-2 font-medium">{t("colKib")}</th>
              <th className="px-2 py-2 font-medium">{t("colJenis")}</th>
              <th className="px-2 py-2 font-medium">{t("colPlace")}</th>
              <th className="px-2 py-2 font-medium">{t("colDate")}</th>
              <th className="px-2 py-2 font-medium">{t("colStatus")}</th>
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
              items.map((row) => (
                <tr key={row.id} className="border-t border-[var(--border)]">
                  <td className="px-2 py-3">
                    <Link href={{ pathname: "/admin/sik/kejadian/[id]", params: { id: row.id } }} className="font-medium hover:text-[var(--primary)]">
                      {row.nomor}
                    </Link>
                    <div className="text-xs text-[var(--text-dim)]">{row.nama_kejadian}</div>
                  </td>
                  <td className="px-2 py-3 font-mono text-xs">{row.kib ?? "—"}</td>
                  <td className="px-2 py-3">{row.jenis_bencana}</td>
                  <td className="px-2 py-3 text-[var(--text-dim)]">
                    {[row.desa_ringkas, row.kecamatan, row.kabupaten].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="whitespace-nowrap px-2 py-3 text-[var(--text-dim)]">
                    {new Date(row.waktu_kejadian).toLocaleString(locale)}
                  </td>
                  <td className="px-2 py-3">
                    <span className="capitalize">{row.status}</span>
                    <div className="text-xs text-[var(--text-dim)]">
                      {row.fase_data}
                      {row.is_bencana ? " · bencana" : ""}
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
          disabled={page * 20 >= total}
          onClick={() => setPage((p) => p + 1)}
        >
          {t("next")} {total ? `(${total})` : ""}
        </Button>
      </div>
    </GlassPanel>
  );
}
