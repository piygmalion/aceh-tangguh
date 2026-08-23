"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import type { ReportTopic } from "@/lib/types";
import { fetchPublicApi } from "@/lib/preview/public-api";

const schema = z.object({
  topic: z.enum([
    "banjir",
    "longsor",
    "hunian",
    "perlindungan",
    "logistik",
    "kesehatan",
    "lainnya",
  ]),
  description: z.string().min(10).max(2000),
  longitude: z.number().min(94).max(99),
  latitude: z.number().min(2).max(6),
  placeName: z.string().optional(),
  consentMapDisplay: z.literal(true),
});

const TOPICS: ReportTopic[] = [
  "banjir",
  "longsor",
  "hunian",
  "perlindungan",
  "logistik",
  "kesehatan",
  "lainnya",
];

export function ReportForm() {
  const t = useTranslations("lapor");
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      topic: String(fd.get("topic")) as ReportTopic,
      description: String(fd.get("description") || ""),
      longitude: Number(fd.get("longitude") || 95.3238),
      latitude: Number(fd.get("latitude") || 5.5483),
      placeName: String(fd.get("placeName") || "") || undefined,
      consentMapDisplay: fd.get("consent") === "on",
    };
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      setStatus(parsed.error.issues[0]?.message ?? "Invalid");
      return;
    }
    setBusy(true);
    try {
      const res = await fetchPublicApi("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed");
      setStatus(`${t("success")} (#${json.id})`);
      e.currentTarget.reset();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-raised)] p-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-1 text-sm text-[var(--text-dim)]">{t("subtitle")}</p>
      </div>
      <label className="block text-sm">
        <span className="mb-1 block">{t("topic")}</span>
        <select name="topic" className="w-full rounded-lg border border-[var(--glass-border)] bg-transparent px-3 py-2" defaultValue="banjir">
          {TOPICS.map((topic) => (
            <option key={topic} value={topic}>{topic}</option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block">{t("description")}</span>
        <textarea name="description" required minLength={10} rows={5} className="w-full rounded-lg border border-[var(--glass-border)] bg-transparent px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block">{t("placeName")}</span>
        <input name="placeName" className="w-full rounded-lg border border-[var(--glass-border)] bg-transparent px-3 py-2" />
      </label>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <label>
          <span className="mb-1 block">Longitude</span>
          <input name="longitude" type="number" step="any" defaultValue={95.3238} className="w-full rounded-lg border border-[var(--glass-border)] bg-transparent px-3 py-2" />
        </label>
        <label>
          <span className="mb-1 block">Latitude</span>
          <input name="latitude" type="number" step="any" defaultValue={5.5483} className="w-full rounded-lg border border-[var(--glass-border)] bg-transparent px-3 py-2" />
        </label>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input name="consent" type="checkbox" required className="mt-1" />
        <span>{t("consent")}</span>
      </label>
      <Button type="submit" disabled={busy} className="w-full">{t("submit")}</Button>
      {status && <p className="text-sm text-[var(--text-dim)]">{status}</p>}
    </form>
  );
}
