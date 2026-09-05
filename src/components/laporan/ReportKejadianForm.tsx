"use client";

import { useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { FormFieldRenderer } from "@/components/laporan/FormFieldRenderer";
import { GpsCapture, type LokasiValue } from "@/components/laporan/GpsCapture";
import { ReporterFields, type ReporterValue } from "@/components/laporan/ReporterFields";
import { Link } from "@/i18n/routing";
import {
  getKejadianFields,
  getKejadianJenisList,
  type JenisBencana,
} from "@/lib/laporan/definitions";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { cn } from "@/lib/utils";

const STEPS = ["lokasi", "jenis", "pelapor"] as const;

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
      const res = await fetchPublicApi("/api/laporan/kejadian", {
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
    <div>
      <div className="mb-8 flex flex-wrap items-center gap-2" role="list" aria-label={t("stepsAria")}>
        {STEPS.map((key, i) => (
          <div key={key} className="flex items-center gap-2">
            {i > 0 ? <span className="hidden text-white/20 sm:inline" aria-hidden>—</span> : null}
            <button
              type="button"
              role="listitem"
              aria-current={step === i ? "step" : undefined}
              className={cn("step-pill", step === i && "is-active")}
              onClick={() => setStep(i)}
            >
              <span className="step-num">{i + 1}</span>
              {t(`step.${key}`)}
            </button>
          </div>
        ))}
      </div>

      <div className="glass flex flex-col gap-6 rounded-2xl border border-input p-5 sm:p-8">
        {step === 0 && (
          <FieldGroup className="gap-4">
            <GpsCapture value={lokasi} onChange={setLokasi} />
            <Button type="button" onClick={() => setStep(1)} className="w-full">
              {t("next")}
            </Button>
          </FieldGroup>
        )}

        {step === 1 && (
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>{t("chooseJenis")}</FieldLabel>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t("chooseJenis")}>
                {jenisList.map((j) => (
                  <button
                    key={j.kode}
                    type="button"
                    aria-pressed={jenis === j.kode}
                    onClick={() => {
                      setJenis(j.kode as JenisBencana);
                      setJawaban({});
                    }}
                    className="jenis-chip"
                  >
                    {j.nama}
                  </button>
                ))}
              </div>
            </Field>
            {jenisMeta ? <p className="text-sm text-muted-foreground">{jenisMeta.deskripsi}</p> : null}
            <FormFieldRenderer
              fields={fields}
              values={jawaban}
              laporanTipe="kejadian"
              onChange={(k, v) => setJawaban((prev) => ({ ...prev, [k]: v }))}
            />
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setStep(0)}>
                {t("back")}
              </Button>
              <Button type="button" onClick={() => setStep(2)} className="flex-1">
                {t("next")}
              </Button>
            </div>
          </FieldGroup>
        )}

        {step === 2 && (
          <FieldGroup className="gap-4">
            <ReporterFields value={pelapor} onChange={setPelapor} />
            <Field
              orientation="horizontal"
              className="cursor-pointer items-start rounded-xl border border-input bg-background/30 p-4"
            >
              <input
                id="kejadian-consent"
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-5 w-5 shrink-0 accent-primary"
              />
              <FieldLabel htmlFor="kejadian-consent" className="font-normal leading-relaxed text-muted-foreground">
                {t("consent")}
              </FieldLabel>
            </Field>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="ghost" onClick={() => setStep(1)} data-icon="inline-start">
                <ArrowLeft />
                {t("back")}
              </Button>
              <Button
                type="button"
                disabled={busy || !consent}
                onClick={submit}
                data-icon={busy ? "inline-start" : "inline-end"}
              >
                {busy ? <Spinner /> : null}
                {t("submit")}
                {busy ? null : <Send />}
              </Button>
            </div>
          </FieldGroup>
        )}

        {status ? <FieldError className="text-muted-foreground">{status}</FieldError> : null}
      </div>

      <p className="mt-6 text-center text-[0.8125rem] leading-relaxed text-muted-foreground">
        {t("emergencyNote")}{" "}
        <Link href="/nomor-penting" className="font-semibold text-primary hover:underline">
          {t("emergencyLink")}
        </Link>
      </p>
    </div>
  );
}
