"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { FormFieldRenderer } from "@/components/laporan/FormFieldRenderer";
import { GpsCapture, type LokasiValue } from "@/components/laporan/GpsCapture";
import { ReporterFields, type ReporterValue } from "@/components/laporan/ReporterFields";
import {
  getKejadianFields,
  getKejadianJenisList,
  type JenisBencana,
} from "@/lib/laporan/definitions";

export function ReportKejadianForm() {
  const t = useTranslations("laporKejadian");
  const jenisList = getKejadianJenisList();
  const [jenis, setJenis] = useState<JenisBencana>("banjir");
  const [step, setStep] = useState(0);
  const [lokasi, setLokasi] = useState<LokasiValue>({
    latitude: 5.5483,
    longitude: 95.3238,
    kabupaten_kota: "",
    kecamatan: "",
    desa: "",
  });
  const [pelapor, setPelapor] = useState<ReporterValue>({
    nama: "",
    nik: "",
    telepon: "",
    email: "",
    kontak_darurat: "",
  });
  const [jawaban, setJawaban] = useState<Record<string, unknown>>({});
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const fields = getKejadianFields(jenis);
  const jenisMeta = jenisList.find((j) => j.kode === jenis);

  async function submit() {
    setStatus(null);
    if (!pelapor.telepon && !pelapor.email) {
      setStatus(t("needContact"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/laporan/kejadian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jenis_bencana: jenis,
          lokasi,
          pelapor: {
            nama: pelapor.nama,
            nik: pelapor.nik,
            telepon: pelapor.telepon || undefined,
            email: pelapor.email || undefined,
            kontak_darurat: pelapor.kontak_darurat || undefined,
          },
          jawaban,
          addendum: jawaban.addendum as string | undefined,
          consent: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? json.error ?? "Failed");
      setStatus(`${t("success")} ${json.nomor_laporan}`);
      setStep(0);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-raised)] p-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--text-dim)]">{t("subtitle")}</p>
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <p className="text-sm font-medium">{t("chooseJenis")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {jenisList.map((j) => (
              <button
                key={j.kode}
                type="button"
                onClick={() => {
                  setJenis(j.kode as JenisBencana);
                  setJawaban({});
                }}
                className={`rounded-xl border p-4 text-left transition ${
                  jenis === j.kode
                    ? "border-[var(--accent)] bg-[var(--accent-dim)]"
                    : "border-[var(--glass-border)] hover:border-[var(--accent)]/50"
                }`}
              >
                <div className="font-semibold">{j.nama}</div>
                <p className="mt-1 text-xs text-[var(--text-dim)] line-clamp-3">{j.deskripsi}</p>
              </button>
            ))}
          </div>
          <Button type="button" onClick={() => setStep(1)} className="w-full">{t("next")}</Button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          {jenisMeta && <p className="text-sm text-[var(--text-dim)]">{jenisMeta.deskripsi}</p>}
          <GpsCapture value={lokasi} onChange={setLokasi} />
          <ReporterFields value={pelapor} onChange={setPelapor} />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(0)}>{t("back")}</Button>
            <Button type="button" onClick={() => setStep(2)} className="flex-1">{t("next")}</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <FormFieldRenderer
            fields={fields}
            values={jawaban}
            laporanTipe="kejadian"
            onChange={(k, v) => setJawaban((prev) => ({ ...prev, [k]: v }))}
          />
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
            <span>{t("consent")}</span>
          </label>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>{t("back")}</Button>
            <Button type="button" disabled={busy || !consent} onClick={submit} className="flex-1">
              {t("submit")}
            </Button>
          </div>
        </div>
      )}

      {status && <p className="text-sm text-[var(--text-dim)]">{status}</p>}
    </div>
  );
}
