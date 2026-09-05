"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button-legacy";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { ACEH_KABUPATEN, findKabupaten } from "@/lib/sik/juklak";
import { JENIS_BENCANA_JUKLAK } from "@/lib/sik/jenis-bencana";
import type { OverlayCalonKejadianRow, OverlayCalonStatus } from "@/lib/sik/db-tables";

const TABS: OverlayCalonStatus[] = ["draf", "ditolak", "diterima"];

function calonBelumTerikat(row: { kode_kabupaten?: string | null; kabupaten?: string | null }): boolean {
  return !row.kode_kabupaten?.trim() && !row.kabupaten?.trim();
}

const inputClass =
  "w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none";

type PanelKind = "terima" | "tolak";

function apiError(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data && typeof data.error === "string") {
    return data.error;
  }
  return fallback;
}

function kabDisplay(row: OverlayCalonKejadianRow, unbound: string): string {
  const kab = row.kabupaten?.trim();
  const kode = row.kode_kabupaten?.trim();
  if (kab || kode) return kab || kode || unbound;
  return unbound;
}

function usulanJenisTeks(row: OverlayCalonKejadianRow): string {
  if (typeof row.usulan_jenis_bencana === "string") return row.usulan_jenis_bencana;
  return String(row.usulan_kode_jenis);
}

export function CalonKejadianList({ isKabScoped }: { isKabScoped: boolean }) {
  const t = useTranslations("sikCalon");
  const router = useRouter();
  const [tab, setTab] = useState<OverlayCalonStatus>("draf");
  const [items, setItems] = useState<OverlayCalonKejadianRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<{ kind: PanelKind; id: string } | null>(null);
  const [kodeKabupaten, setKodeKabupaten] = useState("");
  const [tarikh, setTarikh] = useState("");
  const [jam, setJam] = useState("");
  const [kodeJenis, setKodeJenis] = useState("");
  const [namaKejadian, setNamaKejadian] = useState("");
  const [alasan, setAlasan] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load(status: OverlayCalonStatus) {
    setLoading(true);
    const res = await fetch(`/api/sik/calon-kejadian?status=${status}`, { cache: "no-store" });
    if (!res.ok) {
      setError(t("loadError"));
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { items: OverlayCalonKejadianRow[] };
    setItems(data.items);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    void load(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  function closePanel() {
    setPanel(null);
    setFormError(null);
    setSubmitting(false);
  }

  function openPanel(kind: PanelKind, row: OverlayCalonKejadianRow) {
    setPanel({ kind, id: row.id });
    setKodeKabupaten("");
    setTarikh("");
    setJam("");
    setKodeJenis("");
    setNamaKejadian(row.nama_sinyal);
    setAlasan("");
    setFormError(null);
  }

  async function submitTerima(row: OverlayCalonKejadianRow) {
    const body: Record<string, unknown> = {};

    if (calonBelumTerikat(row)) {
      if (isKabScoped) {
        if (!kodeKabupaten.trim()) {
          setFormError(t("errorKabupatenWajib"));
          return;
        }
        const kab = findKabupaten(kodeKabupaten);
        if (!kab) {
          setFormError(t("errorKabupatenWajib"));
          return;
        }
        body.kode_kabupaten = kab.kode;
        body.kabupaten = kab.nama;
      } else if (kodeKabupaten.trim()) {
        const kab = findKabupaten(kodeKabupaten);
        if (kab) {
          body.kode_kabupaten = kab.kode;
          body.kabupaten = kab.nama;
        }
      }
    }

    if (row.waktu_sinyal == null) {
      if (!tarikh || !jam) {
        setFormError(t("errorWaktuWajib"));
        return;
      }
      let iso: string;
      try {
        iso = new Date(`${tarikh}T${jam}:00+07:00`).toISOString();
      } catch {
        setFormError(t("errorWaktuWajib"));
        return;
      }
      if (iso.length < 8) {
        setFormError(t("errorWaktuWajib"));
        return;
      }
      body.waktu_kejadian = iso;
    }

    if (row.usulan_kode_jenis == null) {
      if (!kodeJenis) {
        setFormError(t("errorJenisWajib"));
        return;
      }
      body.kode_jenis = Number(kodeJenis);
    }

    const nama = namaKejadian.trim();
    if (nama.length >= 2) {
      body.nama_kejadian = nama;
    }

    setSubmitting(true);
    setFormError(null);
    const res = await fetch(`/api/sik/calon-kejadian/${row.id}/terima`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      setFormError(apiError(data, t("errorTerima")));
      setSubmitting(false);
      return;
    }
    const kejadianId =
      data &&
      typeof data === "object" &&
      "kejadian" in data &&
      data.kejadian &&
      typeof data.kejadian === "object" &&
      "id" in data.kejadian &&
      typeof data.kejadian.id === "string"
        ? data.kejadian.id
        : null;
    if (!kejadianId) {
      setFormError(t("errorTerima"));
      setSubmitting(false);
      return;
    }
    router.push({ pathname: "/admin/sik/kejadian/[id]", params: { id: kejadianId } });
  }

  async function submitTolak(row: OverlayCalonKejadianRow) {
    const trimmed = alasan.trim();
    const body = trimmed ? { ditolak_alasan: trimmed } : {};
    setSubmitting(true);
    setFormError(null);
    const res = await fetch(`/api/sik/calon-kejadian/${row.id}/tolak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      setFormError(apiError(data, t("errorTolak")));
      setSubmitting(false);
      return;
    }
    closePanel();
    void load("draf");
  }

  return (
    <GlassPanel className="p-5">
      <div>
        <h1 className="text-xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--text-dim)]">{t("lead")}</p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((value) => (
          <Button
            key={value}
            type="button"
            size="sm"
            variant={tab === value ? "primary" : "outline"}
            onClick={() => {
              closePanel();
              setTab(value);
            }}
          >
            {value === "draf" ? t("tabDraf") : value === "ditolak" ? t("tabDitolak") : t("tabDiterima")}
          </Button>
        ))}
      </div>
      {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-[var(--text-dim)]">
            <tr>
              <th className="px-2 py-2 font-medium">{t("colNama")}</th>
              <th className="px-2 py-2 font-medium">{t("colSumber")}</th>
              <th className="px-2 py-2 font-medium">{t("colLayer")}</th>
              <th className="px-2 py-2 font-medium">{t("colWaktu")}</th>
              <th className="px-2 py-2 font-medium">{t("colKabupaten")}</th>
              <th className="px-2 py-2 font-medium">{t("colTautan")}</th>
              <th className="px-2 py-2 font-medium">{t("colAsal")}</th>
              <th className="px-2 py-2 font-medium">{t("colAksi")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-2 py-8 text-center text-[var(--text-dim)]">
                  {t("loading")}
                </td>
              </tr>
            ) : items.length === 0 ? (
              error ? null : (
                <tr>
                  <td colSpan={8} className="px-2 py-8 text-center text-[var(--text-dim)]">
                    {t("empty")}
                  </td>
                </tr>
              )
            ) : (
              items.map((row) => {
                const open = panel?.id === row.id;
                return (
                  <RowBlock
                    key={row.id}
                    row={row}
                    tab={tab}
                    open={open}
                    panelKind={open ? panel.kind : null}
                    isKabScoped={isKabScoped}
                    kodeKabupaten={kodeKabupaten}
                    tarikh={tarikh}
                    jam={jam}
                    kodeJenis={kodeJenis}
                    namaKejadian={namaKejadian}
                    alasan={alasan}
                    formError={formError}
                    submitting={submitting}
                    onKodeKabupaten={setKodeKabupaten}
                    onTarikh={setTarikh}
                    onJam={setJam}
                    onKodeJenis={setKodeJenis}
                    onNamaKejadian={setNamaKejadian}
                    onAlasan={setAlasan}
                    onOpen={openPanel}
                    onCancel={closePanel}
                    onTerima={() => void submitTerima(row)}
                    onTolak={() => void submitTolak(row)}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </GlassPanel>
  );
}

function RowBlock({
  row,
  tab,
  open,
  panelKind,
  isKabScoped,
  kodeKabupaten,
  tarikh,
  jam,
  kodeJenis,
  namaKejadian,
  alasan,
  formError,
  submitting,
  onKodeKabupaten,
  onTarikh,
  onJam,
  onKodeJenis,
  onNamaKejadian,
  onAlasan,
  onOpen,
  onCancel,
  onTerima,
  onTolak,
}: {
  row: OverlayCalonKejadianRow;
  tab: OverlayCalonStatus;
  open: boolean;
  panelKind: PanelKind | null;
  isKabScoped: boolean;
  kodeKabupaten: string;
  tarikh: string;
  jam: string;
  kodeJenis: string;
  namaKejadian: string;
  alasan: string;
  formError: string | null;
  submitting: boolean;
  onKodeKabupaten: (v: string) => void;
  onTarikh: (v: string) => void;
  onJam: (v: string) => void;
  onKodeJenis: (v: string) => void;
  onNamaKejadian: (v: string) => void;
  onAlasan: (v: string) => void;
  onOpen: (kind: PanelKind, row: OverlayCalonKejadianRow) => void;
  onCancel: () => void;
  onTerima: () => void;
  onTolak: () => void;
}) {
  const t = useTranslations("sikCalon");
  const locale = useLocale();
  const unbound = calonBelumTerikat(row);
  const showWaktu = row.waktu_sinyal == null;
  const showJenis = row.usulan_kode_jenis == null;
  const namaCell =
    tab === "diterima" && row.kejadian_id ? (
      <Link
        href={{ pathname: "/admin/sik/kejadian/[id]", params: { id: row.kejadian_id } }}
        className="font-medium hover:text-[var(--primary)]"
      >
        {row.nama_sinyal}
      </Link>
    ) : (
      row.nama_sinyal
    );

  return (
    <>
      <tr className="border-t border-[var(--border)]">
        <td className="px-2 py-3">{namaCell}</td>
        <td className="px-2 py-3">{row.sumber_label}</td>
        <td className="px-2 py-3">{row.layer_key}</td>
        <td className="whitespace-nowrap px-2 py-3 text-[var(--text-dim)]">
          {row.waktu_sinyal ? new Date(row.waktu_sinyal).toLocaleString(locale) : "—"}
        </td>
        <td className="px-2 py-3">{kabDisplay(row, t("belumTerikat"))}</td>
        <td className="px-2 py-3">
          {row.tautan_status === "utuh" ? t("tautanUtuh") : t("tautanPutus")}
        </td>
        <td className="px-2 py-3">
          {row.asal_buat === "otomatis" ? t("asalOtomatis") : t("asalManual")}
        </td>
        <td className="px-2 py-3">
          {tab === "draf" ? (
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" onClick={() => onOpen("terima", row)}>
                {t("actionTerima")}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => onOpen("tolak", row)}>
                {t("actionTolak")}
              </Button>
            </div>
          ) : null}
        </td>
      </tr>
      {open && panelKind === "terima" ? (
        <tr className="border-t border-[var(--border)] bg-[var(--primary-dim)]/30">
          <td colSpan={8} className="px-2 py-4">
            <p className="font-medium">{t("formTerimaTitle")}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {unbound ? (
                <label className="block text-sm">
                  <span className="mb-1 block text-[var(--text-dim)]">{t("fieldKabupaten")}</span>
                  <select
                    className={inputClass}
                    value={kodeKabupaten}
                    onChange={(e) => onKodeKabupaten(e.target.value)}
                  >
                    {isKabScoped ? null : <option value="">{t("fieldKabupatenEmpty")}</option>}
                    {ACEH_KABUPATEN.map((k) => (
                      <option key={k.kode} value={k.kode}>
                        {k.kode} · {k.nama}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="text-sm">
                  <span className="mb-1 block text-[var(--text-dim)]">{t("fieldKabupaten")}</span>
                  {row.kabupaten?.trim() || row.kode_kabupaten}
                </p>
              )}
              {showWaktu ? (
                <>
                  <label className="block text-sm">
                    <span className="mb-1 block text-[var(--text-dim)]">{t("fieldWaktuTanggal")}</span>
                    <input
                      type="date"
                      className={inputClass}
                      value={tarikh}
                      onChange={(e) => onTarikh(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block text-[var(--text-dim)]">{t("fieldWaktuJam")}</span>
                    <input
                      type="time"
                      className={inputClass}
                      value={jam}
                      onChange={(e) => onJam(e.target.value)}
                    />
                  </label>
                </>
              ) : null}
              {showJenis ? (
                <label className="block text-sm">
                  <span className="mb-1 block text-[var(--text-dim)]">{t("fieldJenis")}</span>
                  <select
                    className={inputClass}
                    value={kodeJenis}
                    onChange={(e) => onKodeJenis(e.target.value)}
                  >
                    <option value="">{t("fieldJenisEmpty")}</option>
                    {JENIS_BENCANA_JUKLAK.map((j) => (
                      <option key={j.kode} value={j.kode}>
                        {j.kode} · {j.jenis}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="text-sm">
                  <span className="mb-1 block text-[var(--text-dim)]">{t("fieldJenis")}</span>
                  {usulanJenisTeks(row)}
                </p>
              )}
              <label className="block text-sm md:col-span-2">
                <span className="mb-1 block text-[var(--text-dim)]">{t("fieldNama")}</span>
                <input
                  className={inputClass}
                  value={namaKejadian}
                  onChange={(e) => onNamaKejadian(e.target.value)}
                />
              </label>
            </div>
            {formError ? <p className="mt-3 text-sm text-[var(--danger)]">{formError}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={submitting} onClick={onTerima}>
                {t("actionKirimTerima")}
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={submitting} onClick={onCancel}>
                {t("actionBatal")}
              </Button>
            </div>
          </td>
        </tr>
      ) : null}
      {open && panelKind === "tolak" ? (
        <tr className="border-t border-[var(--border)] bg-[var(--primary-dim)]/30">
          <td colSpan={8} className="px-2 py-4">
            <p className="font-medium">{t("formTolakTitle")}</p>
            <label className="mt-3 block text-sm">
              <span className="mb-1 block text-[var(--text-dim)]">{t("fieldAlasan")}</span>
              <textarea
                className={inputClass}
                rows={3}
                value={alasan}
                onChange={(e) => onAlasan(e.target.value)}
              />
            </label>
            {formError ? <p className="mt-3 text-sm text-[var(--danger)]">{formError}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="danger" disabled={submitting} onClick={onTolak}>
                {t("actionKirimTolak")}
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={submitting} onClick={onCancel}>
                {t("actionBatal")}
              </Button>
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}
