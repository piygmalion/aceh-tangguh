/**
 * Signed type floor — product chrome (nav, toolbar, kickers, credits, stamps, chips).
 * Nothing smaller than 13px / 0.8125rem. Plus Jakarta Sans via --font-sans.
 * CSS class names from globals.css, plus Tailwind text-[0.8125rem] so twMerge
 * cannot collapse the floor.
 */

/** 13px floor for UI type. */
export const TYPE_FLOOR_PX = 13;
export const TYPE_FLOOR_REM = 0.8125;

/** Uppercase kicker / toolbar tracking at the type floor. */
export const TYPE_KICKER_TRACKING_EM = 0.06;

/** Hero display cap. */
export const TYPE_HERO_DISPLAY_MAX_REM = 3.5;
export const TYPE_HERO_LEADING = 1.12;

/**
 * CSS class names from globals.css, plus Tailwind text-[0.8125rem] so twMerge
 * can replace text-sm / text-xs on Chip and other utilities.
 */
export const TYPE_FLOOR_CLASS = "type-floor text-[0.8125rem]";
export const TYPE_KICKER_CLASS = "type-kicker";
export const TYPE_STAMP_CLASS = "type-stamp text-[0.8125rem]";
export const TYPE_HERO_DISPLAY_CLASS = "type-hero-display";

export const TYPE_STACK =
  'var(--font-sans), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

/** Outline primary CTA — forest, not accent orange. */
export const OUTLINE_PRIMARY_CLASS =
  "border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary-dim)] hover:text-[var(--primary)]";
