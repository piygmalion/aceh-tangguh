import { cn } from "@/lib/utils";

const KAPPA = 0.5522847498;

/** Closed topographic ring. Procedural, not a surveyed coastline. */
export function contourRing(cx: number, cy: number, rx: number, ry: number, lean: number): string {
  const ox = rx * KAPPA;
  const oy = ry * KAPPA;
  const n = (x: number, y: number) => `${x.toFixed(1)} ${y.toFixed(1)}`;
  return [
    `M ${n(cx - rx, cy + lean)}`,
    `C ${n(cx - rx, cy - oy + lean)} ${n(cx - ox, cy - ry)} ${n(cx, cy - ry - lean)}`,
    `C ${n(cx + ox, cy - ry)} ${n(cx + rx, cy - oy - lean)} ${n(cx + rx, cy - lean)}`,
    `C ${n(cx + rx, cy + oy - lean)} ${n(cx + ox, cy + ry)} ${n(cx, cy + ry + lean)}`,
    `C ${n(cx - ox, cy + ry)} ${n(cx - rx, cy + oy + lean)} ${n(cx - rx, cy + lean)}`,
  ].join(" ");
}

/** One open shore line. A single wave, not a stripe. */
export function shoreline(y: number): string {
  const a = y.toFixed(1);
  const up = (y - 46).toFixed(1);
  const down = (y + 38).toFixed(1);
  const mid = (y - 12).toFixed(1);
  const tail = (y + 28).toFixed(1);
  const end = (y - 18).toFixed(1);
  return `M -40 ${a} C 220 ${up}, 480 ${down}, 760 ${mid} S 1100 ${tail}, 1280 ${end}`;
}

export function motifPaths(): { d: string; width: number }[] {
  const hills = [
    { cx: 260, cy: 150, lean: 6 },
    { cx: 860, cy: 220, lean: -4 },
  ];
  const paths: { d: string; width: number }[] = [];
  for (const hill of hills) {
    for (let step = 0; step < 4; step += 1) {
      paths.push({
        d: contourRing(hill.cx, hill.cy + step * 8, 90 + step * 48, 26 + step * 10, hill.lean),
        width: 1.15,
      });
    }
  }
  paths.push({ d: shoreline(520), width: 1.35 });
  return paths;
}

/**
 * One procedural contour-and-shore texture. Stroke only, currentColor,
 * aria-hidden. Mount at most once per page.
 */
export function MotifKontur({ className }: { className?: string }) {
  const paths = motifPaths();
  return (
    <div aria-hidden data-motif="kontur-pesisir" className={cn("motif-kontur absolute inset-0", className)}>
      <svg className="h-full w-full" viewBox="0 0 1200 640" preserveAspectRatio="xMidYMid slice">
        {paths.map((path) => (
          <path
            key={path.d}
            d={path.d}
            fill="none"
            stroke="currentColor"
            strokeWidth={path.width}
          />
        ))}
      </svg>
    </div>
  );
}
