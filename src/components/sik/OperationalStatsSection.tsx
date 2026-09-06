"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import { JENIS_BENCANA_JUKLAK } from "@/lib/sik/jenis-bencana";

type Stats = {
  total: number;
  year: number;
  byJenis: { jenis: string; count: number }[];
  items: Array<{
    id: string;
    nomor: string;
    nama_kejadian: string;
    jenis_bencana: string;
    kabupaten: string | null;
    waktu_kejadian: string;
  }>;
};

async function fetchStats(year: string, kabupaten: string, jenis: string): Promise<Stats> {
  const sp = new URLSearchParams({ kind: "stats", tahun: year });
  if (kabupaten) sp.set("kabupaten", kabupaten);
  if (jenis) sp.set("jenis", jenis);
  const res = await fetchPublicApi(`/api/sik/public?${sp}`);
  if (!res.ok) throw new Error("stats");
  return res.json();
}

export function OperationalStatsSection() {
  const locale = useLocale();
  const tn = useTranslations("nav");
  const yearNow = String(new Date().getFullYear());
  const [year, setYear] = useState(yearNow);
  const [kabupaten, setKabupaten] = useState("");
  const [jenis, setJenis] = useState("");
  const { data } = useQuery({
    queryKey: qk.sikStats(year, kabupaten, jenis),
    queryFn: () => fetchStats(year, kabupaten, jenis),
  });

  const years = useMemo(() => {
    const y = Number(yearNow);
    return [y, y - 1, y - 2].map(String);
  }, [yearNow]);

  return (
    <section className="section-shell mt-16 md:mt-24" id="sik">
      <div className="max-w-2xl">
        <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Kejadian operasional Aceh</h2>
        <p className="mt-3 text-[var(--text-dim)]">
          Ringkasan kejadian yang dicatat Pusdalops BPBA/BPBD. Default satu tahun berjalan, dapat disaring per kabupaten dan jenis.
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <select
          className="rounded-full border border-[var(--glass-border)] bg-[var(--bg)] px-3 py-2 text-sm"
          value={year}
          onChange={(e) => setYear(e.target.value)}
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <input
          className="rounded-full border border-[var(--glass-border)] bg-[var(--bg)] px-3 py-2 text-sm"
          placeholder="Kabupaten/Kota"
          value={kabupaten}
          onChange={(e) => setKabupaten(e.target.value)}
        />
        <select
          className="rounded-full border border-[var(--glass-border)] bg-[var(--bg)] px-3 py-2 text-sm"
          value={jenis}
          onChange={(e) => setJenis(e.target.value)}
        >
          <option value="">Semua jenis</option>
          {JENIS_BENCANA_JUKLAK.map((j) => (
            <option key={j.kode} value={j.jenis}>
              {j.jenis}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <GlassPanel className="p-4">
          <p className="text-xs text-[var(--text-dim)]">Jumlah kejadian</p>
          <p className="text-3xl font-semibold">{data?.total ?? 0}</p>
        </GlassPanel>
        {(data?.byJenis ?? []).slice(0, 3).map((row) => (
          <GlassPanel key={row.jenis} className="p-4">
            <p className="text-xs text-[var(--text-dim)]">{row.jenis}</p>
            <p className="text-3xl font-semibold">{row.count}</p>
          </GlassPanel>
        ))}
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {(data?.items ?? []).map((row) => (
          <li key={row.id} className="flex justify-between gap-3 border-t border-[var(--border)] py-2">
            <span>
              <span className="font-medium">{row.nama_kejadian}</span>
              <span className="text-[var(--text-dim)]"> · {row.kabupaten ?? "Aceh"}</span>
            </span>
            <span className="text-[var(--text-dim)]">{new Date(row.waktu_kejadian).toLocaleDateString(locale === "en" ? "en-US" : "id-ID")}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm">
        <Link href="/data-bencana" className="text-[var(--primary)] hover:underline">
          Lihat data bencana
        </Link>
        {" · "}
        <Link href="/analisis-data" className="text-[var(--primary)] hover:underline">
          {tn("analisisData")}
        </Link>
        {" · "}
        <Link href="/destana" className="text-[var(--primary)] hover:underline">
          Status Destana
        </Link>
      </p>
    </section>
  );
}
