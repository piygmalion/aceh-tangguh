"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { ACEH_KABUPATEN } from "@/lib/sik/juklak";

type Slot = {
  kode: string;
  nama: string;
  occupied: boolean;
  email: string | null;
  displayName: string | null;
};

const EMPTY_SLOTS: Slot[] = ACEH_KABUPATEN.map((kab) => ({
  kode: kab.kode,
  nama: kab.nama,
  occupied: false,
  email: null,
  displayName: null,
}));

export function StaffInviteTable() {
  const t = useTranslations("admin");
  const [slots, setSlots] = useState<Slot[]>(EMPTY_SLOTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [kode, setKode] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { slots?: Slot[]; error?: string } | null;
    if (!res.ok) {
      setError(data?.error ?? t("staffLoadError"));
      setSlots(EMPTY_SLOTS);
      setKode((current) => current || EMPTY_SLOTS[0]?.kode || "");
      setLoading(false);
      return;
    }
    const next = data?.slots ?? EMPTY_SLOTS;
    setSlots(next);
    const firstEmpty = next.find((slot) => !slot.occupied);
    setKode((current) => current || firstEmpty?.kode || "");
    setLoading(false);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    if (!kode || !email.trim()) return;
    setPending(kode);
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, displayName, kodeKabupaten: kode }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setPending(null);
    if (!res.ok) {
      setError(data?.error === "kabupaten_occupied" ? t("staffOccupied") : t("staffInviteError"));
      return;
    }
    setEmail("");
    setDisplayName("");
    await load();
  }

  const empty = slots.filter((slot) => !slot.occupied);
  const filled = slots.filter((slot) => slot.occupied).length;

  return (
    <GlassPanel className="p-4 sm:p-6">
      <p className="text-sm text-[var(--text-dim)]">
        {t("staffProgress", { filled, total: 23 })}
      </p>
      <form className="mt-4 grid gap-3 sm:grid-cols-2" onSubmit={(event) => void invite(event)}>
        <label className="flex flex-col gap-1 text-sm">
          {t("staffKabupaten")}
          <select
            className="h-11 rounded-xl border border-[var(--glass-border)] bg-transparent px-3"
            value={kode}
            onChange={(event) => setKode(event.target.value)}
            required
          >
            {empty.map((slot) => (
              <option key={slot.kode} value={slot.kode}>
                {slot.kode} · {slot.nama}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("staffEmail")}
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 rounded-xl border border-[var(--glass-border)] bg-transparent px-3"
            autoComplete="off"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          {t("staffDisplayName")}
          <input
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="h-11 rounded-xl border border-[var(--glass-border)] bg-transparent px-3"
          />
        </label>
        <div className="sm:col-span-2">
          <Button type="submit" size="sm" disabled={!empty.length || !kode || !email.trim() || Boolean(pending)}>
            {pending ? t("staffInviting") : t("staffInvite")}
          </Button>
        </div>
      </form>
      {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="text-[var(--text-dim)]">
              <th className="py-2 pr-3 font-medium">{t("staffColKode")}</th>
              <th className="py-2 pr-3 font-medium">{t("staffColNama")}</th>
              <th className="py-2 font-medium">{t("staffColStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="py-3" colSpan={3}>
                  {t("staffLoading")}
                </td>
              </tr>
            ) : (
              slots.map((slot) => (
                <tr key={slot.kode} className="border-t border-[var(--glass-border)]">
                  <td className="py-2 pr-3 font-mono">{slot.kode}</td>
                  <td className="py-2 pr-3">{slot.nama}</td>
                  <td className="py-2">
                    {slot.occupied ? slot.email || t("staffInvited") : t("staffVacant")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </GlassPanel>
  );
}
