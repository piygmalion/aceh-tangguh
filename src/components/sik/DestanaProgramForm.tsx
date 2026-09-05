"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { GlassPanel } from "@/components/ui/GlassPanel";
import type { DestanaAktivitasStatus } from "@/lib/sik/destana-program";

type AktivitasSlot = {
  kode_aktivitas: string;
  label: string;
  status: DestanaAktivitasStatus;
  catatan: string | null;
};

type ProgramPayload = {
  kode_desa_kelurahan: string;
  tahun: number;
  si: {
    info_umum: string;
    sebaran: string;
    penilaian_rujukan: string | null;
    fasilitator: string;
    pembelajaran: string;
  };
  aktivitas: AktivitasSlot[];
  penilaian_berikutnya: number | null;
  can_write: boolean;
};

export function DestanaProgramForm({
  kodeDesa,
  tahun,
}: {
  kodeDesa: string;
  tahun?: number;
}) {
  const t = useTranslations("destanaProgram");
  const [data, setData] = useState<ProgramPayload | null>(null);
  const [infoUmum, setInfoUmum] = useState("");
  const [fasilitator, setFasilitator] = useState("");
  const [pembelajaran, setPembelajaran] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const params = new URLSearchParams({ kode: kodeDesa });
    if (tahun) params.set("tahun", String(tahun));
    const res = await fetch(`/api/sik/destana/program?${params}`, { cache: "no-store" });
    if (!res.ok) {
      setError(t("loadError"));
      return;
    }
    const body = (await res.json()) as ProgramPayload;
    setData(body);
    setInfoUmum(body.si.info_umum);
    setFasilitator(body.si.fasilitator);
    setPembelajaran(body.si.pembelajaran);
    setError(null);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kodeDesa, tahun]);

  async function saveSi() {
    if (!data?.can_write) return;
    setBusy(true);
    const res = await fetch("/api/sik/destana/program", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "si",
        kode: kodeDesa,
        info_umum: infoUmum,
        fasilitator,
        pembelajaran,
        penilaian_rujukan: data.si.penilaian_rujukan,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(t("saveError"));
      return;
    }
    await load();
  }

  async function saveAktivitas(kode_aktivitas: string, status: DestanaAktivitasStatus, catatan: string) {
    if (!data?.can_write) return;
    setBusy(true);
    const res = await fetch("/api/sik/destana/program", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "aktivitas",
        kode: kodeDesa,
        tahun: data.tahun,
        kode_aktivitas,
        status,
        catatan,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(t("saveError"));
      return;
    }
    await load();
  }

  if (!data) {
    if (error) return <GlassPanel className="p-5">{error}</GlassPanel>;
    return null;
  }

  return (
    <GlassPanel className="p-5">
      <h2 className="font-semibold">{t("programTitle")}</h2>
      <p className="mt-1 text-sm text-[var(--text-dim)]">{t("programLead")}</p>
      <p className="mt-2 text-sm">
        {data.penilaian_berikutnya != null
          ? t("penilaianBerikutnya", { tahun: data.penilaian_berikutnya })
          : t("penilaianBerikutnyaKosong")}
      </p>
      {data.can_write ? null : <p className="mt-2 text-xs text-[var(--text-dim)]">{t("readOnly")}</p>}
      {error ? <p className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-[var(--text-dim)]">{t("sebaran")}</span>
          <input
            className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1"
            value={data.si.sebaran || kodeDesa}
            readOnly
          />
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-[var(--text-dim)]">{t("infoUmum")}</span>
          <textarea
            className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1"
            rows={2}
            value={infoUmum}
            disabled={!data.can_write || busy}
            onChange={(e) => setInfoUmum(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="text-[var(--text-dim)]">{t("fasilitator")}</span>
          <input
            className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1"
            value={fasilitator}
            disabled={!data.can_write || busy}
            onChange={(e) => setFasilitator(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="text-[var(--text-dim)]">{t("pembelajaran")}</span>
          <input
            className="mt-1 w-full rounded border border-[var(--border)] bg-transparent px-2 py-1"
            value={pembelajaran}
            disabled={!data.can_write || busy}
            onChange={(e) => setPembelajaran(e.target.value)}
          />
        </label>
      </div>
      {data.can_write ? (
        <Button
          className="mt-3"
          size="sm"
          disabled={busy}
          onClick={() => void saveSi()}
          data-icon={busy ? "inline-start" : undefined}
        >
          {busy ? <Spinner /> : null}
          {t("saveSi")}
        </Button>
      ) : null}

      <ul className="mt-4 flex flex-col gap-2">
        {data.aktivitas.map((slot) => (
          <li key={slot.kode_aktivitas} className="border-t border-[var(--border)] pt-2 text-sm">
            <p>
              <span className="font-mono text-[var(--text-dim)]">{slot.kode_aktivitas}</span> {slot.label}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <select
                className="rounded border border-[var(--border)] bg-transparent px-2 py-1"
                value={slot.status}
                disabled={!data.can_write || busy}
                onChange={(e) =>
                  void saveAktivitas(
                    slot.kode_aktivitas,
                    e.target.value as DestanaAktivitasStatus,
                    slot.catatan ?? ""
                  )
                }
              >
                <option value="belum">{t("statusBelum")}</option>
                <option value="berjalan">{t("statusBerjalan")}</option>
                <option value="selesai">{t("statusSelesai")}</option>
              </select>
              <input
                className="min-w-[12rem] flex-1 rounded border border-[var(--border)] bg-transparent px-2 py-1"
                placeholder={t("catatan")}
                defaultValue={slot.catatan ?? ""}
                disabled={!data.can_write || busy}
                onBlur={(e) => {
                  if (e.target.value === (slot.catatan ?? "")) return;
                  void saveAktivitas(slot.kode_aktivitas, slot.status, e.target.value);
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}
