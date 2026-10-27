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

/** One DOM_DELTA_LINE tick, in CSS pixels. */
export const SHEET_WHEEL_LINE_PX = 16;

/**
 * Pixel delta for a wheel tick.
 * Line mode is ~16px. Page mode is the sheet height.
 * Pixel mode (trackpad, including momentum) stays in CSS pixels.
 */
export function sheetWheelDelta(deltaY: number, deltaMode: number, pageHeight: number): number {
  if (deltaMode === 1) return deltaY * SHEET_WHEEL_LINE_PX;
  if (deltaMode === 2) return deltaY * pageHeight;
  return deltaY;
}

/** Anchors already rendered by the map attribution control. */
export function mapCreditFromAnchors(
  anchors: { href: string; text: string }[],
): { href: string; label: string }[] {
  const seen = new Set<string>();
  const links: { href: string; label: string }[] = [];
  for (const anchor of anchors) {
    const label = anchor.text.trim();
    const href = anchor.href.trim();
    if (!label || !href || seen.has(href)) continue;
    seen.add(href);
    links.push({ href, label });
  }
  return links;
}

/**
 * Credit already shown by MapLibre, in DOM order.
 * Text nodes stay (raster OSM/Carto). Anchors stay links. A lone MapLibre
 * link does not replace the OpenStreetMap text beside it.
 */
export function mapCreditParts(
  nodes: { href?: string | null; text: string }[],
): { href: string | null; label: string }[] {
  const parts: { href: string | null; label: string }[] = [];
  const seenHref = new Set<string>();
  for (const node of nodes) {
    const label = node.text
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^[|·]+|[|·]+$/g, "")
      .trim();
    if (!label) continue;
    const href = node.href?.trim() || null;
    if (href) {
      if (seenHref.has(href)) continue;
      seenHref.add(href);
    }
    parts.push({ href, label });
  }
  return parts;
}

const OSM_CREDIT_HREF = "https://www.openstreetmap.org/copyright";
const MAPLIBRE_CREDIT_HREF = "https://maplibre.org/";

/**
 * Short footer line for a full-height sheet: "© OpenStreetMap · MapLibre".
 * Hrefs come from the live attribution when it has them. The line is empty
 * when the control does not mention OpenStreetMap or MapLibre.
 */
export function sheetFooterCredit(
  parts: { href: string | null; label: string }[],
): { href: string; label: string }[] {
  const osm = parts.find(
    (part) => /openstreetmap/i.test(part.label) || /openstreetmap\.org/i.test(part.href ?? ""),
  );
  const libre = parts.find(
    (part) => /maplibre/i.test(part.label) || /maplibre\.org/i.test(part.href ?? ""),
  );
  if (!osm && !libre) return [];
  return [
    { href: osm?.href || OSM_CREDIT_HREF, label: "© OpenStreetMap" },
    { href: libre?.href || MAPLIBRE_CREDIT_HREF, label: "MapLibre" },
  ];
}

/** The element that actually overflows. MapLibre's wheel handler is not this check. */
export function canSheetScroll(el: HTMLElement): boolean {
  const overflow = getComputedStyle(el).overflowY;
  if (overflow !== "auto" && overflow !== "scroll" && overflow !== "overlay") return false;
  return el.scrollHeight > el.clientHeight + 1;
}

/**
 * Nearest overflow container from the wheel target up to the sheet.
 * Falls back to `[data-sheet-body]` when the hit target itself cannot scroll.
 */
export function sheetScrollTarget(
  root: HTMLElement,
  target: EventTarget | null,
  canScroll: (el: HTMLElement) => boolean = canSheetScroll,
): HTMLElement {
  const start = target instanceof Node && root.contains(target) ? target : root;
  let node: Node | null = start;
  while (node instanceof HTMLElement) {
    if (canScroll(node)) return node;
    if (node === root) break;
    node = node.parentElement;
  }
  const body = root.querySelector("[data-sheet-body]");
  if (body instanceof HTMLElement && canScroll(body)) return body;
  for (const node of Array.from(root.querySelectorAll("*"))) {
    if (node instanceof HTMLElement && canScroll(node)) return node;
  }
  if (body instanceof HTMLElement) return body;
  return root;
}

/** Next sheet-body scrollTop after a wheel, clamped to the scroll range. */
export function sheetWheelScrollTop(opts: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  deltaY: number;
  deltaMode?: number;
  /** Page-mode height. Defaults to the scroller's client height. */
  pageHeight?: number;
}): number {
  const max = Math.max(0, opts.scrollHeight - opts.clientHeight);
  const delta = sheetWheelDelta(
    opts.deltaY,
    opts.deltaMode ?? 0,
    opts.pageHeight ?? opts.clientHeight,
  );
  return Math.min(max, Math.max(0, opts.scrollTop + delta));
}

/**
 * Apply one wheel tick and keep the sub-pixel remainder.
 * Trackpad momentum is a run of small pixel deltas; truncating each one
 * drops the flick. The remainder is added to the next tick.
 */
export function sheetWheelStep(opts: {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  deltaY: number;
  deltaMode?: number;
  pageHeight?: number;
  remainder?: number;
}): { scrollTop: number; remainder: number } {
  const max = Math.max(0, opts.scrollHeight - opts.clientHeight);
  const delta = sheetWheelDelta(
    opts.deltaY,
    opts.deltaMode ?? 0,
    opts.pageHeight ?? opts.clientHeight,
  );
  const raw = opts.scrollTop + (opts.remainder ?? 0) + delta;
  if (raw <= 0) return { scrollTop: 0, remainder: 0 };
  if (raw >= max) return { scrollTop: max, remainder: 0 };
  const scrollTop = Math.trunc(raw);
  return { scrollTop, remainder: raw - scrollTop };
}

/** A phone tap on empty map closes the sheet. A marker tap does not. */
export function shouldCloseSheetOnMapClick(opts: {
  narrow: boolean;
  sheetOpen: boolean;
  hitFeature: boolean;
}): boolean {
  return opts.narrow && opts.sheetOpen && !opts.hitFeature;
}
