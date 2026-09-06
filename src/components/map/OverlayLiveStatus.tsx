"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { OverlayHealth } from "@/hooks/useOverlayGeojson";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

export function OverlayLiveStatus({
  alert,
  pending,
  fetching,
  onRetry,
}: {
  alert: OverlayHealth | null;
  pending: boolean;
  fetching: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations("map");

  if (pending && !alert) {
    return (
      <div
        role="status"
        data-testid="overlay-live-skeleton"
        className="flex flex-col gap-2 rounded-xl border border-dashed border-[var(--border)] p-3"
      >
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-8 w-24" />
      </div>
    );
  }

  if (!alert) return null;

  const hint =
    alert === "stale" ? t("overlayLiveStaleHint") : t("overlayLiveUpstreamHint");

  return (
    <Empty
      role="status"
      data-testid="overlay-live-empty"
      className="min-h-0 items-start justify-start gap-3 border border-dashed border-[var(--border)] p-3 text-left md:p-3"
    >
      <EmptyHeader className="max-w-none items-start text-left">
        <EmptyTitle className={cn(TYPE_FLOOR_CLASS, "font-semibold tracking-normal")}>
          {t("overlayLiveStale")}
        </EmptyTitle>
        <EmptyDescription
          className={cn("text-left text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}
        >
          {hint}
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="items-start">
        <Button
          type="button"
          variant="accent"
          size="sm"
          onClick={onRetry}
          disabled={fetching}
        >
          {t("overlayLiveRetry")}
        </Button>
      </EmptyContent>
    </Empty>
  );
}
