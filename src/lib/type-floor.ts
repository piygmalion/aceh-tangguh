/**
 * Signed type floor — product chrome (nav, toolbar, kickers, credits, stamps, chips).
 * Nothing smaller than 12px / 0.75rem. Keep the system ui-sans stack (no webfont).
 */

/** 12px floor for UI type. */
export const TYPE_FLOOR_PX = 12;
export const TYPE_FLOOR_REM = 0.75;

/** Uppercase kicker / toolbar tracking at the 12px floor — not 0.14–0.18em on smaller type. */
export const TYPE_KICKER_TRACKING_EM = 0.08;

/** Hero display cap. lg:text-[4.4rem] / leading 1.05 comes down to this. */
export const TYPE_HERO_DISPLAY_MAX_REM = 3.5;
export const TYPE_HERO_LEADING = 1.2;

/**
 * CSS class names from globals.css, plus Tailwind text-[0.75rem] so twMerge
 * can replace text-sm / text-xs on Chip and other utilities.
 */
export const TYPE_FLOOR_CLASS = "type-floor text-[0.75rem]";
export const TYPE_KICKER_CLASS = "type-kicker";
export const TYPE_STAMP_CLASS = "type-stamp text-[0.75rem]";
export const TYPE_HERO_DISPLAY_CLASS = "type-hero-display";

export const TYPE_STACK =
  'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
