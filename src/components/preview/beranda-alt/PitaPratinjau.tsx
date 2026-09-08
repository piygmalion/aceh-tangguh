"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Link } from "@/i18n/routing";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

/**
 * Standing reminder that this route is a design study, not the live beranda.
 * Sits bottom-left so it clears GuideBot (bottom-right) and the fixture banner (centre).
 */
export function PitaPratinjau() {
  const [tampil, setTampil] = useState(true);
  if (!tampil) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-3 bottom-[4.5rem] z-[58] flex justify-start sm:inset-x-auto sm:left-4 sm:bottom-4"
    >
      <div
        className={cn(
          "pointer-events-auto flex items-center gap-3 rounded-full border border-[var(--accent)]/45 bg-[var(--bg-raised)]/95 py-1.5 pl-3.5 pr-1.5 shadow-[var(--shadow-elevated)] backdrop-blur-md",
          TYPE_FLOOR_CLASS,
        )}
      >
        <span className="inline-flex items-center gap-2">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]"
            aria-hidden
          />
          <span className="font-semibold">Pratinjau desain</span>
        </span>
        <span className="hidden text-[var(--text-dim)] sm:inline">
          Beranda alternatif, belum dipasang ke produksi
        </span>
        <Link
          href="/"
          className="rounded-full bg-[var(--bg-muted)] px-3 py-1 font-semibold transition-colors hover:text-[var(--primary)]"
        >
          Beranda saat ini
        </Link>
        <button
          type="button"
          onClick={() => setTampil(false)}
          aria-label="Sembunyikan penanda pratinjau"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[var(--text-dim)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--text)]"
        >
          <X size={14} aria-hidden />
        </button>
      </div>
    </div>
  );
}
