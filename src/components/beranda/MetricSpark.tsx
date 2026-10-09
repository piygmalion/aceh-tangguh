"use client";

import type { MetricPoint } from "@/lib/dibi-beranda";

/** One metric, scaled to its own peak. The mark follows the band foreground, never a second red. */
export function MetricSpark({
  points,
  peakYear,
  runningYear,
}: {
  points: MetricPoint[];
  peakYear: number | null;
  runningYear: number | null;
}) {
  const w = 148;
  const h = 56;
  const baseline = 46;
  const top = 18;
  const max = points.reduce((m, point) => Math.max(m, point.value), 0);
  const xAt = (index: number) =>
    points.length <= 1 ? w / 2 : 4 + (index / (points.length - 1)) * (w - 12);
  const yAt = (value: number) =>
    baseline - (max > 0 ? (value / max) * (baseline - top) : 0);
  const berjalanIndex =
    runningYear == null ? -1 : points.findIndex((point) => point.tahun === runningYear);
  const solidEnd = berjalanIndex > 0 ? berjalanIndex - 1 : points.length - 1;
  const path = (from: number, to: number) =>
    points
      .slice(from, to + 1)
      .map((point, offset) => {
        const index = from + offset;
        return `${offset === 0 ? "M" : "L"}${xAt(index).toFixed(1)},${yAt(point.value).toFixed(1)}`;
      })
      .join(" ");
  const solid = solidEnd >= 0 && points.length > 0 ? path(0, solidEnd) : "";
  const dashed =
    berjalanIndex > 0
      ? `M${xAt(berjalanIndex - 1).toFixed(1)},${yAt(points[berjalanIndex - 1].value).toFixed(1)} L${xAt(berjalanIndex).toFixed(1)},${yAt(points[berjalanIndex].value).toFixed(1)}`
      : "";
  const peakIndex = peakYear == null ? -1 : points.findIndex((point) => point.tahun === peakYear);
  const peakX = peakIndex >= 0 ? xAt(peakIndex) : 0;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-1 h-8 w-full text-[var(--band-fg)] sm:mt-2 sm:h-12" aria-hidden>
      {solid ? <path d={solid} fill="none" stroke="currentColor" strokeWidth="1.5" /> : null}
      {dashed ? (
        <path
          d={dashed}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="2 2"
          opacity="0.55"
        />
      ) : null}
      {berjalanIndex >= 0 ? (
        <circle
          cx={xAt(berjalanIndex)}
          cy={yAt(points[berjalanIndex].value)}
          r="2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
      ) : null}
      {peakIndex >= 0 ? (
        <circle cx={peakX} cy={yAt(points[peakIndex].value)} r="2.6" fill="currentColor" />
      ) : null}
    </svg>
  );
}
