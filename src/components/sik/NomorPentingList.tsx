"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { fetchPublicApi } from "@/lib/preview/public-api";

export function NomorPentingList() {
  const t = useTranslations("nomorPentingPublic");
  const { data } = useQuery({
    queryKey: ["nomor-penting"],
    queryFn: async () => {
      const res = await fetchPublicApi("/api/sik/public?kind=nomor-penting");
      if (!res.ok) throw new Error("nomor");
      return res.json() as Promise<{ items: Array<{ id: string; kategori: string; nama: string; telepon: string; kabupaten: string | null }> }>;
    },
  });
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {(data?.items ?? []).map((row) => (
        <GlassPanel key={row.id} className="p-4">
          <p className="text-xs uppercase text-[var(--text-dim)]">{row.kategori}</p>
          <p className="font-semibold">{row.nama}</p>
          <p className="mt-1 text-sm">{row.telepon}</p>
          {row.kabupaten ? <p className="text-xs text-[var(--text-dim)]">{row.kabupaten}</p> : null}
        </GlassPanel>
      ))}
      {(data?.items ?? []).length === 0 ? (
        <p className="text-sm text-[var(--text-dim)]">{t("empty")}</p>
      ) : null}
    </div>
  );
}
