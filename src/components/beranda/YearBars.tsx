"use client";

import { useId } from "react";
import { HERO_BAR_HIGHLIGHT_YEAR } from "@/lib/dibi-beranda";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

type Row = { tahun: number; kejadian: number };

/**
 * Nineteen DIBI year bars. Only the highlight year is red, and only on
 * --chart-surface. The open year is hatched, not striped.
 * Ticks are every second year so 13px labels never touch.
 * The open-year label sits in a lane above the plot.
 */
export function YearBars({
  rows,
  title,
  caption,
  berjalanLabel,
  formatCount,
  runningYear,
}: {
  rows: Row[];
  title: string;
  caption: string;
  berjalanLabel: string;
  formatCount: (n: number) => string;
  runningYear: number | null;
}) {
  const hatchId = `berjalan-${useId().replace(/:/g, "")}`;
  const max = rows.reduce((m, row) => Math.max(m, row.kejadian), 0);
  const width = 360;
  const height = 220;
  const labelBaseline = 16;
  const plotTop = 42;
  const axis = 184;
  const plotH = axis - plotTop;
  const slot = rows.length > 0 ? (width - 8) / rows.length : 0;
  const barW = Math.max(2, slot - 3);
  const berjalanIndex =
    runningYear == null ? -1 : rows.findIndex((row) => row.tahun === runningYear);
  const berjalanRow = berjalanIndex >= 0 ? rows[berjalanIndex] : null;
  const berjalanX =
    berjalanIndex >= 0 ? 4 + berjalanIndex * slot + (slot - barW) / 2 + barW / 2 : 0;
  const berjalanH =
    berjalanRow && max > 0 ? (berjalanRow.kejadian / max) * plotH : 0;

  return (
    <figure className="min-w-0 rounded-xl bg-[var(--chart-surface)] p-3 text-[var(--text)] max-sm:pr-16">
      <figcaption className="mb-1 font-semibold">{title}</figcaption>
      <p className={cn("mb-2 text-[var(--text-dim)]", TYPE_FLOOR_CLASS)}>{caption}</p>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" aria-hidden>
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
          const berjalan = runningYear != null && row.tahun === runningYear;
          const showTick = index % 2 === 0;
          const barH = Math.max(h, row.kejadian > 0 ? 1 : 0);
          return (
            <g key={row.tahun}>
              {highlight ? (
                <text
                  x={x + barW / 2}
                  y={y - 8}
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
                <rect x={x} y={y} width={barW} height={barH} rx="1" fill={`url(#${hatchId})`} />
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
        {berjalanRow ? (
          <g>
            <line
              x1={berjalanX}
              // Seven user units clears the font box, leaving about 4px under the word.
              y1={labelBaseline + 7}
              x2={berjalanX}
              y2={axis - berjalanH - 3}
              stroke="currentColor"
              strokeWidth="1"
            />
            <text
              data-berjalan-label=""
              x={berjalanX - 4}
              y={labelBaseline}
              textAnchor="end"
              fontSize="13"
              fontWeight="600"
              fill="currentColor"
            >
              {berjalanLabel}
            </text>
          </g>
        ) : null}
      </svg>
    </figure>
  );
}
