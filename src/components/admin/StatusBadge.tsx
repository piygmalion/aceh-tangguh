import { Chip } from "@/components/ui/Chip";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

const TONE: Record<string, "warn" | "ok" | "danger" | "info" | "neutral" | "accent" | "forest"> = {
  queued: "warn",
  submitted: "accent",
  in_review: "accent",
  needs_info: "warn",
  published: "forest",
  approved: "forest",
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
  return (
    <Chip tone={TONE[status] ?? "neutral"} className={cn(TYPE_FLOOR_CLASS)}>
      {label}
    </Chip>
  );
}
