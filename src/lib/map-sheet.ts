export const SHEET_SNAPS = ["default", "full"] as const;
export type SheetSnap = (typeof SHEET_SNAPS)[number];

export type SheetFrame = {
  /** Outer sheet heights. The sheet docks to the bottom edge. */
  default: number;
  full: number;
  safeAreaBottom: number;
};

export const SHEET_HEADER_PX = 64;
export const SHEET_CLOSE_PX = 44;
/** Site header is `pt-24` / 6rem. The sheet must stay below it. */
export const SITE_HEADER_PX = 96;

/**
 * Default snap is min(55dvh, content). Full is min(85dvh, space under the header).
 * Heights are the outer box. Safe area is padding inside that box.
 */
export function sheetFrame(
  viewportHeight: number,
  safeAreaBottom: number,
  contentHeight: number,
): SheetFrame {
  const safe = Math.max(0, safeAreaBottom);
  const fullCap = Math.round(viewportHeight * 0.85);
  const underHeader = Math.max(SHEET_HEADER_PX, viewportHeight - SITE_HEADER_PX);
  const full = Math.min(fullCap, underHeader);
  const preferred = Math.round(viewportHeight * 0.55);
  const content = Math.max(SHEET_HEADER_PX, Math.round(contentHeight));
  const def = Math.min(preferred, content, full);
  return { default: def, full, safeAreaBottom: safe };
}

/** Release below the default snap closes. Otherwise the nearer of default and full. */
export function nearestSheetSnap(
  height: number,
  frame: Pick<SheetFrame, "default" | "full">,
  closeGap = 24,
): SheetSnap | "closed" {
  if (height < frame.default - closeGap) return "closed";
  const toDefault = Math.abs(height - frame.default);
  const toFull = Math.abs(height - frame.full);
  return toFull < toDefault ? "full" : "default";
}

/** Bottom padding equals the sheet only while it rests at the default snap. */
export function sheetCameraPadding(
  snap: SheetSnap | "closed",
  sheetHeight: number,
): { top: number; right: number; bottom: number; left: number } {
  if (snap !== "default" || sheetHeight <= 0) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }
  return { top: 0, right: 0, bottom: sheetHeight, left: 0 };
}

/**
 * `bottom` offset for the map attribution, relative to the map box,
 * so the strip's bottom edge sits `gap` px above the sheet.
 */
export function attributionLift(opts: {
  mapBottom: number;
  sheetTop: number;
  gap?: number;
}): number {
  const gap = opts.gap ?? 8;
  return Math.max(0, Math.round(opts.mapBottom - opts.sheetTop + gap));
}

/** A phone tap on empty map closes the sheet. A marker tap does not. */
export function shouldCloseSheetOnMapClick(opts: {
  narrow: boolean;
  sheetOpen: boolean;
  hitFeature: boolean;
}): boolean {
  return opts.narrow && opts.sheetOpen && !opts.hitFeature;
}
