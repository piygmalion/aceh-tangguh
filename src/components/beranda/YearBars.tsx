"use client";

import { useId } from "react";
import { BERJALAN_YEAR, HERO_BAR_HIGHLIGHT_YEAR } from "@/lib/dibi-beranda";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

type Row = { tahun: number; kejadian: number };

/**
 * Nineteen DIBI year bars. Only the highlight year is red, and only on
 * --chart-surface. The open year is hatched, not striped.
 */
export function YearBars({
  rows,
  title,
  caption,
  compactTicks,
  berjalanLabel,
  formatCount,
}: {
  rows: Row[];
  title: string;
  caption: string;
  compactTicks: boolean;
  berjalanLabel: string;
  formatCount: (n: number) => string;
}) {
  const hatchId = `berjalan-${useId().replace(/:/g, "")}`;
  const max = rows.reduce((m, row) => Math.max(m, row.kejadian), 0);
  const width = 360;
  const height = 200;
  const axis = 168;
  const top = 28;
  const plotH = axis - top;
  const slot = rows.length > 0 ? (width - 8) / rows.length : 0;
  const barW = Math.max(2, slot - 3);

  return (
    <figure className="min-w-0 rounded-xl bg-[var(--chart-surface)] p-3 text-[var(--text)]">
      <figcaption className="mb-1 font-semibold">{title}</figcaption>
      <p className={cn("mb-2 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{caption}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full" aria-hidden>
        <defs>
          <pattern
            id={hatchId}
            width="5"
            height="5"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="5" stroke="currentColor" strokeWidth="1.4" />
          </pattern>
        </defs>
        {rows.map((row, index) => {
          const h = max > 0 ? (row.kejadian / max) * plotH : 0;
          const x = 4 + index * slot + (slot - barW) / 2;
          const y = axis - h;
          const highlight = row.tahun === HERO_BAR_HIGHLIGHT_YEAR;
          const berjalan = row.tahun === BERJALAN_YEAR;
          const showTick = !compactTicks || index % 2 === 0;
          const barH = Math.max(h, row.kejadian > 0 ? 1 : 0);
          return (
            <g key={row.tahun}>
              {highlight ? (
                <text
                  x={x + barW / 2}
                  y={Math.max(14, y - 6)}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="800"
                  fill="currentColor"
                >
                  {formatCount(row.kejadian)}
                </text>
              ) : null}
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx="1"
                fill={highlight ? "var(--chart-2)" : "currentColor"}
                opacity={highlight ? 1 : berjalan ? 0.35 : 0.9}
              />
              {berjalan ? (
                <rect
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  rx="1"
                  fill={`url(#${hatchId})`}
                />
              ) : null}
              {berjalan ? (
                <text
                  x={width - 2}
                  y={Math.max(14, y - 4)}
                  textAnchor="end"
                  fontSize="13"
                  fontWeight="600"
                  fill="currentColor"
                >
                  {berjalanLabel}
                </text>
              ) : null}
              {showTick ? (
                <text
                  x={x + barW / 2}
                  y={axis + 18}
                  textAnchor="middle"
                  fontSize="13"
                  fill="var(--text-dim)"
                >
                  {String(row.tahun).slice(2)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </figure>
  );
}
