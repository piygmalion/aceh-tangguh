"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { AdminListChrome, AdminTableStatusRow } from "@/components/admin/AdminListChrome";
import type { DailyBriefSubscriberStatus, SubscriberPublic } from "@/lib/daily-brief/compose";

export function DailyBriefManager() {
  const t = useTranslations("admin");
  const [items, setItems] = useState<SubscriberPublic[]>([]);
  const [today, setToday] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    const [subs, briefs] = await Promise.all([
      fetch("/api/admin/daily-brief/subscribers", { cache: "no-store" }),
      fetch("/api/admin/daily-brief/briefs", { cache: "no-store" }),
    ]);
    if (!subs.ok || !briefs.ok) {
      setError(t("dailyBriefLoadError"));
      setLoading(false);
      return;
    }
    const subJson = (await subs.json()) as { items: SubscriberPublic[] };
    const briefJson = (await briefs.json()) as { today?: string };
    setItems(subJson.items);
    setToday(briefJson.today ?? null);
    setError(null);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/admin/daily-brief/subscribers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, name }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(t("dailyBriefLoadError"));
      return;
    }
    setPhone("");
    setName("");
    await load();
  }

  async function setStatus(id: string, status: DailyBriefSubscriberStatus) {
    const res = await fetch("/api/admin/daily-brief/subscribers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    if (!res.ok) {
      setError(t("dailyBriefLoadError"));
      return;
    }
    await load();
  }

  async function generate(send: boolean) {
    setBusy(true);
    const res = await fetch("/api/admin/daily-brief/briefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force: true, send }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(t("dailyBriefLoadError"));
      return;
    }
    await load();
  }

  const statusLabel: Record<DailyBriefSubscriberStatus, string> = {
    active: t("dailyBriefStatusActive"),
    inactive: t("dailyBriefStatusInactive"),
    unsubscribed: t("dailyBriefStatusUnsubscribed"),
  };

  return (
    <AdminListChrome
      heading={t("dailyBriefTitle")}
      lead={t("dailyBriefLead")}
      error={error}
      actions={
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={() => void generate(false)}>
            {t("dailyBriefGenerate")}
          </Button>
          <Button type="button" variant="accent" disabled={busy} onClick={() => void generate(true)}>
            {t("dailyBriefGenerateSend")}
          </Button>
          <Button type="button" variant="outline" asChild>
            <a href="/api/admin/daily-brief/subscribers?format=csv">{t("dailyBriefExport")}</a>
          </Button>
        </div>
      }
      footer={
        today ? (
          <p className="mt-4 text-sm text-[var(--text-dim)]">
            {t("dailyBriefToday")}: {today}{" "}
            <a className="text-[var(--primary)] underline" href={`/id/brief/${today}`}>
              {t("dailyBriefOpen")}
            </a>
          </p>
        ) : null
      }
    >
      <form onSubmit={(e) => void add(e)} className="mt-4">
        <FieldGroup className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <Field>
            <FieldLabel>{t("dailyBriefPhone")}</FieldLabel>
            <Input value={phone} onChange={(ev) => setPhone(ev.target.value)} required />
          </Field>
          <Field>
            <FieldLabel>{t("dailyBriefName")}</FieldLabel>
            <Input value={name} onChange={(ev) => setName(ev.target.value)} />
          </Field>
          <div className="flex items-end">
            <Button type="submit" disabled={busy}>
              {busy ? t("dailyBriefAdding") : t("dailyBriefAdd")}
            </Button>
          </div>
        </FieldGroup>
      </form>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--text-dim)]">
              <th className="px-2 py-2 font-medium">{t("dailyBriefName")}</th>
              <th className="px-2 py-2 font-medium">{t("dailyBriefPhone")}</th>
              <th className="px-2 py-2 font-medium">{t("staffColStatus")}</th>
              <th className="px-2 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <AdminTableStatusRow colSpan={4}>{t("staffLoading")}</AdminTableStatusRow>
            ) : items.length === 0 ? (
              <AdminTableStatusRow colSpan={4}>{t("dailyBriefEmpty")}</AdminTableStatusRow>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="border-b border-[var(--border)]">
                  <td className="px-2 py-2">{row.name || "—"}</td>
                  <td className="px-2 py-2 font-mono">{row.phoneMasked}</td>
                  <td className="px-2 py-2">{statusLabel[row.status]}</td>
                  <td className="px-2 py-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        void setStatus(row.id, row.status === "active" ? "inactive" : "active")
                      }
                    >
                      {row.status === "active"
                        ? t("dailyBriefStatusInactive")
                        : t("dailyBriefStatusActive")}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </AdminListChrome>
  );
}
