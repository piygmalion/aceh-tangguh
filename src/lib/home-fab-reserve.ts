/**
 * Right padding so homepage band content ends `gap` px left of the fixed
 * Tanggapi button. The section already insets `sectionPadX` from the viewport.
 */
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
