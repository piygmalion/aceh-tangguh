"use client";

import { useId } from "react";
import { BERJALAN_YEAR, type MetricPoint } from "@/lib/dibi-beranda";

/** One metric, scaled to its own peak. The mark is ink, never red. */
export function MetricSpark({
  points,
  peakYear,
  peakLabel,
}: {
  points: MetricPoint[];
  peakYear: number | null;
  peakLabel: string;
}) {
  const hatchId = `spark-${useId().replace(/:/g, "")}`;
  const w = 148;
  const h = 56;
  const baseline = 46;
  const top = 18;
  const max = points.reduce((m, point) => Math.max(m, point.value), 0);
  const xAt = (index: number) =>
    points.length <= 1 ? w / 2 : 4 + (index / (points.length - 1)) * (w - 12);
  const yAt = (value: number) =>
    baseline - (max > 0 ? (value / max) * (baseline - top) : 0);
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${xAt(index).toFixed(1)},${yAt(point.value).toFixed(1)}`)
    .join(" ");
  const peakIndex = peakYear == null ? -1 : points.findIndex((point) => point.tahun === peakYear);
  const berjalanIndex = points.findIndex((point) => point.tahun === BERJALAN_YEAR);
  const peakX = peakIndex >= 0 ? xAt(peakIndex) : 0;
  const labelAnchor = peakX > w * 0.72 ? "end" : "middle";

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-12 w-full text-[var(--band-fg)]" aria-hidden>
      <defs>
        <pattern
          id={hatchId}
          width="4"
          height="4"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line x1="0" y1="0" x2="0" y2="4" stroke="currentColor" strokeWidth="1.2" />
        </pattern>
      </defs>
      {path ? <path d={path} fill="none" stroke="currentColor" strokeWidth="1.5" /> : null}
      {berjalanIndex >= 0 ? (
        <rect
          x={xAt(berjalanIndex) - 3}
          y={yAt(points[berjalanIndex].value)}
          width="6"
          height={Math.max(2, baseline - yAt(points[berjalanIndex].value))}
          fill={`url(#${hatchId})`}
        />
      ) : null}
      {peakIndex >= 0 ? (
        <>
          <circle cx={peakX} cy={yAt(points[peakIndex].value)} r="2.6" fill="currentColor" />
          <text
            x={peakX}
            y={Math.max(12, yAt(points[peakIndex].value) - 5)}
            textAnchor={labelAnchor}
            fontSize="13"
            fontWeight="600"
            fill="currentColor"
          >
            {peakLabel}
          </text>
        </>
      ) : null}
    </svg>
  );
}
