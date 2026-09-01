"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import {
  KELOMPOK_UMUR,
  KATEGORI_KORBAN,
  emptyKorbanTerpilah,
  normalizeKorbanTerpilah,
  type KorbanTerpilah,
  type KategoriKorban,
  type KelompokUmur,
} from "@/lib/sik/juklak";
import type { KejadianDampakRow } from "@/lib/sik/db-tables";

const inputClass =
  "w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg)] px-2 py-1.5 text-sm outline-none";

const TABS = [
  { id: "kejadian", label: "Kejadian" },
  { id: "kebutuhan", label: "Kebutuhan" },
  { id: "manusia", label: "Manusia" },
  { id: "ekonomi", label: "Ekonomi" },
  { id: "sapras", label: "Sapras vital" },
  { id: "rumah", label: "Rumah" },
  { id: "pelayanan", label: "Pelayanan dasar" },
  { id: "aset", label: "Aset darurat" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export type DampakFormState = {
  tanggal: string;
  luka_berat: number;
  luka_ringan: number;
  rumah_rb: number;
  rumah_rs: number;
  rumah_rr: number;
  rumah_terendam: number;
  kerugian_rumah_rp: number | "";
  kerugian_pelayanan_rp: number | "";
  kerugian_sapras_rp: number | "";
  kerugian_ekonomi_rp: number | "";
  catatan: string;
  korban_terpilah: KorbanTerpilah;
  kondisi_mutakhir: string;
  upaya_penanganan: string;
  dokumentasi_url: string;
  kebutuhan_dana_juta: number | "";
  kebutuhan_sdm: string;
  kebutuhan_sapras: string;
  kebutuhan_logistik: string;
  kebutuhan_peralatan: string;
  aset_kedaruratan: string;
  pendidikan_rb: number;
  pendidikan_rs: number;
  pendidikan_rr: number;
  pendidikan_terendam: number;
  ibadah_rb: number;
  ibadah_rs: number;
  ibadah_rr: number;
  ibadah_terendam: number;
  faskes_rb: number;
  faskes_rs: number;
  faskes_rr: number;
  faskes_terendam: number;
  kantor_rb: number;
  kantor_rs: number;
  kantor_rr: number;
  kantor_terendam: number;
  pasar_rb: number;
  pasar_rs: number;
  pasar_rr: number;
  pasar_terendam: number;
  sawah_ha: number | "";
  lahan_ha: number | "";
  kebun_ha: number | "";
  hutan_ha: number | "";
  kolam_ha: number | "";
  toko_rb: number;
  toko_rs: number;
  toko_rr: number;
  toko_terendam: number;
  pabrik_rb: number;
  pabrik_rs: number;
  pabrik_rr: number;
  pabrik_terendam: number;
  air_jaringan: string;
  listrik_jaringan: string;
  telekom_jaringan: string;
  irigasi_jaringan: string;
  jalan_km: number | "";
  jembatan_rb: number;
  jembatan_rs: number;
  jembatan_rr: number;
  jembatan_terendam: number;
  transportasi_jaringan: string;
  spbu_jaringan: string;
};

export function emptyDampakForm(): DampakFormState {
  return {
    tanggal: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()),
    luka_berat: 0,
    luka_ringan: 0,
    rumah_rb: 0,
    rumah_rs: 0,
    rumah_rr: 0,
    rumah_terendam: 0,
    kerugian_rumah_rp: "",
    kerugian_pelayanan_rp: "",
    kerugian_sapras_rp: "",
    kerugian_ekonomi_rp: "",
    catatan: "",
    korban_terpilah: emptyKorbanTerpilah(),
    kondisi_mutakhir: "",
    upaya_penanganan: "",
    dokumentasi_url: "",
    kebutuhan_dana_juta: "",
    kebutuhan_sdm: "",
    kebutuhan_sapras: "",
    kebutuhan_logistik: "",
    kebutuhan_peralatan: "",
    aset_kedaruratan: "",
    pendidikan_rb: 0,
    pendidikan_rs: 0,
    pendidikan_rr: 0,
    pendidikan_terendam: 0,
    ibadah_rb: 0,
    ibadah_rs: 0,
    ibadah_rr: 0,
    ibadah_terendam: 0,
    faskes_rb: 0,
    faskes_rs: 0,
    faskes_rr: 0,
    faskes_terendam: 0,
    kantor_rb: 0,
    kantor_rs: 0,
    kantor_rr: 0,
    kantor_terendam: 0,
    pasar_rb: 0,
    pasar_rs: 0,
    pasar_rr: 0,
    pasar_terendam: 0,
    sawah_ha: "",
    lahan_ha: "",
    kebun_ha: "",
    hutan_ha: "",
    kolam_ha: "",
    toko_rb: 0,
    toko_rs: 0,
    toko_rr: 0,
    toko_terendam: 0,
    pabrik_rb: 0,
    pabrik_rs: 0,
    pabrik_rr: 0,
    pabrik_terendam: 0,
    air_jaringan: "",
    listrik_jaringan: "",
    telekom_jaringan: "",
    irigasi_jaringan: "",
    jalan_km: "",
    jembatan_rb: 0,
    jembatan_rs: 0,
    jembatan_rr: 0,
    jembatan_terendam: 0,
    transportasi_jaringan: "",
    spbu_jaringan: "",
  };
}

function numOrNull(v: number | ""): number | null {
  if (v === "") return null;
  return Number(v);
}

export function dampakFormToPayload(form: DampakFormState) {
  return {
    ...form,
    kerugian_rumah_rp: numOrNull(form.kerugian_rumah_rp),
    kerugian_pelayanan_rp: numOrNull(form.kerugian_pelayanan_rp),
    kerugian_sapras_rp: numOrNull(form.kerugian_sapras_rp),
    kerugian_ekonomi_rp: numOrNull(form.kerugian_ekonomi_rp),
    kebutuhan_dana_juta: numOrNull(form.kebutuhan_dana_juta),
    sawah_ha: numOrNull(form.sawah_ha),
    lahan_ha: numOrNull(form.lahan_ha),
    kebun_ha: numOrNull(form.kebun_ha),
    hutan_ha: numOrNull(form.hutan_ha),
    kolam_ha: numOrNull(form.kolam_ha),
    jalan_km: numOrNull(form.jalan_km),
  };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-[var(--text-dim)]">{label}</span>
      {children}
    </label>
  );
}

function IntInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <input
      className={inputClass}
      type="number"
      min={0}
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
    />
  );
}

function DecInput({
  value,
  onChange,
}: {
  value: number | "";
  onChange: (n: number | "") => void;
}) {
  return (
    <input
      className={inputClass}
      type="number"
      min={0}
      step="0.01"
      value={value}
      onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
    />
  );
}

function RusakRow({
  label,
  rb,
  rs,
  rr,
  terendam,
  onChange,
}: {
  label: string;
  rb: number;
  rs: number;
  rr: number;
  terendam: number;
  onChange: (patch: { rb?: number; rs?: number; rr?: number; terendam?: number }) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2 text-sm">
      <span className="self-center text-[var(--text-dim)]">{label}</span>
      <IntInput value={rb} onChange={(n) => onChange({ rb: n })} />
      <IntInput value={rs} onChange={(n) => onChange({ rs: n })} />
      <IntInput value={rr} onChange={(n) => onChange({ rr: n })} />
      <IntInput value={terendam} onChange={(n) => onChange({ terendam: n })} />
    </div>
  );
}

const KAT_LABEL: Record<KategoriKorban, string> = {
  meninggal: "Meninggal",
  hilang: "Hilang",
  luka: "Luka/sakit",
  menderita: "Terdampak",
  mengungsi: "Mengungsi",
};

const UMUR_LABEL: Record<KelompokUmur, string> = {
  anak: "Anak 0–17",
  dewasa: "Dewasa 18–59",
  lansia: "Lansia 60+",
};

export function DampakJuklakForm({
  form,
  setForm,
  busy,
  locked,
  onSave,
  history,
}: {
  form: DampakFormState;
  setForm: (fn: (f: DampakFormState) => DampakFormState) => void;
  busy: boolean;
  locked: boolean;
  onSave: () => void;
  history: KejadianDampakRow[];
}) {
  const [tab, setTab] = useState<TabId>("manusia");

  function setKorban(kat: KategoriKorban, umur: KelompokUmur, sex: "L" | "P", value: number) {
    setForm((f) => {
      const next = normalizeKorbanTerpilah(f.korban_terpilah);
      next[kat][umur][sex] = value;
      return { ...f, korban_terpilah: next };
    });
  }

  return (
    <div>
      <h2 className="font-semibold">Kaji cepat harian (Lampiran I)</h2>
      <p className="mt-1 text-sm text-[var(--text-dim)]">
        Data dinamis. Isi matriks korban terpilah; total meninggal/hilang/mengungsi dihitung otomatis.
      </p>
      <div className="mt-3 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1 text-xs ${
              tab === t.id ? "bg-[var(--fg)] text-[var(--bg)]" : "border border-[var(--glass-border)]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4">
        {tab === "kejadian" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Tanggal kaji cepat">
              <input
                className={inputClass}
                type="date"
                value={form.tanggal}
                onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
              />
            </Field>
            <Field label="Dokumentasi (URL foto/video)">
              <input
                className={inputClass}
                value={form.dokumentasi_url}
                onChange={(e) => setForm((f) => ({ ...f, dokumentasi_url: e.target.value }))}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Kondisi mutakhir">
                <textarea
                  className={inputClass}
                  rows={2}
                  value={form.kondisi_mutakhir}
                  onChange={(e) => setForm((f) => ({ ...f, kondisi_mutakhir: e.target.value }))}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Upaya penanganan">
                <textarea
                  className={inputClass}
                  rows={2}
                  value={form.upaya_penanganan}
                  onChange={(e) => setForm((f) => ({ ...f, upaya_penanganan: e.target.value }))}
                />
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Catatan">
                <textarea
                  className={inputClass}
                  rows={2}
                  value={form.catatan}
                  onChange={(e) => setForm((f) => ({ ...f, catatan: e.target.value }))}
                />
              </Field>
            </div>
          </div>
        ) : null}

        {tab === "kebutuhan" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Dana (Rp juta)">
              <DecInput
                value={form.kebutuhan_dana_juta}
                onChange={(n) => setForm((f) => ({ ...f, kebutuhan_dana_juta: n }))}
              />
            </Field>
            <Field label="Sumber daya manusia">
              <textarea
                className={inputClass}
                rows={2}
                value={form.kebutuhan_sdm}
                onChange={(e) => setForm((f) => ({ ...f, kebutuhan_sdm: e.target.value }))}
              />
            </Field>
            <Field label="Sarana prasarana">
              <textarea
                className={inputClass}
                rows={2}
                value={form.kebutuhan_sapras}
                onChange={(e) => setForm((f) => ({ ...f, kebutuhan_sapras: e.target.value }))}
              />
            </Field>
            <Field label="Logistik">
              <textarea
                className={inputClass}
                rows={2}
                value={form.kebutuhan_logistik}
                onChange={(e) => setForm((f) => ({ ...f, kebutuhan_logistik: e.target.value }))}
              />
            </Field>
            <div className="md:col-span-2">
              <Field label="Peralatan">
                <textarea
                  className={inputClass}
                  rows={2}
                  value={form.kebutuhan_peralatan}
                  onChange={(e) => setForm((f) => ({ ...f, kebutuhan_peralatan: e.target.value }))}
                />
              </Field>
            </div>
          </div>
        ) : null}

        {tab === "manusia" ? (
          <div className="overflow-x-auto">
            <p className="mb-2 text-xs text-[var(--text-dim)]">L = laki-laki · P = perempuan</p>
            <table className="min-w-full text-left text-xs">
              <thead className="text-[var(--text-dim)]">
                <tr>
                  <th className="px-1 py-1">Kategori</th>
                  {KELOMPOK_UMUR.map((u) => (
                    <th key={u} className="px-1 py-1" colSpan={2}>
                      {UMUR_LABEL[u]}
                    </th>
                  ))}
                </tr>
                <tr>
                  <th />
                  {KELOMPOK_UMUR.flatMap((u) => [
                    <th key={`${u}-L`} className="px-1 py-1">
                      L
                    </th>,
                    <th key={`${u}-P`} className="px-1 py-1">
                      P
                    </th>,
                  ])}
                </tr>
              </thead>
              <tbody>
                {KATEGORI_KORBAN.map((kat) => (
                  <tr key={kat} className="border-t border-[var(--border)]">
                    <td className="px-1 py-1 font-medium">{KAT_LABEL[kat]}</td>
                    {KELOMPOK_UMUR.flatMap((umur) => [
                      <td key={`${kat}-${umur}-L`} className="px-1 py-1">
                        <IntInput
                          value={form.korban_terpilah[kat][umur].L}
                          onChange={(n) => setKorban(kat, umur, "L", n)}
                        />
                      </td>,
                      <td key={`${kat}-${umur}-P`} className="px-1 py-1">
                        <IntInput
                          value={form.korban_terpilah[kat][umur].P}
                          onChange={(n) => setKorban(kat, umur, "P", n)}
                        />
                      </td>,
                    ])}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Field label="Luka berat (rincian lokal)">
                <IntInput value={form.luka_berat} onChange={(n) => setForm((f) => ({ ...f, luka_berat: n }))} />
              </Field>
              <Field label="Luka ringan (rincian lokal)">
                <IntInput value={form.luka_ringan} onChange={(n) => setForm((f) => ({ ...f, luka_ringan: n }))} />
              </Field>
            </div>
          </div>
        ) : null}

        {tab === "ekonomi" ? (
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Sawah (Ha)">
              <DecInput value={form.sawah_ha} onChange={(n) => setForm((f) => ({ ...f, sawah_ha: n }))} />
            </Field>
            <Field label="Lahan (Ha)">
              <DecInput value={form.lahan_ha} onChange={(n) => setForm((f) => ({ ...f, lahan_ha: n }))} />
            </Field>
            <Field label="Kebun (Ha)">
              <DecInput value={form.kebun_ha} onChange={(n) => setForm((f) => ({ ...f, kebun_ha: n }))} />
            </Field>
            <Field label="Hutan (Ha)">
              <DecInput value={form.hutan_ha} onChange={(n) => setForm((f) => ({ ...f, hutan_ha: n }))} />
            </Field>
            <Field label="Kolam (Ha)">
              <DecInput value={form.kolam_ha} onChange={(n) => setForm((f) => ({ ...f, kolam_ha: n }))} />
            </Field>
            <Field label="Kerugian ekonomi (Rp juta)">
              <DecInput
                value={form.kerugian_ekonomi_rp}
                onChange={(n) => setForm((f) => ({ ...f, kerugian_ekonomi_rp: n }))}
              />
            </Field>
            <div className="md:col-span-2 space-y-2">
              <div className="grid grid-cols-5 gap-2 text-xs text-[var(--text-dim)]">
                <span />
                <span>RB</span>
                <span>RS</span>
                <span>RR</span>
                <span>Terendam</span>
              </div>
              <RusakRow
                label="Kios/toko"
                rb={form.toko_rb}
                rs={form.toko_rs}
                rr={form.toko_rr}
                terendam={form.toko_terendam}
                onChange={(p) =>
                  setForm((f) => ({
                    ...f,
                    toko_rb: p.rb ?? f.toko_rb,
                    toko_rs: p.rs ?? f.toko_rs,
                    toko_rr: p.rr ?? f.toko_rr,
                    toko_terendam: p.terendam ?? f.toko_terendam,
                  }))
                }
              />
              <RusakRow
                label="Pabrik"
                rb={form.pabrik_rb}
                rs={form.pabrik_rs}
                rr={form.pabrik_rr}
                terendam={form.pabrik_terendam}
                onChange={(p) =>
                  setForm((f) => ({
                    ...f,
                    pabrik_rb: p.rb ?? f.pabrik_rb,
                    pabrik_rs: p.rs ?? f.pabrik_rs,
                    pabrik_rr: p.rr ?? f.pabrik_rr,
                    pabrik_terendam: p.terendam ?? f.pabrik_terendam,
                  }))
                }
              />
            </div>
          </div>
        ) : null}

        {tab === "sapras" ? (
          <div className="grid gap-3">
            <Field label="Jaringan air bersih/minum">
              <input
                className={inputClass}
                value={form.air_jaringan}
                onChange={(e) => setForm((f) => ({ ...f, air_jaringan: e.target.value }))}
              />
            </Field>
            <Field label="Jaringan listrik">
              <input
                className={inputClass}
                value={form.listrik_jaringan}
                onChange={(e) => setForm((f) => ({ ...f, listrik_jaringan: e.target.value }))}
              />
            </Field>
            <Field label="Telekomunikasi">
              <input
                className={inputClass}
                value={form.telekom_jaringan}
                onChange={(e) => setForm((f) => ({ ...f, telekom_jaringan: e.target.value }))}
              />
            </Field>
            <Field label="Irigasi">
              <input
                className={inputClass}
                value={form.irigasi_jaringan}
                onChange={(e) => setForm((f) => ({ ...f, irigasi_jaringan: e.target.value }))}
              />
            </Field>
            <Field label="Jalan rusak (km)">
              <DecInput value={form.jalan_km} onChange={(n) => setForm((f) => ({ ...f, jalan_km: n }))} />
            </Field>
            <div className="grid grid-cols-5 gap-2 text-xs text-[var(--text-dim)]">
              <span />
              <span>RB</span>
              <span>RS</span>
              <span>RR</span>
              <span>Terendam</span>
            </div>
            <RusakRow
              label="Jembatan"
              rb={form.jembatan_rb}
              rs={form.jembatan_rs}
              rr={form.jembatan_rr}
              terendam={form.jembatan_terendam}
              onChange={(p) =>
                setForm((f) => ({
                  ...f,
                  jembatan_rb: p.rb ?? f.jembatan_rb,
                  jembatan_rs: p.rs ?? f.jembatan_rs,
                  jembatan_rr: p.rr ?? f.jembatan_rr,
                  jembatan_terendam: p.terendam ?? f.jembatan_terendam,
                }))
              }
            />
            <Field label="Jaringan transportasi">
              <input
                className={inputClass}
                value={form.transportasi_jaringan}
                onChange={(e) => setForm((f) => ({ ...f, transportasi_jaringan: e.target.value }))}
              />
            </Field>
            <Field label="SPBU">
              <input
                className={inputClass}
                value={form.spbu_jaringan}
                onChange={(e) => setForm((f) => ({ ...f, spbu_jaringan: e.target.value }))}
              />
            </Field>
            <Field label="Kerugian sapras (Rp juta)">
              <DecInput
                value={form.kerugian_sapras_rp}
                onChange={(n) => setForm((f) => ({ ...f, kerugian_sapras_rp: n }))}
              />
            </Field>
          </div>
        ) : null}

        {tab === "rumah" ? (
          <div className="grid gap-3">
            <div className="grid grid-cols-5 gap-2 text-xs text-[var(--text-dim)]">
              <span />
              <span>RB</span>
              <span>RS</span>
              <span>RR</span>
              <span>Terendam</span>
            </div>
            <RusakRow
              label="Rumah"
              rb={form.rumah_rb}
              rs={form.rumah_rs}
              rr={form.rumah_rr}
              terendam={form.rumah_terendam}
              onChange={(p) =>
                setForm((f) => ({
                  ...f,
                  rumah_rb: p.rb ?? f.rumah_rb,
                  rumah_rs: p.rs ?? f.rumah_rs,
                  rumah_rr: p.rr ?? f.rumah_rr,
                  rumah_terendam: p.terendam ?? f.rumah_terendam,
                }))
              }
            />
            <Field label="Taksiran kerugian rumah (Rp juta)">
              <DecInput
                value={form.kerugian_rumah_rp}
                onChange={(n) => setForm((f) => ({ ...f, kerugian_rumah_rp: n }))}
              />
            </Field>
          </div>
        ) : null}

        {tab === "pelayanan" ? (
          <div className="grid gap-3">
            <div className="grid grid-cols-5 gap-2 text-xs text-[var(--text-dim)]">
              <span />
              <span>RB</span>
              <span>RS</span>
              <span>RR</span>
              <span>Terendam</span>
            </div>
            <RusakRow
              label="Pendidikan"
              rb={form.pendidikan_rb}
              rs={form.pendidikan_rs}
              rr={form.pendidikan_rr}
              terendam={form.pendidikan_terendam}
              onChange={(p) =>
                setForm((f) => ({
                  ...f,
                  pendidikan_rb: p.rb ?? f.pendidikan_rb,
                  pendidikan_rs: p.rs ?? f.pendidikan_rs,
                  pendidikan_rr: p.rr ?? f.pendidikan_rr,
                  pendidikan_terendam: p.terendam ?? f.pendidikan_terendam,
                }))
              }
            />
            <RusakRow
              label="Ibadat"
              rb={form.ibadah_rb}
              rs={form.ibadah_rs}
              rr={form.ibadah_rr}
              terendam={form.ibadah_terendam}
              onChange={(p) =>
                setForm((f) => ({
                  ...f,
                  ibadah_rb: p.rb ?? f.ibadah_rb,
                  ibadah_rs: p.rs ?? f.ibadah_rs,
                  ibadah_rr: p.rr ?? f.ibadah_rr,
                  ibadah_terendam: p.terendam ?? f.ibadah_terendam,
                }))
              }
            />
            <RusakRow
              label="Faskes"
              rb={form.faskes_rb}
              rs={form.faskes_rs}
              rr={form.faskes_rr}
              terendam={form.faskes_terendam}
              onChange={(p) =>
                setForm((f) => ({
                  ...f,
                  faskes_rb: p.rb ?? f.faskes_rb,
                  faskes_rs: p.rs ?? f.faskes_rs,
                  faskes_rr: p.rr ?? f.faskes_rr,
                  faskes_terendam: p.terendam ?? f.faskes_terendam,
                }))
              }
            />
            <RusakRow
              label="Kantor"
              rb={form.kantor_rb}
              rs={form.kantor_rs}
              rr={form.kantor_rr}
              terendam={form.kantor_terendam}
              onChange={(p) =>
                setForm((f) => ({
                  ...f,
                  kantor_rb: p.rb ?? f.kantor_rb,
                  kantor_rs: p.rs ?? f.kantor_rs,
                  kantor_rr: p.rr ?? f.kantor_rr,
                  kantor_terendam: p.terendam ?? f.kantor_terendam,
                }))
              }
            />
            <RusakRow
              label="Pasar"
              rb={form.pasar_rb}
              rs={form.pasar_rs}
              rr={form.pasar_rr}
              terendam={form.pasar_terendam}
              onChange={(p) =>
                setForm((f) => ({
                  ...f,
                  pasar_rb: p.rb ?? f.pasar_rb,
                  pasar_rs: p.rs ?? f.pasar_rs,
                  pasar_rr: p.rr ?? f.pasar_rr,
                  pasar_terendam: p.terendam ?? f.pasar_terendam,
                }))
              }
            />
            <Field label="Kerugian pelayanan dasar (Rp juta)">
              <DecInput
                value={form.kerugian_pelayanan_rp}
                onChange={(n) => setForm((f) => ({ ...f, kerugian_pelayanan_rp: n }))}
              />
            </Field>
          </div>
        ) : null}

        {tab === "aset" ? (
          <Field label="Barang layanan kedaruratan (tenda, genset, dll.)">
            <textarea
              className={inputClass}
              rows={4}
              value={form.aset_kedaruratan}
              onChange={(e) => setForm((f) => ({ ...f, aset_kedaruratan: e.target.value }))}
            />
          </Field>
        ) : null}
      </div>

      <Button className="mt-4" size="sm" disabled={busy || locked} onClick={onSave}>
        {locked ? "Terkunci (statis)" : busy ? "Menyimpan…" : "Simpan kaji cepat"}
      </Button>

      {history.length > 0 ? (
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
              {history.map((row) => (
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
    </div>
  );
}
