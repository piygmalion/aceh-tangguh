export const SHEET_SNAPS = ["peek", "half", "full"] as const;
export type SheetSnap = (typeof SHEET_SNAPS)[number];

export type SheetFrame = {
  bottom: number;
  peek: number;
  half: number;
  full: number;
};

const HANDLE_HEIGHT = 4.25 * 16;
const HANDLE_GAP = 0.5 * 16;
const TOP_CHROME = 6 * 16;
const PEEK = 7.5 * 16;

/** Room above the layer handle. Peek, half, and full are sheet heights. */
export function sheetFrame(viewportHeight: number, safeAreaBottom: number): SheetFrame {
  const bottom = HANDLE_HEIGHT + Math.max(HANDLE_GAP, safeAreaBottom);
  const available = Math.max(PEEK, viewportHeight - TOP_CHROME - bottom);
  const peek = Math.min(PEEK, available);
  const half = Math.min(available, Math.max(peek, Math.round(available * 0.5)));
  return { bottom, peek, half, full: available };
}

/** Nearest snap. A drag well below peek closes the sheet. */
export function nearestSheetSnap(
  height: number,
  frame: SheetFrame,
  closeGap = 48,
): SheetSnap | "closed" {
  if (height < frame.peek - closeGap) return "closed";
  let best: SheetSnap = "half";
  let dist = Infinity;
  for (const snap of SHEET_SNAPS) {
    const next = Math.abs(frame[snap] - height);
    if (next < dist) {
      dist = next;
      best = snap;
    }
  }
  return best;
}
