import { Chip } from "@/components/ui/Chip";

const TONE: Record<string, "warn" | "ok" | "danger" | "info" | "neutral"> = {
  queued: "warn",
  submitted: "warn",
  in_review: "info",
  needs_info: "warn",
  published: "ok",
  approved: "ok",
  rejected: "danger",
  archived: "neutral",
  draft: "neutral",
};

export function StatusBadge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  return <Chip tone={TONE[status] ?? "neutral"}>{label}</Chip>;
}
