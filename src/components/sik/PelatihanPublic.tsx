"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button-legacy";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { fetchPublicApi } from "@/lib/preview/public-api";

export function PelatihanPublic() {
  const t = useTranslations("pelatihanPublic");
  const [form, setForm] = useState({
    judul: "",
    desa: "",
    tanggal_rencana: "",
    kontak_nama: "",
    kontak_email: "",
    kontak_telepon: "",
    alamat: "",
  });
  const [done, setDone] = useState(false);
  const { data } = useQuery({
    queryKey: ["pelatihan"],
    queryFn: async () => {
      const res = await fetchPublicApi("/api/sik/public?kind=pelatihan");
      if (!res.ok) throw new Error("pelatihan");
      return res.json() as Promise<{ items: Array<{ id: string; judul: string; tanggal: string | null; lokasi: string | null; status: string }> }>;
    },
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/sik/public", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) setDone(true);
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h2 className="font-semibold">{t("scheduleTitle")}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {(data?.items ?? []).map((row) => (
            <li key={row.id} className="border-t border-[var(--border)] py-2">
              <p className="font-medium">{row.judul}</p>
              <p className="text-[var(--text-dim)]">
                {row.tanggal ?? "—"} · {row.lokasi ?? "Aceh"} · {row.status}
              </p>
            </li>
          ))}
        </ul>
      </div>
      <GlassPanel className="p-5">
        <h2 className="font-semibold">Ajukan pelatihan</h2>
        {done ? (
          <p className="mt-3 text-sm">Permintaan terkirim. BPBD akan menindaklanjuti.</p>
        ) : (
          <form className="mt-3 grid gap-2" onSubmit={(e) => void submit(e)}>
            {(
              [
                ["judul", "Tema pelatihan"],
                ["desa", "Desa"],
                ["tanggal_rencana", "Tanggal rencana"],
                ["kontak_nama", "Nama kontak"],
                ["kontak_email", "Email"],
                ["kontak_telepon", "Telepon"],
                ["alamat", "Alamat pelaksanaan"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-sm">
                <span className="text-[var(--text-dim)]">{label}</span>
                <input
                  required={key !== "kontak_email" && key !== "kontak_telepon"}
                  type={key.includes("tanggal") ? "date" : key.includes("email") ? "email" : "text"}
                  className="mt-1 w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg)] px-3 py-2"
                  value={form[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </label>
            ))}
            <Button type="submit" size="sm">
              Kirim
            </Button>
          </form>
        )}
      </GlassPanel>
    </div>
  );
}
