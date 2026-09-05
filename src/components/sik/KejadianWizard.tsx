"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button-legacy";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { JENIS_BENCANA_JUKLAK } from "@/lib/sik/jenis-bencana";
import { KrbContextCard } from "@/components/sik/KrbContextCard";
import {
  ACEH_KABUPATEN,
  deskripsiPlaceholder,
  findKabupaten,
  formatKib,
  kibPrefix,
} from "@/lib/sik/juklak";

type Draft = {
  kode_jenis: number | "";
  jenis_bencana: string;
  nama_kejadian: string;
  slug_nama: string;
  tarikh: string;
  jam: string;
  penyebab: string;
  kronologi: string;
  deskripsi: string;
  cakupan: string;
  kabupaten: string;
  kode_kabupaten: string;
  kecamatan: string;
  desa_ringkas: string;
  latitude: string;
  longitude: string;
  cuaca: string;
  sumber_informasi: string;
  status_darurat: boolean;
  permintaan_bantuan_nasional: boolean;
  nomor_sk: string;
  sebaran_dampak: string;
  himbauan: string;
  personil_terlibat: string;
};

function todayTarikh() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

function nowJam() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const h = parts.find((p) => p.type === "hour")?.value ?? "00";
  const m = parts.find((p) => p.type === "minute")?.value ?? "00";
  return `${h}:${m}`;
}

const empty: Draft = {
  kode_jenis: "",
  jenis_bencana: "",
  nama_kejadian: "",
  slug_nama: "",
  tarikh: todayTarikh(),
  jam: nowJam(),
  penyebab: "",
  kronologi: "",
  deskripsi: "",
  cakupan: "desa",
  kabupaten: "",
  kode_kabupaten: "",
  kecamatan: "",
  desa_ringkas: "",
  latitude: "",
  longitude: "",
  cuaca: "",
  sumber_informasi: "",
  status_darurat: false,
  permintaan_bantuan_nasional: false,
  nomor_sk: "",
  sebaran_dampak: "",
  himbauan: "",
  personil_terlibat: "",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-[var(--text-dim)]">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none";

export function KejadianWizard({
  initial,
  laporanId,
}: {
  initial?: Partial<Draft>;
  laporanId?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<Draft>({ ...empty, ...initial });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const jenis = useMemo(
    () => JENIS_BENCANA_JUKLAK.find((j) => j.kode === Number(draft.kode_jenis)),
    [draft.kode_jenis]
  );

  useEffect(() => {
    if (!jenis) return;
    setDraft((d) => ({
      ...d,
      jenis_bencana: jenis.jenis,
    }));
  }, [jenis]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function captureGps() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      set("latitude", String(pos.coords.latitude.toFixed(6)));
      set("longitude", String(pos.coords.longitude.toFixed(6)));
    });
  }

  const kibPreview = useMemo(() => {
    if (!draft.kode_kabupaten || !draft.kode_jenis || !draft.tarikh) return null;
    try {
      return formatKib(
        kibPrefix({
          kodeKabupaten: draft.kode_kabupaten,
          kodeJenis: Number(draft.kode_jenis),
          tarikh: draft.tarikh,
        }),
        1
      );
    } catch {
      return null;
    }
  }, [draft.kode_kabupaten, draft.kode_jenis, draft.tarikh]);

  async function submit() {
    setBusy(true);
    setError(null);
    const waktu = `${draft.tarikh}T${draft.jam || "00:00"}:00+07:00`;
    const payload = {
      kode_jenis: draft.kode_jenis === "" ? null : Number(draft.kode_jenis),
      jenis_bencana: draft.jenis_bencana,
      nama_kejadian: draft.nama_kejadian,
      slug_nama: draft.slug_nama || null,
      waktu_kejadian: new Date(waktu).toISOString(),
      tarikh: draft.tarikh,
      penyebab: draft.penyebab || null,
      kronologi: draft.kronologi || null,
      deskripsi: draft.deskripsi || null,
      cakupan: draft.cakupan || null,
      kabupaten: draft.kabupaten || null,
      kode_kabupaten: draft.kode_kabupaten || null,
      kecamatan: draft.kecamatan || null,
      desa_ringkas: draft.desa_ringkas || null,
      latitude: draft.latitude ? Number(Number(draft.latitude).toFixed(6)) : null,
      longitude: draft.longitude ? Number(Number(draft.longitude).toFixed(6)) : null,
      cuaca: draft.cuaca || null,
      sumber_informasi: draft.sumber_informasi || null,
      status_darurat: draft.status_darurat,
      permintaan_bantuan_nasional: draft.permintaan_bantuan_nasional,
      nomor_sk: draft.nomor_sk || null,
      sebaran_dampak: draft.sebaran_dampak || null,
      himbauan: draft.himbauan || null,
      personil_terlibat: draft.personil_terlibat || null,
      status: "aktif",
      laporan_id: laporanId ?? null,
      lokasi: draft.desa_ringkas
        ? [
            {
              desa: draft.desa_ringkas,
              kecamatan: draft.kecamatan,
              kabupaten: draft.kabupaten,
              latitude: draft.latitude ? Number(draft.latitude) : null,
              longitude: draft.longitude ? Number(draft.longitude) : null,
            },
          ]
        : [],
    };
    const res = await fetch("/api/sik/kejadian", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as { item?: { id: string }; error?: string } | null;
    setBusy(false);
    if (!res.ok || !data?.item) {
      setError(typeof data?.error === "string" ? data.error : "Gagal menyimpan");
      return;
    }
    router.push({ pathname: "/admin/sik/kejadian/[id]", params: { id: data.item.id } });
  }

  return (
    <GlassPanel className="p-5">
      <p className="text-xs uppercase tracking-wide text-[var(--text-dim)]">Langkah {step} / 3 · Juklak 7/2023</p>
      <h1 className="mt-1 text-xl font-semibold">Kejadian baru</h1>
      {error ? <p className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}

      {step === 1 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Jenis bencana">
            <select
              className={inputClass}
              value={draft.kode_jenis}
              onChange={(e) => set("kode_jenis", e.target.value ? Number(e.target.value) : "")}
            >
              <option value="">Pilih jenis</option>
              {JENIS_BENCANA_JUKLAK.map((j) => (
                <option key={j.kode} value={j.kode}>
                  {j.kode} · {j.jenis}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nama kejadian">
            <select
              className={inputClass}
              value={draft.slug_nama}
              onChange={(e) => {
                const slug = e.target.value;
                const nama = jenis?.namaKejadian.find((n) => n.slug === slug);
                set("slug_nama", slug);
                if (nama) set("nama_kejadian", nama.nama);
              }}
            >
              <option value="">Pilih nama</option>
              {(jenis?.namaKejadian ?? []).map((n) => (
                <option key={n.slug} value={n.slug}>
                  {n.nama}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Atau ketik nama kejadian">
            <input className={inputClass} value={draft.nama_kejadian} onChange={(e) => set("nama_kejadian", e.target.value)} />
          </Field>
          <Field label="Tarikh (tanggal)">
            <input type="date" className={inputClass} value={draft.tarikh} onChange={(e) => set("tarikh", e.target.value)} />
          </Field>
          <Field label="Waktu kejadian (jam)">
            <input type="time" className={inputClass} value={draft.jam} onChange={(e) => set("jam", e.target.value)} />
          </Field>
          <Field label="Penyebab">
            <textarea className={inputClass} rows={2} value={draft.penyebab} onChange={(e) => set("penyebab", e.target.value)} />
          </Field>
          <Field label="Kronologi">
            <textarea className={inputClass} rows={2} value={draft.kronologi} onChange={(e) => set("kronologi", e.target.value)} />
          </Field>
          <div className="md:col-span-2">
            <Field label="Deskripsi">
              <textarea
                className={inputClass}
                rows={3}
                placeholder={deskripsiPlaceholder(draft.kode_jenis === "" ? null : Number(draft.kode_jenis))}
                value={draft.deskripsi}
                onChange={(e) => set("deskripsi", e.target.value)}
              />
            </Field>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Cakupan">
            <select className={inputClass} value={draft.cakupan} onChange={(e) => set("cakupan", e.target.value)}>
              <option value="desa">Desa</option>
              <option value="kecamatan">Kecamatan</option>
              <option value="kabupaten">Kabupaten/Kota</option>
              <option value="provinsi">Provinsi</option>
            </select>
          </Field>
          <Field label="Kabupaten/Kota">
            <select
              className={inputClass}
              value={draft.kode_kabupaten}
              onChange={(e) => {
                const kode = e.target.value;
                const kab = findKabupaten(kode);
                set("kode_kabupaten", kode);
                set("kabupaten", kab?.nama ?? "");
              }}
            >
              <option value="">Pilih kabupaten/kota</option>
              {ACEH_KABUPATEN.map((k) => (
                <option key={k.kode} value={k.kode}>
                  {k.kode} · {k.nama}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kecamatan">
            <input className={inputClass} value={draft.kecamatan} onChange={(e) => set("kecamatan", e.target.value)} />
          </Field>
          <Field label="Desa terdampak">
            <input className={inputClass} value={draft.desa_ringkas} onChange={(e) => set("desa_ringkas", e.target.value)} />
          </Field>
          <div className="flex items-end gap-2 md:col-span-2">
            <Field label="Latitude (min. 6 desimal)">
              <input className={inputClass} value={draft.latitude} onChange={(e) => set("latitude", e.target.value)} />
            </Field>
            <Field label="Longitude (min. 6 desimal)">
              <input className={inputClass} value={draft.longitude} onChange={(e) => set("longitude", e.target.value)} />
            </Field>
            <Button type="button" variant="outline" size="sm" onClick={captureGps}>
              GPS
            </Button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label="Cuaca">
            <input className={inputClass} value={draft.cuaca} onChange={(e) => set("cuaca", e.target.value)} />
          </Field>
          <Field label="Sumber informasi">
            <input className={inputClass} value={draft.sumber_informasi} onChange={(e) => set("sumber_informasi", e.target.value)} />
          </Field>
          <Field label="Nomor SK darurat">
            <input className={inputClass} value={draft.nomor_sk} onChange={(e) => set("nomor_sk", e.target.value)} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={draft.status_darurat}
              onChange={(e) => set("status_darurat", e.target.checked)}
            />
            Status keadaan darurat
          </label>
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input
              type="checkbox"
              checked={draft.permintaan_bantuan_nasional}
              onChange={(e) => set("permintaan_bantuan_nasional", e.target.checked)}
            />
            Permintaan bantuan nasional
          </label>
          {kibPreview ? (
            <p className="md:col-span-2 text-sm text-[var(--text-dim)]">
              Pratinjau KIB (index akhir ditetapkan server): <span className="font-mono">{kibPreview}</span>
            </p>
          ) : (
            <p className="md:col-span-2 text-sm text-[var(--text-dim)]">
              Isi jenis dan kabupaten agar KIB 16 digit bisa dibentuk.
            </p>
          )}
          <div className="md:col-span-2">
            <Field label="Sebaran dampak">
              <input className={inputClass} value={draft.sebaran_dampak} onChange={(e) => set("sebaran_dampak", e.target.value)} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Himbauan">
              <textarea className={inputClass} rows={2} value={draft.himbauan} onChange={(e) => set("himbauan", e.target.value)} />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Personil terlibat">
              <textarea className={inputClass} rows={2} value={draft.personil_terlibat} onChange={(e) => set("personil_terlibat", e.target.value)} />
            </Field>
          </div>
        </div>
      ) : null}

      {draft.kode_kabupaten && draft.kode_jenis !== "" ? (
        <div className="mt-4">
          <KrbContextCard
            kodeKabupaten={draft.kode_kabupaten}
            kodeJenis={Number(draft.kode_jenis)}
            namaKejadian={draft.nama_kejadian}
          />
        </div>
      ) : null}

      <div className="mt-5 flex justify-between">
        <Button type="button" variant="outline" disabled={step === 1} onClick={() => setStep((s) => s - 1)}>
          Kembali
        </Button>
        {step < 3 ? (
          <Button
            type="button"
            onClick={() => setStep((s) => s + 1)}
            disabled={step === 1 && !draft.nama_kejadian}
          >
            Lanjut
          </Button>
        ) : (
          <Button type="button" onClick={() => void submit()} disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan kejadian"}
          </Button>
        )}
      </div>
    </GlassPanel>
  );
}
