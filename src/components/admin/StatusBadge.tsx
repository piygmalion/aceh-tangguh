import { Chip } from "@/components/ui/Chip";
import type { ReportStatus } from "@/lib/supabase/types";

const TONE: Record<ReportStatus, "warn" | "ok" | "danger"> = {
  queued: "warn",
  published: "ok",
  rejected: "danger",
};

export function StatusBadge({
  status,
  label,
}: {
  status: ReportStatus;
  label: string;
}) {
  return <Chip tone={TONE[status]}>{label}</Chip>;
}
