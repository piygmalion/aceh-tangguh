import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { GlassPanel } from "@/components/ui/GlassPanel";

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
}: {
  page: number;
  pageSize: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
}) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <Button size="sm" variant="outline" disabled={page <= 1} onClick={onPrev}>
        {prevLabel}
      </Button>
      <Button size="sm" variant="outline" disabled={page * pageSize >= total} onClick={onNext}>
        {nextLabel} {total ? `(${total})` : ""}
      </Button>
    </div>
  );
}
