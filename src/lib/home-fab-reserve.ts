/**
 * Right padding that would keep band content `gap` px left of the fixed
 * Tanggapi button. The number band no longer applies this inset. The button
 * yields while more than 30% of the band is inside the viewport instead.
 */
export const NUMBER_BAND_FAB_RATIO = 0.3;

/** True while the number band occupies more than 30% of its own box on screen. */
export function tanggapiYieldsToNumberBand(ratio: number): boolean {
  return ratio > NUMBER_BAND_FAB_RATIO;
}

/** Threshold steps so the observer reports the ratio on both sides of 30%. */
export function numberBandObserverThresholds(): number[] {
  const steps: number[] = [];
  for (let i = 0; i <= 20; i += 1) steps.push(i / 20);
  return steps;
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
