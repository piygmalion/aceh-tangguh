"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button-legacy";
import { FormFieldRenderer } from "@/components/laporan/FormFieldRenderer";
import { GpsCapture, type LokasiValue } from "@/components/laporan/GpsCapture";
import { ReporterFields, type ReporterValue } from "@/components/laporan/ReporterFields";
import { getPenangananFields } from "@/lib/laporan/definitions";
import { fetchPublicApi } from "@/lib/preview/public-api";

export function ReportPenangananForm() {
  const t = useTranslations("laporPenanganan");
  const fields = getPenangananFields();
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
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  function fieldValue(key: string) {
    return jawaban[key];
  }

  async function submit() {
    setStatus(null);
    if (!pelapor.telepon && !pelapor.email) {
      setStatus(t("needContact"));
      return;
    }
    const deskripsi = String(jawaban.deskripsi_penanganan ?? "");
    if (deskripsi.length < 50) {
      setStatus(t("deskripsiMin"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetchPublicApi("/api/laporan/penanganan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jenis_bencana: fieldValue("jenis_bencana"),
          tipe_laporan: fieldValue("tipe_laporan"),
          tanggal_penanganan: fieldValue("tanggal_penanganan"),
          jam_penanganan: fieldValue("jam_penanganan") || undefined,
          fase_penanganan: fieldValue("fase_penanganan") || undefined,
          status_kebutuhan_sisa: fieldValue("status_kebutuhan_sisa") || undefined,
          lokasi,
          pelapor: {
            nama: pelapor.nama,
            nik: pelapor.nik,
            telepon: pelapor.telepon || undefined,
            email: pelapor.email || undefined,
            kontak_darurat: pelapor.kontak_darurat || undefined,
          },
          deskripsi_penanganan: deskripsi,
          pelaku_penanganan: (fieldValue("pelaku_penanganan") as string[]) ?? [],
          jenis_bantuan: (fieldValue("jenis_bantuan") as string[]) ?? [],
          jumlah_penerima_estimasi: fieldValue("jumlah_penerima_estimasi") as number | undefined,
          rating_kepuasan: fieldValue("rating_kepuasan") as number | undefined,
          jawaban,
          addendum: jawaban.addendum as string | undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message ?? json.error ?? "Failed");
      setStatus(`${t("success")} ${json.nomor_laporan}. ${t("notOnMap")}`);
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
        <p className="mt-2 text-xs text-[var(--text-dim)]">{t("notOnMap")}</p>
      </div>

      {step === 0 && (
        <div className="space-y-4">
          <GpsCapture value={lokasi} onChange={setLokasi} />
          <ReporterFields value={pelapor} onChange={setPelapor} />
          <Button type="button" onClick={() => setStep(1)} className="w-full">{t("next")}</Button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <FormFieldRenderer
            fields={fields.filter((f) => !["foto", "video", "addendum", "kebutuhan_mendesak", "akses_kendaraan_roda_empat"].includes(f.field_key))}
            values={jawaban}
            laporanTipe="penanganan"
            onChange={(k, v) => setJawaban((prev) => ({ ...prev, [k]: v }))}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(0)}>{t("back")}</Button>
            <Button type="button" onClick={() => setStep(2)} className="flex-1">{t("next")}</Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <FormFieldRenderer
            fields={fields.filter((f) => ["foto", "video", "addendum"].includes(f.field_key))}
            values={jawaban}
            laporanTipe="penanganan"
            onChange={(k, v) => setJawaban((prev) => ({ ...prev, [k]: v }))}
          />
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setStep(1)}>{t("back")}</Button>
            <Button type="button" disabled={busy} onClick={submit} className="flex-1">{t("submit")}</Button>
          </div>
        </div>
      )}

      {status && <p className="text-sm text-[var(--text-dim)]">{status}</p>}
    </div>
  );
}
