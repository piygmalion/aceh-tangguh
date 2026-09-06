"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  PENGUNGSI_BAND,
  PENGUNGSI_BAND_LABEL,
  RENTAN_PENGUNGSI_KEYS,
  RENTAN_PENGUNGSI_LABEL,
  emptyPengungsiJiwa,
  emptyRentanPengungsi,
  normalizePengungsiJiwa,
  normalizeRentanPengungsi,
  type PengungsiBand,
  type PengungsiJiwa,
  type RentanPengungsi,
} from "@/lib/sik/juklak";
import type { PengungsianKajiRow } from "@/lib/sik/db-tables";

const inputClass =
  "w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg)] px-2 py-1.5 text-sm outline-none";

type TempatOpt = { id: string; nama: string; jenis_pos?: string | null };

export function PengungsianKajiForm({
  kejadianId,
  locked,
}: {
  kejadianId: string;
  locked: boolean;
}) {
  const [tempat, setTempat] = useState<TempatOpt[]>([]);
  const [history, setHistory] = useState<PengungsianKajiRow[]>([]);
  const [tempatId, setTempatId] = useState("");
  const [tanggal, setTanggal] = useState(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date())
  );
  const [jumlahKk, setJumlahKk] = useState(0);
  const [jiwa, setJiwa] = useState<PengungsiJiwa>(emptyPengungsiJiwa());
  const [rentan, setRentan] = useState<RentanPengungsi>(emptyRentanPengungsi());
  const [airSanitasi, setAirSanitasi] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/sik/kejadian/${kejadianId}/pengungsian-kaji`, { cache: "no-store" });
    if (!res.ok) {
      setError("Gagal memuat kaji pos");
      return;
    }
    const data = (await res.json()) as { items: PengungsianKajiRow[]; tempat: TempatOpt[] };
    setHistory(data.items ?? []);
    setTempat(data.tempat ?? []);
    if (!tempatId && data.tempat?.[0]) setTempatId(data.tempat[0].id);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kejadianId]);

  function setBand(band: PengungsiBand, sex: "L" | "P", value: number) {
    setJiwa((j) => ({ ...j, [band]: { ...j[band], [sex]: value } }));
  }

  async function save() {
    if (!tempatId) {
      setError("Pilih tempat pengungsian");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/sik/kejadian/${kejadianId}/pengungsian-kaji`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tempat_pengungsian_id: tempatId,
        tanggal,
        jumlah_kk: jumlahKk,
        jiwa,
        rentan,
        air_sanitasi: airSanitasi || null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(typeof body?.error === "string" ? body.error : "Gagal menyimpan kaji pos");
      return;
    }
    setJiwa(emptyPengungsiJiwa());
    setRentan(emptyRentanPengungsi());
    setJumlahKk(0);
    setAirSanitasi("");
    await load();
  }

  return (
    <div>
      <h2 className="font-semibold">Kaji pos pengungsian (Juklak 9/2023)</h2>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        Band umur halus × L/P. Saat simpan, jiwa digabung ke sel mengungsi Lampiran I (anak = bayi+balita+anak+remaja).
        Mikrodata nama tetap opsional; NIK tidak wajib.
      </p>
      {error ? <p className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}
      {tempat.length === 0 ? (
        <p className="mt-2 text-sm text-[var(--text-dim)]">
          Belum ada tempat pengungsian di master. Tambah di modul Master dulu.
        </p>
      ) : (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <label className="block text-sm">
            <span className="text-[var(--text-dim)]">Pos</span>
            <select className={inputClass} value={tempatId} onChange={(e) => setTempatId(e.target.value)}>
              {tempat.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nama}
                  {t.jenis_pos ? ` · ${t.jenis_pos}` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-[var(--text-dim)]">Tanggal</span>
            <input className={inputClass} type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} />
          </label>
          <label className="block text-sm">
            <span className="text-[var(--text-dim)]">Jumlah KK</span>
            <input
              className={inputClass}
              type="number"
              min={0}
              value={jumlahKk}
              onChange={(e) => setJumlahKk(Number(e.target.value) || 0)}
            />
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="text-[var(--text-dim)]">Kebutuhan air/sanitasi</span>
            <textarea
              className={inputClass}
              rows={2}
              value={airSanitasi}
              onChange={(e) => setAirSanitasi(e.target.value)}
            />
          </label>
        </div>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-full text-left text-xs">
          <thead className="text-[var(--text-dim)]">
            <tr>
              <th className="px-1 py-1">Band</th>
              <th className="px-1 py-1">L</th>
              <th className="px-1 py-1">P</th>
            </tr>
          </thead>
          <tbody>
            {PENGUNGSI_BAND.map((band) => (
              <tr key={band} className="border-t border-[var(--border)]">
                <td className="px-1 py-1">{PENGUNGSI_BAND_LABEL[band]}</td>
                <td className="px-1 py-1">
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    value={jiwa[band].L}
                    onChange={(e) => setBand(band, "L", Number(e.target.value) || 0)}
                  />
                </td>
                <td className="px-1 py-1">
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    value={jiwa[band].P}
                    onChange={(e) => setBand(band, "P", Number(e.target.value) || 0)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        {RENTAN_PENGUNGSI_KEYS.map((key) => (
          <label key={key} className="block text-sm">
            <span className="text-[var(--text-dim)]">{RENTAN_PENGUNGSI_LABEL[key]}</span>
            <input
              className={inputClass}
              type="number"
              min={0}
              value={rentan[key]}
              onChange={(e) => {
                const nilai = Number(e.target.value) || 0;
                setRentan((r) => ({ ...r, [key]: nilai }));
              }}
            />
          </label>
        ))}
      </div>

      <Button
        className="mt-4"
        size="sm"
        disabled={busy || locked || tempat.length === 0}
        onClick={() => void save()}
        data-icon={busy ? "inline-start" : undefined}
      >
        {busy ? <Spinner /> : null}
        {locked ? "Terkunci (statis)" : busy ? "Menyimpan…" : "Simpan kaji pos"}
      </Button>

      {history.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1 text-sm">
          {history.map((row) => {
            const j = normalizePengungsiJiwa(row.jiwa);
            const r = normalizeRentanPengungsi(row.rentan);
            const jiwaTotal = PENGUNGSI_BAND.reduce((acc, b) => acc + j[b].L + j[b].P, 0);
            return (
              <li key={row.id} className="text-[var(--text-dim)]">
                {row.tanggal} · {row.jumlah_kk} KK · {jiwaTotal} jiwa
                {r.kk_perempuan ? ` · ${r.kk_perempuan} KK P` : ""}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
