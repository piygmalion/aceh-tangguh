"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/Chip";
import { Empty, EmptyContent, EmptyDescription } from "@/components/ui/empty";
import { FieldError } from "@/components/ui/field";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { ACEH_KABUPATEN } from "@/lib/sik/juklak";
import { OUTLINE_PRIMARY_CLASS, TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

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
  const emailRef = useRef<HTMLInputElement>(null);
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

  const vacant = slots.filter((slot) => !slot.occupied);
  const filled = slots.filter((slot) => slot.occupied).length;

  return (
    <GlassPanel className="flex flex-col gap-5 p-4 sm:p-6">
      <p className={cn("text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>
        {t("staffProgress", { filled, total: 23 })}
      </p>
      <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => void invite(event)}>
        <label className={cn("flex flex-col gap-1", TYPE_FLOOR_CLASS)}>
          {t("staffKabupaten")}
          <select
            className="h-11 rounded-xl border border-[var(--glass-border)] bg-transparent px-3"
            value={kode}
            onChange={(event) => setKode(event.target.value)}
            required
          >
            {vacant.map((slot) => (
              <option key={slot.kode} value={slot.kode}>
                {slot.kode} · {slot.nama}
              </option>
            ))}
          </select>
        </label>
        <label className={cn("flex flex-col gap-1", TYPE_FLOOR_CLASS)}>
          {t("staffEmail")}
          <input
            ref={emailRef}
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 rounded-xl border border-[var(--glass-border)] bg-transparent px-3"
            autoComplete="off"
          />
        </label>
        <label className={cn("flex flex-col gap-1 sm:col-span-2", TYPE_FLOOR_CLASS)}>
          {t("staffDisplayName")}
          <input
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="h-11 rounded-xl border border-[var(--glass-border)] bg-transparent px-3"
          />
        </label>
        <div className="sm:col-span-2">
          <Button
            type="submit"
            size="sm"
            variant="outline"
            className={OUTLINE_PRIMARY_CLASS}
            disabled={!vacant.length || !kode || !email.trim() || Boolean(pending)}
          >
            {pending ? t("staffInviting") : t("staffInvite")}
          </Button>
        </div>
      </form>
      {error ? (
        <Empty className="border border-dashed" data-testid="staff-error">
          <div className="flex flex-col items-center gap-3">
            <FieldError>{error}</FieldError>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={OUTLINE_PRIMARY_CLASS}
              onClick={() => void load()}
            >
              {t("retry")}
            </Button>
          </div>
        </Empty>
      ) : null}
      {!loading && !error && filled === 0 ? (
        <Empty className="border border-dashed" data-testid="staff-empty">
          <EmptyDescription className={TYPE_FLOOR_CLASS}>
            {t("staffEmptyDescription")}
          </EmptyDescription>
          <EmptyContent>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className={OUTLINE_PRIMARY_CLASS}
              onClick={() => emailRef.current?.focus()}
            >
              {t("staffInvite")}
            </Button>
          </EmptyContent>
        </Empty>
      ) : null}
      <div className="overflow-x-auto">
        <table className={cn("min-w-full text-left", TYPE_FLOOR_CLASS)}>
          <thead>
            <tr className="text-[var(--text-dim)]">
              <th className="py-2 pr-3 font-medium">{t("staffColKode")}</th>
              <th className="py-2 pr-3 font-medium">{t("staffColNama")}</th>
              <th className="py-2 font-medium">{t("staffColStatus")}</th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [0, 1, 2].map((row) => (
                  <tr key={row} data-testid="staff-skeleton-row">
                    <td className="py-3" colSpan={3}>
                      <Skeleton className="h-8 w-full" />
                    </td>
                  </tr>
                ))
              : slots.map((slot) => (
                  <tr key={slot.kode} className="border-t border-[var(--glass-border)]">
                    <td className="py-2 pr-3 font-mono">{slot.kode}</td>
                    <td className="py-2 pr-3">{slot.nama}</td>
                    <td className="py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {slot.occupied ? (
                          <Chip tone="forest" className={TYPE_FLOOR_CLASS}>
                            {t("staffInvited")}
                          </Chip>
                        ) : (
                          <Chip tone="neutral" className={TYPE_FLOOR_CLASS}>
                            {t("staffVacant")}
                          </Chip>
                        )}
                        {slot.email ? (
                          <span className="text-[var(--text-dim)]">{slot.email}</span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </GlassPanel>
  );
}
