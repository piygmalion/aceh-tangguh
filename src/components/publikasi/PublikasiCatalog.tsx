"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  Calendar,
  Clock,
  ExternalLink,
  Search,
  User,
  X,
} from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Chip } from "@/components/ui/Chip";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { qk } from "@/lib/qk";
import type {
  PublikasiListItem,
  PublikasiListResponse,
} from "@/lib/publikasi";

async function fetchPublikasiList(): Promise<PublikasiListResponse> {
  const res = await fetchPublicApi("/api/publikasi");
  if (!res.ok) throw new Error("publikasi fetch failed");
  return res.json();
}

function formatDate(iso: string, locale: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale === "en" ? "en-GB" : "id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function structuredSummary(item: PublikasiListItem): string[] {
  const sd = item.structured_data;
  if (!sd || typeof sd !== "object") return [];
  const lines: string[] = [];
  const v = (sd as { V?: Record<string, unknown> }).V;
  if (v && typeof v === "object") {
    if (typeof v.publishedAt === "string" && v.publishedAt !== item.published_at) {
      lines.push(`Published: ${v.publishedAt}`);
    }
    if (typeof v.readTime === "number" && v.readTime !== item.read_time) {
      lines.push(`Read time: ${v.readTime} min`);
    }
  }
  return lines.slice(0, 4);
}

export function PublikasiCatalog() {
  const t = useTranslations("publikasi");
  const locale = useLocale();
  const { data, isLoading, isError } = useQuery({
    queryKey: qk.publikasi,
    queryFn: fetchPublikasiList,
    staleTime: 60_000,
  });

  const [q, setQ] = useState("");
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [selected, setSelected] = useState<PublikasiListItem | null>(null);

  const allTags = data?.tags ?? [];

  const filtered = useMemo(() => {
    const items = data?.publikasi ?? [];
    const needle = q.trim().toLowerCase();
    return items.filter((item) => {
      if (activeTags.length > 0) {
        const tags = item.tags ?? [];
        const hit = activeTags.every((tag) => tags.includes(tag));
        if (!hit) return false;
      }
      if (!needle) return true;
      const hay = `${item.title} ${item.description}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [data?.publikasi, q, activeTags]);

  function toggleTag(tag: string) {
    setActiveTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }

  function resetFilters() {
    setQ("");
    setActiveTags([]);
  }

  if (isLoading) {
    return (
      <GlassPanel className="p-6 text-sm text-[var(--text-dim)]">
        {t("loading")}
      </GlassPanel>
    );
  }

  if (isError || !data) {
    return (
      <GlassPanel className="p-6 text-sm text-[var(--danger)]">
        {t("error")}
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-5">
      <GlassPanel className="p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs text-[var(--text-dim)]">
              {t("showing", { count: filtered.length, total: data.publikasi.length })}
            </p>
          </div>
          {(q || activeTags.length > 0) && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-[var(--text-dim)] hover:text-[var(--accent)]"
            >
              {t("reset")}
            </button>
          )}
        </div>

        <label className="relative mt-4 block max-w-xl">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-dim)]"
          />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-xl border border-[var(--glass-border)] bg-[var(--bg-muted)] py-2 pl-8 pr-3 text-sm outline-none focus:border-[var(--accent)]"
            aria-label={t("searchPlaceholder")}
          />
        </label>

        {allTags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t("filterTags")}>
            {allTags.map((tag) => (
              <Chip
                key={tag}
                tone={activeTags.includes(tag) ? "ok" : "neutral"}
                active={activeTags.includes(tag)}
                onClick={() => toggleTag(tag)}
                className="text-xs"
              >
                {tag}
              </Chip>
            ))}
          </div>
        ) : null}
      </GlassPanel>

      {filtered.length === 0 ? (
        <GlassPanel className="p-8 text-center text-sm text-[var(--text-dim)]">
          {t("empty")}
        </GlassPanel>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <GlassPanel
              key={item.slug}
              as="article"
              className="flex h-full flex-col overflow-hidden p-0"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-[var(--bg-muted)]">
                {item.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnail_url}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-[var(--text-dim)]">
                    {t("noThumbnail")}
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-3 p-4">
                <h2 className="text-base font-semibold leading-snug tracking-tight">
                  {item.title}
                </h2>
                <p className="line-clamp-3 text-sm leading-relaxed text-[var(--text-dim)]">
                  {item.description}
                </p>
                <div className="mt-auto space-y-3">
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-dim)]">
                    {item.author?.name ? (
                      <span className="inline-flex items-center gap-1">
                        <User size={12} aria-hidden />
                        {item.author.name}
                      </span>
                    ) : null}
                    <span className="inline-flex items-center gap-1">
                      <Calendar size={12} aria-hidden />
                      {formatDate(item.published_at, locale)}
                    </span>
                    {typeof item.read_time === "number" ? (
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} aria-hidden />
                        {t("readTime", { minutes: item.read_time })}
                      </span>
                    ) : null}
                  </div>
                  {(item.tags?.length ?? 0) > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[var(--glass-border)] bg-[var(--bg-muted)] px-2 py-0.5 text-[0.65rem] text-[var(--text-dim)]"
                        >
                          {tag}
                        </span>
                      ))}
                      {item.tags.length > 4 ? (
                        <span className="px-1 text-[0.65rem] text-[var(--text-dim)]">
                          +{item.tags.length - 4}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className="rounded-full border border-[var(--glass-border)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      {t("detail")}
                    </button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-dim)] px-3 py-1.5 text-xs font-medium text-[var(--accent)] transition hover:brightness-110"
                    >
                      {t("openOriginal")}
                      <ExternalLink size={12} aria-hidden />
                    </a>
                  </div>
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}

      {selected ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="publikasi-detail-title"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
          <GlassPanel className="p-5 shadow-[var(--shadow-elevated)] sm:p-6">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <h2
                  id="publikasi-detail-title"
                  className="text-xl font-semibold tracking-tight"
                >
                  {selected.title}
                </h2>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--glass-border)] text-[var(--text-dim)] hover:text-[var(--accent)]"
                  aria-label={t("closeDetail")}
                >
                  <X size={16} />
                </button>
              </div>

              {selected.thumbnail_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selected.thumbnail_url}
                  alt=""
                  className="max-h-48 w-full rounded-xl object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : null}

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--text-dim)]">
                {selected.author?.name ? (
                  <span className="inline-flex items-center gap-1">
                    <User size={12} aria-hidden />
                    {selected.author.name}
                    {selected.author.role ? ` · ${selected.author.role}` : ""}
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} aria-hidden />
                  {formatDate(selected.published_at, locale)}
                </span>
                {typeof selected.read_time === "number" ? (
                  <span className="inline-flex items-center gap-1">
                    <Clock size={12} aria-hidden />
                    {t("readTime", { minutes: selected.read_time })}
                  </span>
                ) : null}
              </div>

              <p className="text-sm leading-relaxed text-[var(--text-dim)]">
                {selected.description}
              </p>

              {(selected.tags?.length ?? 0) > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {selected.tags.map((tag) => (
                    <Chip key={tag} tone="neutral" className="text-xs">
                      {tag}
                    </Chip>
                  ))}
                </div>
              ) : null}

              {structuredSummary(selected).length > 0 ? (
                <ul className="space-y-1 text-xs text-[var(--text-dim)]">
                  {structuredSummary(selected).map((line) => (
                    <li key={line}>· {line}</li>
                  ))}
                </ul>
              ) : null}

              <p className="text-xs text-[var(--text-dim)]">{t("safeNote")}</p>

              <a
                href={selected.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent-dim)] px-4 py-2 text-sm font-medium text-[var(--accent)] transition hover:brightness-110"
              >
                {t("openOriginal")}
                <ExternalLink size={14} aria-hidden />
              </a>
            </div>
          </GlassPanel>
          </div>
        </div>
      ) : null}
    </div>
  );
}
