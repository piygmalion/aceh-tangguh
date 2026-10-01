"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { destanaLevelLabel, type PkdLevel } from "@/lib/sik/pkd";
import {
  isDestanaAssessed,
  type DestanaPublicPayload,
} from "@/lib/sik/destana-public";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchPublicApi } from "@/lib/preview/public-api";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

const LEVELS = ["utama", "madya", "pratama", "belum"] as const;

type DestanaCopy = {
  unavailable: string;
  loadError: string;
  partial: string;
  prev: string;
  next: string;
  colDesa: string;
  colKabupaten: string;
  colStatus: string;
  colIndeks: string;
};

type DestanaPublicViewProps = {
  pending: boolean;
  error: boolean;
  payload: DestanaPublicPayload | null;
  copy: DestanaCopy;
  onPage?: (page: number) => void;
};

export function DestanaPublicView({
  pending,
  error,
  payload,
  copy,
  onPage,
}: DestanaPublicViewProps) {
  if (pending) {
    return (
      <div className="flex flex-col gap-6">
        <div
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
          data-testid="destana-public-skeleton"
        >
          {LEVELS.map((level) => (
            <GlassPanel key={level} className="flex flex-col gap-2 p-4">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-12" />
            </GlassPanel>
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <Empty className="border border-dashed" data-testid="destana-public-error">
        <EmptyDescription className={TYPE_FLOOR_CLASS}>{copy.loadError}</EmptyDescription>
      </Empty>
    );
  }

  if (!isDestanaAssessed(payload)) {
    return (
      <Empty className="border border-dashed" data-testid="destana-public-empty">
        <EmptyDescription className={TYPE_FLOOR_CLASS}>{copy.unavailable}</EmptyDescription>
      </Empty>
    );
  }

  const hasPrev = payload.page > 1;
  const hasNext = payload.page * payload.pageSize < payload.listTotal;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="destana-public-counts">
        {LEVELS.map((level) => (
          <GlassPanel key={level} className="flex flex-col gap-1 p-4">
            <p className={cn(TYPE_FLOOR_CLASS, "text-[var(--text-dim)]")}>
              {destanaLevelLabel(level)}
            </p>
            <p className="text-2xl font-semibold">{payload.counts[level] ?? 0}</p>
          </GlassPanel>
        ))}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="text-[var(--text-dim)]">
            <tr>
              <th className="px-2 py-2">{copy.colDesa}</th>
              <th className="px-2 py-2">{copy.colKabupaten}</th>
              <th className="px-2 py-2">{copy.colStatus}</th>
              <th className="px-2 py-2">{copy.colIndeks}</th>
            </tr>
          </thead>
          <tbody>
            {payload.items.map((row) => (
              <tr key={row.id} className="border-t border-[var(--border)]">
                <td className="px-2 py-2">{row.nama}</td>
                <td className="px-2 py-2">{row.kabupaten ?? "—"}</td>
                <td className="px-2 py-2">
                  {destanaLevelLabel((row.destana_level as PkdLevel) || "belum")}
                </td>
                <td className="px-2 py-2">{row.destana_indeks ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {payload.partial ? (
        <p className={cn(TYPE_FLOOR_CLASS, "text-[var(--text-dim)]")}>{copy.partial}</p>
      ) : null}
      {hasPrev || hasNext ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasPrev}
            onClick={() => onPage?.(payload.page - 1)}
          >
            {copy.prev}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasNext}
            onClick={() => onPage?.(payload.page + 1)}
          >
            {copy.next}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function DestanaPublicList() {
  const t = useTranslations("destanaPublic");
  const [page, setPage] = useState(1);
  const { data, isPending, isError } = useQuery({
    queryKey: ["sik-destana", page],
    queryFn: async () => {
      const path =
        page > 1 ? `/api/sik/public?kind=destana&page=${page}` : "/api/sik/public?kind=destana";
      const res = await fetchPublicApi(path);
      if (!res.ok) throw new Error("destana");
      return (await res.json()) as DestanaPublicPayload;
    },
  });

  return (
    <DestanaPublicView
      pending={isPending}
      error={isError}
      payload={data ?? null}
      onPage={setPage}
      copy={{
        unavailable: t("unavailable"),
        loadError: t("loadError"),
        partial: t("partial"),
        prev: t("prev"),
        next: t("next"),
        colDesa: t("colDesa"),
        colKabupaten: t("colKabupaten"),
        colStatus: t("colStatus"),
        colIndeks: t("colIndeks"),
      }}
    />
  );
}
