"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { AdminListChrome, AdminPager, AdminTableStatusRow } from "@/components/admin/AdminListChrome";
import { Button } from "@/components/ui/button";
import type { KejadianOperasiRow } from "@/lib/sik/db-tables";

export function KejadianOpsList() {
  const t = useTranslations("admin");
  const tCalon = useTranslations("sikCalon");
  const tSdb = useTranslations("sikSdb");
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
    <AdminListChrome
      heading={t("navKejadianOps")}
      lead={t("overviewKejadian")}
      error={error}
      actions={
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/sik/kejadian/calon">
            <Button size="sm" variant="outline">
              {tCalon("navFromList")}
            </Button>
          </Link>
          <Link href="/admin/sik/sdb">
            <Button size="sm" variant="outline">
              {tSdb("navFromList")}
            </Button>
          </Link>
          <Link href="/admin/sik/kejadian/baru">
            <Button size="sm">{t("create")}</Button>
          </Link>
        </div>
      }
      footer={
        <AdminPager
          page={page}
          pageSize={20}
          total={total}
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
          prevLabel={t("prev")}
          nextLabel={t("next")}
        />
      }
    >
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
              <AdminTableStatusRow colSpan={6}>{t("loading")}</AdminTableStatusRow>
            ) : items.length === 0 ? (
              <AdminTableStatusRow colSpan={6}>{t("empty")}</AdminTableStatusRow>
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
    </AdminListChrome>
  );
}
