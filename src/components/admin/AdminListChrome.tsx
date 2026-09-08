import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { listWindow } from "@/lib/list-window";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

export { listWindow };

/** Shared staff-table chrome only. Does not encode moderation or Juklak fields. */
export function AdminListChrome({
  heading,
  lead,
  actions,
  error,
  footer,
  children,
}: {
  heading: string;
  lead?: string;
  actions?: ReactNode;
  error?: string | null;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <GlassPanel className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{heading}</h1>
          {lead ? <p className="mt-1 text-sm text-[var(--text-dim)]">{lead}</p> : null}
        </div>
        {actions}
      </div>
      {error ? <p className="mt-3 text-sm text-[var(--danger)]">{error}</p> : null}
      {children}
      {footer}
    </GlassPanel>
  );
}

export function AdminTableStatusRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-2 py-8 text-center text-[var(--text-dim)]">
        {children}
      </td>
    </tr>
  );
}

export function AdminPager({
  page,
  pageSize,
  total,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
  showingLabel,
  note,
  className,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
  showingLabel: string;
  note?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mt-4 flex flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      <p className={cn(TYPE_FLOOR_CLASS, "tabular-nums text-[var(--text-dim)]")}>
        {showingLabel}
        {note}
      </p>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={onPrev}>
          {prevLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page * pageSize >= total}
          onClick={onNext}
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}
