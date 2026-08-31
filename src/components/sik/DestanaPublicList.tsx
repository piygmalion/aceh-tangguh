"use client";

import { useQuery } from "@tanstack/react-query";
import { destanaLevelLabel, type PkdLevel } from "@/lib/sik/pkd";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { fetchPublicApi } from "@/lib/preview/public-api";

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

export function DestanaPublicList() {
  const { data } = useQuery({
    queryKey: ["sik-destana"],
    queryFn: async () => {
      const res = await fetchPublicApi("/api/sik/public?kind=destana");
      if (!res.ok) throw new Error("destana");
      return res.json() as Promise<DestanaPayload>;
    },
  });

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(["utama", "madya", "pratama", "belum"] as const).map((level) => (
          <GlassPanel key={level} className="p-4">
            <p className="text-xs text-[var(--text-dim)]">{destanaLevelLabel(level)}</p>
            <p className="text-2xl font-semibold">{data?.counts?.[level] ?? 0}</p>
          </GlassPanel>
        ))}
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-[var(--text-dim)]">
            <tr>
              <th className="px-2 py-2">Desa</th>
              <th className="px-2 py-2">Kabupaten</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Indeks</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items ?? []).slice(0, 200).map((row) => (
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
    </div>
  );
}
