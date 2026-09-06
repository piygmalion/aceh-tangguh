"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { destanaLevelLabel, PKD_REKOMENDASI_GENERIK } from "@/lib/sik/pkd";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

type Tugas = {
  id: string;
  nama_desa: string | null;
  kode_desa_kelurahan: string;
  status: string;
  indeks: number | null;
  level: string | null;
};

type Pertanyaan = {
  id: string;
  indikator_nomor: number;
  nomor: number;
  teks: string;
};

type Jawaban = {
  id: string;
  tugas_id: string;
  pertanyaan_id: string;
  ya: boolean;
  evaluasi: string | null;
  rekomendasi: string | null;
};

export function DestanaAdminPanel({
  isDesa,
  isPenilai,
  kodeDesa,
}: {
  isDesa: boolean;
  isPenilai: boolean;
  kodeDesa: string | null;
}) {
  const [tugas, setTugas] = useState<Tugas[]>([]);
  const [pertanyaan, setPertanyaan] = useState<Pertanyaan[]>([]);
  const [jawaban, setJawaban] = useState<Jawaban[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/sik/pkd", { cache: "no-store" });
    if (!res.ok) {
      setError("Gagal memuat PKD");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as {
      tugas: Tugas[];
      pertanyaan: Pertanyaan[];
      jawaban: Jawaban[];
    };
    setTugas(data.tugas);
    setPertanyaan(data.pertanyaan);
    setJawaban(data.jawaban ?? []);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function action(body: Record<string, unknown>) {
    const res = await fetch("/api/sik/pkd", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) setError("Aksi gagal");
    await load();
  }

  const jawabanByTugas = useMemo(() => {
    const map = new Map<string, Map<string, Jawaban>>();
    for (const row of jawaban) {
      const inner = map.get(row.tugas_id) ?? new Map<string, Jawaban>();
      inner.set(row.pertanyaan_id, row);
      map.set(row.tugas_id, inner);
    }
    return map;
  }, [jawaban]);

  return (
    <div className="flex flex-col gap-4">
      <GlassPanel className="flex flex-col gap-3 p-5">
        <h1 className="text-xl font-semibold">Destana / PKD</h1>
        <p className="text-sm text-[var(--text-dim)]">
          Penilaian mandiri 32 indikator × 4 pertanyaan (Perka BNPB 1/2012). Desa mengisi, penilai
          menerima atau menolak per pertanyaan, lalu finalisasi indeks.
        </p>
        {error ? (
          <Empty className="border border-dashed" data-testid="destana-admin-error">
            <EmptyDescription className={cn(TYPE_FLOOR_CLASS, "text-[var(--danger)]")}>
              {error}
            </EmptyDescription>
          </Empty>
        ) : null}
        {isDesa && kodeDesa ? (
          <Button size="sm" onClick={() => void action({ action: "ensure-tugas" })}>
            Mulai tugas tahun ini
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const kode = window.prompt("Kode desa (10 digit)");
              if (kode) void action({ action: "ensure-tugas", kode_desa_kelurahan: kode });
            }}
          >
            Buat tugas desa
          </Button>
        )}
      </GlassPanel>

      {loading ? (
        <GlassPanel
          className="flex flex-col gap-2 p-5"
          data-testid="destana-admin-skeleton"
        >
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </GlassPanel>
      ) : null}

      {!loading && tugas.length === 0 ? (
        <Empty className="border border-dashed" data-testid="destana-admin-empty">
          <EmptyDescription className={TYPE_FLOOR_CLASS}>Destana / PKD</EmptyDescription>
        </Empty>
      ) : null}

      {!loading
        ? tugas.map((row) => {
            const answers = jawabanByTugas.get(row.id) ?? new Map<string, Jawaban>();
            return (
              <GlassPanel key={row.id} className="flex flex-col gap-3 p-5">
                <div className="flex flex-wrap justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold">{row.nama_desa || row.kode_desa_kelurahan}</p>
                    <p className="text-sm text-[var(--text-dim)]">
                      {row.status}
                      {row.indeks != null
                        ? ` · indeks ${row.indeks} · ${destanaLevelLabel((row.level as "pratama") ?? "belum")}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActive(active === row.id ? null : row.id)}
                    >
                      {active === row.id ? "Tutup" : "Indikator"}
                    </Button>
                    {isDesa ? (
                      <Button size="sm" onClick={() => void action({ action: "submit", tugas_id: row.id })}>
                        Submit mandiri
                      </Button>
                    ) : null}
                    {isPenilai ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void action({ action: "buka", tugas_id: row.id })}
                        >
                          Buka
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void action({ action: "kunci", tugas_id: row.id })}
                        >
                          Kunci
                        </Button>
                        <Button size="sm" onClick={() => void action({ action: "final", tugas_id: row.id })}>
                          Finalisasi
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
                {active === row.id ? (
                  <ul className="flex max-h-96 flex-col gap-2 overflow-y-auto text-sm">
                    {pertanyaan.map((p) => {
                      const ans = answers.get(p.id);
                      const yaCount = pertanyaan
                        .filter((q) => q.indikator_nomor === p.indikator_nomor)
                        .reduce((n, q) => n + (answers.get(q.id)?.ya ? 1 : 0), 0);
                      const recKey = Math.min(4, Math.max(0, yaCount)) as 0 | 1 | 2 | 3 | 4;
                      const rekomendasi = PKD_REKOMENDASI_GENERIK[recKey][0];
                      return (
                        <li
                          key={p.id}
                          className="flex flex-col gap-1 border-t border-[var(--border)] py-2 sm:flex-row sm:items-start sm:justify-between"
                        >
                          <span>
                            <span className="text-[var(--text-dim)]">
                              {p.indikator_nomor}.{p.nomor}
                            </span>{" "}
                            {p.teks}
                            {ans?.evaluasi && ans.evaluasi !== "pending" ? (
                              <span className={cn("ml-2 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
                                · {ans.evaluasi}
                              </span>
                            ) : null}
                          </span>
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            <label className="flex items-center gap-1">
                              <input
                                type="checkbox"
                                checked={Boolean(ans?.ya)}
                                disabled={row.status === "locked" || row.status === "final"}
                                onChange={(e) => {
                                  void action({
                                    action: "jawab",
                                    tugas_id: row.id,
                                    pertanyaan_id: p.id,
                                    ya: e.target.checked,
                                  });
                                }}
                              />
                              Ya
                            </label>
                            {isPenilai && ans ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    void action({
                                      action: "evaluasi",
                                      jawaban_id: ans.id,
                                      evaluasi: "terima",
                                      rekomendasi,
                                    })
                                  }
                                >
                                  Terima
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    void action({
                                      action: "evaluasi",
                                      jawaban_id: ans.id,
                                      evaluasi: "tolak",
                                      rekomendasi,
                                    })
                                  }
                                >
                                  Tolak
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </GlassPanel>
            );
          })
        : null}
    </div>
  );
}
