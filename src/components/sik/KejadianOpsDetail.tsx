"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { KrbContextCard } from "@/components/sik/KrbContextCard";
import { SikResourceManager } from "@/components/sik/SikResourceManager";
import {
  DampakJuklakForm,
  dampakFormToPayload,
  emptyDampakForm,
  type DampakFormState,
} from "@/components/sik/DampakJuklakForm";
import { normalizeKorbanTerpilah } from "@/lib/sik/juklak";
import type { KejadianDampakRow, KejadianLokasiRow, KejadianOperasiRow } from "@/lib/sik/db-tables";

export function KejadianOpsDetail({
  id,
  canLockStatis = false,
}: {
  id: string;
  canLockStatis?: boolean;
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [item, setItem] = useState<KejadianOperasiRow | null>(null);
  const [lokasi, setLokasi] = useState<KejadianLokasiRow[]>([]);
  const [dampak, setDampak] = useState<KejadianDampakRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [faseBusy, setFaseBusy] = useState(false);
  const [form, setForm] = useState<DampakFormState>(emptyDampakForm);

  async function load() {
    const res = await fetch(`/api/sik/kejadian/${id}`, { cache: "no-store" });
    if (!res.ok) {
      setError(t("loadKejadianError"));
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
    setError(null);
    const res = await fetch(`/api/sik/kejadian/${id}/dampak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dampakFormToPayload(form)),
    });
    setBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(typeof body?.error === "string" ? body.error : t("saveDampakError"));
      return;
    }
    setForm((f) => ({ ...emptyDampakForm(), tanggal: f.tanggal, korban_terpilah: normalizeKorbanTerpilah(null) }));
    await load();
  }

  async function setFase(fase_data: "dinamis" | "diajukan" | "statis") {
    setFaseBusy(true);
    setError(null);
    const res = await fetch(`/api/sik/kejadian/${id}/fase`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fase_data }),
    });
    setFaseBusy(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(typeof body?.error === "string" ? body.error : t("faseError"));
      return;
    }
    await load();
  }

  if (!item) {
    return <GlassPanel className="p-5">{error ?? "Memuat…"}</GlassPanel>;
  }

  const latest = dampak[0];
  const locked = item.fase_data === "statis";

  return (
    <div className="flex flex-col gap-4">
      <GlassPanel className="p-5">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--text-dim)]">
              {item.kib ?? item.nomor} · fase {item.fase_data}
              {item.is_bencana ? " · bencana" : " · di bawah ambang"}
            </p>
            <h1 className="text-xl font-semibold">{item.nama_kejadian}</h1>
            <p className="mt-1 text-sm text-[var(--text-dim)]">
              {item.jenis_bencana} · {item.tarikh ?? new Date(item.waktu_kejadian).toLocaleString(locale)} · {item.status}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {item.fase_data === "dinamis" ? (
              <Button
                size="sm"
                variant="outline"
                disabled={faseBusy}
                onClick={() => void setFase("diajukan")}
                data-icon={faseBusy ? "inline-start" : undefined}
              >
                {faseBusy ? <Spinner /> : null}
                {t("ajukanVerifikasi")}
              </Button>
            ) : null}
            {item.fase_data === "diajukan" && canLockStatis ? (
              <Button
                size="sm"
                disabled={faseBusy}
                onClick={() => void setFase("statis")}
                data-icon={faseBusy ? "inline-start" : undefined}
              >
                {faseBusy ? <Spinner /> : null}
                {t("kunciDataStatis")}
              </Button>
            ) : null}
            {locked && canLockStatis ? (
              <Button
                size="sm"
                variant="outline"
                disabled={faseBusy}
                onClick={() => void setFase("dinamis")}
                data-icon={faseBusy ? "inline-start" : undefined}
              >
                {faseBusy ? <Spinner /> : null}
                {t("bukaKunci")}
              </Button>
            ) : null}
            <Button asChild variant="outline" size="sm">
              <Link href={{ pathname: "/admin/sik/kejadian/[id]/cetak", params: { id } }}>
                {t("cetakLampiranI")}
              </Link>
            </Button>
          </div>
        </div>
        {error ? <p className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}
        <p className="mt-3 text-sm">{item.kronologi || item.deskripsi || "—"}</p>
        <p className="mt-2 text-sm text-[var(--text-dim)]">
          {[item.desa_ringkas, item.kecamatan, item.kabupaten].filter(Boolean).join(", ")}
        </p>
        {item.kondisi_mutakhir ? (
          <p className="mt-2 text-sm">
            <span className="text-[var(--text-dim)]">{t("kondisiMutakhir")} </span>
            {item.kondisi_mutakhir}
          </p>
        ) : null}
      </GlassPanel>

      <KrbContextCard
        kodeKabupaten={item.kode_kabupaten}
        kodeJenis={item.kode_jenis}
        namaKejadian={item.nama_kejadian}
      />

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
        <DampakJuklakForm
          form={form}
          setForm={setForm}
          busy={busy}
          locked={locked}
          onSave={() => void saveDampak()}
          history={dampak}
        />
      </GlassPanel>

      <GlassPanel className="p-5">
        <h2 className="font-semibold">{t("desaTerdampak")}</h2>
        <ul className="mt-2 list-disc pl-5 text-sm">
          {lokasi.length === 0 ? <li className="text-[var(--text-dim)]">{t("noLokasi")}</li> : null}
          {lokasi.map((loc) => (
            <li key={loc.id}>
              {[loc.desa, loc.kecamatan, loc.kabupaten].filter(Boolean).join(", ")}
            </li>
          ))}
        </ul>
      </GlassPanel>

      <SikResourceManager
        resource="korban"
        title={t("korbanMikrodata")}
        fields={["nama_enc", "kondisi", "desa", "ahli_waris", "keterangan"]}
        extra={{ kejadian_id: id }}
        staffOnlyNote="Nama tersimpan terenkripsi (kolom nama_enc). Jangan isi NIK mentah."
      />
      <SikResourceManager
        resource="pengungsi"
        title={t("pengungsiTerpilah")}
        fields={["nama_enc", "jenis_kelamin", "kelompok_umur", "kelompok_rentan", "kondisi"]}
        extra={{ kejadian_id: id }}
      />
      <SikResourceManager
        resource="kerusakan"
        title={t("kerusakanAset")}
        fields={["kategori", "sektor", "jenis", "level_kerusakan", "pemilik", "desa"]}
        extra={{ kejadian_id: id }}
      />
    </div>
  );
}
