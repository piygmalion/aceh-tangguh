"use client";

import { useQuery } from "@tanstack/react-query";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { fetchPublicApi } from "@/lib/preview/public-api";

type MitraItem = { slug: string; judul: string; isi_markdown: string };
type Agregat = {
  id: string;
  kabupaten: string;
  ragam: string;
  jumlah: number;
};

export function MitraPublic() {
  const { data } = useQuery({
    queryKey: ["mitra"],
    queryFn: async () => {
      const res = await fetchPublicApi("/api/sik/public?kind=mitra");
      if (!res.ok) throw new Error("mitra");
      return res.json() as Promise<{ items: MitraItem[] }>;
    },
  });
  const { data: disabilitas } = useQuery({
    queryKey: ["disabilitas-agregat"],
    queryFn: async () => {
      const res = await fetchPublicApi("/api/sik/public?kind=disabilitas");
      if (!res.ok) throw new Error("disabilitas");
      return res.json() as Promise<{ items: Agregat[] }>;
    },
  });

  const byKab = new Map<string, number>();
  for (const row of disabilitas?.items ?? []) {
    byKab.set(row.kabupaten, (byKab.get(row.kabupaten) ?? 0) + Number(row.jumlah ?? 0));
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        {(data?.items ?? []).map((row) => (
          <GlassPanel key={row.slug} className="p-5">
            <h2 className="text-lg font-semibold">{row.judul}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-dim)]">{row.isi_markdown}</p>
          </GlassPanel>
        ))}
      </div>
      <section>
        <h2 className="font-semibold">Agregat disabilitas (tanpa identitas)</h2>
        <p className="mt-1 text-sm text-[var(--text-dim)]">
          Angka per kabupaten dari input staf. Nama dan NIK tidak dipublikasikan.
        </p>
        {byKab.size === 0 ? (
          <p className="mt-3 text-sm text-[var(--text-dim)]">Belum ada data agregat.</p>
        ) : (
          <ul className="mt-3 space-y-1 text-sm">
            {Array.from(byKab.entries()).map(([kab, jumlah]) => (
              <li key={kab} className="flex justify-between border-t border-[var(--border)] py-2">
                <span>{kab}</span>
                <span>{jumlah}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
