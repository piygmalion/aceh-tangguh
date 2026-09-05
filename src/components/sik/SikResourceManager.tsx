"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button-legacy";
import { GlassPanel } from "@/components/ui/GlassPanel";

const inputClass =
  "w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none";

export function SikResourceManager({
  resource,
  title,
  fields,
  extra,
  staffOnlyNote,
}: {
  resource: string;
  title: string;
  fields: string[];
  extra?: Record<string, string>;
  staffOnlyNote?: string;
}) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [form, setForm] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const sp = new URLSearchParams({ resource });
    if (extra?.kejadian_id) sp.set("kejadian_id", extra.kejadian_id);
    const res = await fetch(`/api/sik/resource?${sp}`, { cache: "no-store" });
    if (!res.ok) {
      setError("Gagal memuat");
      return;
    }
    const data = (await res.json()) as { items: Record<string, unknown>[] };
    setItems(data.items);
    setError(null);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource, extra?.kejadian_id]);

  async function create() {
    const payload: Record<string, unknown> = { resource, ...extra };
    for (const field of fields) payload[field] = form[field] || null;
    const res = await fetch("/api/sik/resource", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setError("Gagal menyimpan");
      return;
    }
    setForm({});
    await load();
  }

  async function remove(id: string) {
    await fetch("/api/sik/resource", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resource, id }),
    });
    await load();
  }

  return (
    <GlassPanel className="p-5">
      <h2 className="font-semibold">{title}</h2>
      {staffOnlyNote ? <p className="mt-1 text-xs text-[var(--text-dim)]">{staffOnlyNote}</p> : null}
      {error ? <p className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {fields.map((field) => (
          <input
            key={field}
            className={inputClass}
            placeholder={field.replaceAll("_", " ")}
            value={form[field] ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))}
          />
        ))}
      </div>
      <Button className="mt-3" size="sm" onClick={() => void create()}>
        Tambah
      </Button>
      <ul className="mt-3 space-y-2 text-sm">
        {items.length === 0 ? <li className="text-[var(--text-dim)]">Belum ada data.</li> : null}
        {items.map((row) => (
          <li key={String(row.id)} className="flex justify-between gap-2 border-t border-[var(--border)] py-2">
            <span>{fields.map((f) => String(row[f] ?? "")).filter(Boolean).join(" · ") || String(row.id)}</span>
            <Button size="sm" variant="danger" onClick={() => void remove(String(row.id))}>
              Hapus
            </Button>
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}
