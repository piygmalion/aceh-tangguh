"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { SikResourceManager } from "@/components/sik/SikResourceManager";
import type { KejadianDampakRow, KejadianLokasiRow, KejadianOperasiRow } from "@/lib/sik/db-tables";

const inputClass =
  "w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none";

export function KejadianOpsDetail({ id }: { id: string }) {
  const [item, setItem] = useState<KejadianOperasiRow | null>(null);
  const [lokasi, setLokasi] = useState<KejadianLokasiRow[]>([]);
  const [dampak, setDampak] = useState<KejadianDampakRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    meninggal: 0,
    luka_berat: 0,
    luka_ringan: 0,
    hilang: 0,
    mengungsi: 0,
    menderita: 0,
    rumah_rb: 0,
    rumah_rs: 0,
    rumah_rr: 0,
    rumah_terendam: 0,
  });

  async function load() {
    const res = await fetch(`/api/sik/kejadian/${id}`, { cache: "no-store" });
    if (!res.ok) {
      setError("Gagal memuat kejadian");
      return;
    }
    const data = (await res.json()) as {
      item: KejadianOperasiRow;
      lokasi: KejadianLokasiRow[];
      dampak: KejadianDampakRow[];
    };
    setItem(data.item);
    setLokasi(data.lokasi);
    setDampak(data.dampak);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveDampak() {
    setBusy(true);
    await fetch(`/api/sik/kejadian/${id}/dampak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(false);
    await load();
  }

  if (!item) {
    return <GlassPanel className="p-5">{error ?? "Memuat…"}</GlassPanel>;
  }

  const latest = dampak[0];

  return (
    <div className="flex flex-col gap-4">
      <GlassPanel className="p-5">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--text-dim)]">{item.nomor}</p>
            <h1 className="text-xl font-semibold">{item.nama_kejadian}</h1>
            <p className="mt-1 text-sm text-[var(--text-dim)]">
              {item.jenis_bencana} · {new Date(item.waktu_kejadian).toLocaleString("id-ID")} · {item.status}
            </p>
          </div>
          <Link href={{ pathname: "/admin/sik/kejadian/[id]/cetak", params: { id } }}>
            <Button variant="outline" size="sm">
              Cetak laporan
            </Button>
          </Link>
        </div>
        <p className="mt-3 text-sm">{item.kronologi || item.deskripsi || "—"}</p>
        <p className="mt-2 text-sm text-[var(--text-dim)]">
          {[item.desa_ringkas, item.kecamatan, item.kabupaten].filter(Boolean).join(", ")}
        </p>
      </GlassPanel>

      {latest ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Meninggal", latest.meninggal],
            ["Hilang", latest.hilang],
            ["Mengungsi", latest.mengungsi],
            ["Rumah RB", latest.rumah_rb],
          ].map(([label, value]) => (
            <GlassPanel key={String(label)} className="p-3">
              <p className="text-xs text-[var(--text-dim)]">{label}</p>
              <p className="text-2xl font-semibold">{value}</p>
            </GlassPanel>
          ))}
        </div>
      ) : null}

      <GlassPanel className="p-5">
        <h2 className="font-semibold">Update kaji cepat</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ["tanggal", "Tanggal"],
              ["meninggal", "Meninggal"],
              ["luka_berat", "Luka berat"],
              ["luka_ringan", "Luka ringan"],
              ["hilang", "Hilang"],
              ["mengungsi", "Mengungsi"],
              ["menderita", "Menderita"],
              ["rumah_rb", "Rumah RB"],
              ["rumah_rs", "Rumah RS"],
              ["rumah_rr", "Rumah RR"],
              ["rumah_terendam", "Terendam"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-sm">
              <span className="text-[var(--text-dim)]">{label}</span>
              <input
                className={inputClass}
                type={key === "tanggal" ? "date" : "number"}
                value={form[key]}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    [key]: key === "tanggal" ? e.target.value : Number(e.target.value),
                  }))
                }
              />
            </label>
          ))}
        </div>
        <Button className="mt-3" size="sm" disabled={busy} onClick={() => void saveDampak()}>
          Simpan dampak
        </Button>
        {dampak.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[var(--text-dim)]">
                <tr>
                  <th className="px-2 py-2">Tanggal</th>
                  <th className="px-2 py-2">Meninggal</th>
                  <th className="px-2 py-2">Mengungsi</th>
                  <th className="px-2 py-2">Rumah RB/RS/RR</th>
                </tr>
              </thead>
              <tbody>
                {dampak.map((row) => (
                  <tr key={row.id} className="border-t border-[var(--border)]">
                    <td className="px-2 py-2">{row.tanggal}</td>
                    <td className="px-2 py-2">{row.meninggal}</td>
                    <td className="px-2 py-2">{row.mengungsi}</td>
                    <td className="px-2 py-2">
                      {row.rumah_rb}/{row.rumah_rs}/{row.rumah_rr}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </GlassPanel>

      <GlassPanel className="p-5">
        <h2 className="font-semibold">Desa terdampak</h2>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {lokasi.length === 0 ? <li className="text-[var(--text-dim)]">Belum ada lokasi tambahan.</li> : null}
          {lokasi.map((loc) => (
            <li key={loc.id}>
              {[loc.desa, loc.kecamatan, loc.kabupaten].filter(Boolean).join(", ")}
            </li>
          ))}
        </ul>
      </GlassPanel>

      <SikResourceManager
        resource="korban"
        title="Korban"
        fields={["nama_enc", "kondisi", "desa", "ahli_waris", "keterangan"]}
        extra={{ kejadian_id: id }}
        staffOnlyNote="Nama tersimpan terenkripsi (kolom nama_enc). Jangan isi NIK mentah."
      />
      <SikResourceManager
        resource="pengungsi"
        title="Pengungsi terpilah"
        fields={["nama_enc", "jenis_kelamin", "kelompok_umur", "kelompok_rentan", "kondisi"]}
        extra={{ kejadian_id: id }}
      />
      <SikResourceManager
        resource="kerusakan"
        title="Kerusakan aset"
        fields={["kategori", "sektor", "jenis", "level_kerusakan", "pemilik", "desa"]}
        extra={{ kejadian_id: id }}
      />
    </div>
  );
}
