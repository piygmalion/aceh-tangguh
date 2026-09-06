"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { destanaLevelLabel, type PkdLevel } from "@/lib/sik/pkd";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

type DestanaPayload = {
  items: Array<{
    id: string;
    nama: string;
    kabupaten: string | null;
    destana_level: string | null;
    destana_indeks: number | null;
  }>;
  counts: Record<string, number>;
};

const LEVELS = ["utama", "madya", "pratama", "belum"] as const;

export function DestanaPublicList() {
  const t = useTranslations("destanaPublic");
  const { data, isPending } = useQuery({
    queryKey: ["sik-destana"],
    queryFn: async () => {
      const res = await fetchPublicApi("/api/sik/public?kind=destana");
      if (!res.ok) throw new Error("destana");
      return res.json() as Promise<DestanaPayload>;
    },
  });

  const items = data?.items ?? [];
  const listEmpty = !isPending && items.length === 0;

  return (
    <div className="flex flex-col gap-6">
      {isPending ? (
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          data-testid="destana-public-skeleton"
        >
          {LEVELS.map((level) => (
            <GlassPanel key={level} className="flex flex-col gap-2 p-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-12" />
            </GlassPanel>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {LEVELS.map((level) => (
            <GlassPanel key={level} className="flex flex-col gap-1 p-4">
              <p className={cn(TYPE_FLOOR_CLASS, "text-[var(--text-dim)]")}>
                {destanaLevelLabel(level)}
              </p>
              <p className="text-2xl font-semibold">{data?.counts?.[level] ?? 0}</p>
            </GlassPanel>
          ))}
        </div>
      )}
      {isPending ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      ) : listEmpty ? (
        <Empty className="border border-dashed" data-testid="destana-public-empty">
          <EmptyDescription className={TYPE_FLOOR_CLASS}>{t("lead")}</EmptyDescription>
        </Empty>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[var(--text-dim)]">
              <tr>
                <th className="px-2 py-2">{t("colDesa")}</th>
                <th className="px-2 py-2">{t("colKabupaten")}</th>
                <th className="px-2 py-2">{t("colStatus")}</th>
                <th className="px-2 py-2">{t("colIndeks")}</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 200).map((row) => (
                <tr key={row.id} className="border-t border-[var(--border)]">
                  <td className="px-2 py-2">{row.nama}</td>
                  <td className="px-2 py-2">{row.kabupaten ?? "—"}</td>
                  <td className="px-2 py-2">
                    {destanaLevelLabel((row.destana_level as PkdLevel) || "belum")}
                  </td>
                  <td className="px-2 py-2">{row.destana_indeks ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
