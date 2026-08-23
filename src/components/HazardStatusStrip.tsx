"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Chip } from "@/components/ui/Chip";
import { qk } from "@/lib/qk";
import type { HazardStatus } from "@/lib/types";

async function fetchHazards(): Promise<HazardStatus[]> {
  const res = await fetch("/api/hazards");
  if (!res.ok) throw new Error("Failed to load hazards");
  return res.json();
}

export function HazardStatusStrip() {
  const t = useTranslations("hazards");
  const { data = [], isLoading, isError } = useQuery({
    queryKey: qk.hazards,
    queryFn: fetchHazards,
    staleTime: 30_000,
  });

  return (
    <section
      id="status"
      className="relative z-[1] -mt-2 border-y border-[var(--glass-border)] bg-[var(--bg-raised)]/80 px-4 py-5 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[0.72rem] font-semibold uppercase tracking-[0.16em] text-[var(--text-dim)]">
          {t("label")}
        </div>
        <div className="flex flex-wrap gap-2">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <span
                  key={i}
                  className="skeleton h-8 w-24 rounded-full"
                  aria-hidden
                />
              ))
            : null}
          {isError ? (
            <Chip tone="neutral">{t("error")}</Chip>
          ) : (
            data.map((h) => (
              <Link key={h.kind} href={{ pathname: "/peta", query: { hazard: h.kind } }}>
                <Chip
                  tone={
                    h.severity === "high"
                      ? "danger"
                      : h.severity === "med"
                        ? "warn"
                        : "neutral"
                  }
                  className="hover:ring-1 hover:ring-[var(--accent)]"
                >
                  <span className="opacity-90">{h.label}</span>
                  <span className="rounded-full bg-black/10 px-1.5 py-0.5 text-xs dark:bg-white/10">
                    {h.count}
                  </span>
                </Chip>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
