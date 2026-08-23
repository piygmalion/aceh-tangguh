"use client";

import { useTranslations } from "next-intl";
import { Chip } from "@/components/ui/Chip";
import {
  formatStatusLabel,
  normalizeStatus,
  statusTone,
} from "@/lib/status-vocab";

export function StatusChip({
  raw,
  layer,
  className = "",
}: {
  raw?: unknown;
  layer?: string | null;
  className?: string;
}) {
  const t = useTranslations("statusVocab");
  const n = normalizeStatus(raw, layer);
  const label = formatStatusLabel(n, (slug) => t(slug));
  return (
    <Chip tone={statusTone(n)} className={className}>
      {label}
    </Chip>
  );
}
