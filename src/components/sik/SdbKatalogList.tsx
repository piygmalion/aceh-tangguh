"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { GlassPanel } from "@/components/ui/GlassPanel";
import type { SdbKatalogRow } from "@/lib/sik/db-tables";

const KELAS_LABEL: Record<"terbuka" | "terbatas" | "rahasia", "kelasTerbuka" | "kelasTerbatas" | "kelasRahasia"> = {
  terbuka: "kelasTerbuka",
  terbatas: "kelasTerbatas",
  rahasia: "kelasRahasia",
};

function kelasAksesLabel(
  kelas: string,
  t: (key: "kelasTerbuka" | "kelasTerbatas" | "kelasRahasia") => string
): string {
  if (kelas === "terbuka" || kelas === "terbatas" || kelas === "rahasia") {
    return t(KELAS_LABEL[kelas]);
  }
  return kelas;
}

export function SdbKatalogList() {
  const t = useTranslations("sikSdb");
  const [items, setItems] = useState<SdbKatalogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const res = await fetch("/api/sik/sdb/katalog", { cache: "no-store" });
      if (!res.ok) {
        setError(t("loadError"));
        setLoading(false);
        return;
      }
      const data = (await res.json()) as { items: SdbKatalogRow[] };
      setItems(Array.isArray(data.items) ? data.items : []);
      setError(null);
      setLoading(false);
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <GlassPanel className="p-5">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--text-dim)]">{t("lead")}</p>
      </div>
      {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-[var(--text-dim)]">
            <tr>
              <th className="px-2 py-2 font-medium">{t("colKunci")}</th>
              <th className="px-2 py-2 font-medium">{t("colJudul")}</th>
              <th className="px-2 py-2 font-medium">{t("colKonsep")}</th>
              <th className="px-2 py-2 font-medium">{t("colDefinisi")}</th>
              <th className="px-2 py-2 font-medium">{t("colSatuan")}</th>
              <th className="px-2 py-2 font-medium">{t("colKlaster")}</th>
              <th className="px-2 py-2 font-medium">{t("colKelasAkses")}</th>
              <th className="px-2 py-2 font-medium">{t("colProdusen")}</th>
              <th className="px-2 py-2 font-medium">{t("colPeriodeKirim")}</th>
              <th className="px-2 py-2 font-medium">{t("colKodeReferensi")}</th>
              <th className="px-2 py-2 font-medium">{t("colTabelSumber")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="px-2 py-8 text-center text-[var(--text-dim)]">
                  {t("loading")}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-2 py-8 text-center text-[var(--text-dim)]">
                  {t("empty")}
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.kunci} className="border-t border-[var(--border)]">
                  <td className="px-2 py-3 font-mono text-xs">{row.kunci}</td>
                  <td className="px-2 py-3">{row.judul}</td>
                  <td className="px-2 py-3 text-[var(--text-dim)]">{row.konsep}</td>
                  <td className="max-w-xs px-2 py-3 text-[var(--text-dim)]">{row.definisi}</td>
                  <td className="px-2 py-3">{row.satuan?.trim() ? row.satuan : "—"}</td>
                  <td className="px-2 py-3">{row.klaster}</td>
                  <td className="px-2 py-3">{kelasAksesLabel(row.kelas_akses, t)}</td>
                  <td className="px-2 py-3">{row.produsen}</td>
                  <td className="px-2 py-3">{row.periode_kirim}</td>
                  <td className="px-2 py-3">{row.kode_referensi}</td>
                  <td className="px-2 py-3 font-mono text-xs">{row.tabel_sumber}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </GlassPanel>
  );
}
