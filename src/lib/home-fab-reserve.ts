/**
 * The number band no longer reserves a right inset for Tanggapi.
 * The button hides while the band, or any bento early-warning card,
 * intersects the bottom 96px of the viewport.
 */
export const TANGGAPI_YIELD_STRIP_PX = 96;

/**
 * `rootMargin` equivalent to `-(100vh - 96px) 0px 0px 0px`.
 * Pixel inset is used because IntersectionObserver rootMargin does not
 * reliably accept `vh`. The root that remains is the bottom 96px strip.
 */
export function tanggapiYieldRootMargin(viewportHeight: number): string {
  const inset = Math.max(0, Math.round(viewportHeight) - TANGGAPI_YIELD_STRIP_PX);
  return `-${inset}px 0px 0px 0px`;
}

/**
 * Hide only when a watched target intersects the bottom strip.
 * The fraction of the number band inside the viewport does not decide this.
 */
export function tanggapiHiddenForStrip(input: {
  bandRatioInViewport: number;
  intersectsBottomStrip: boolean;
}): boolean {
  void input.bandRatioInViewport;
  return input.intersectsBottomStrip;
}

export function phoneBandRightPad(opts: {
  viewportWidth: number;
  sectionPadX: number;
  fabRight: number;
  fabSize: number;
  gap?: number;
}): number {
  const gap = opts.gap ?? 8;
  const bandRight = opts.viewportWidth - opts.sectionPadX;
  const contentRight = opts.viewportWidth - opts.fabRight - opts.fabSize - gap;
  return Math.max(0, Math.round(bandRight - contentRight));
}
