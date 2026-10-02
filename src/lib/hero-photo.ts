import { SITE_MEDIA } from "@/lib/media";

/**
 * Homepage hero background.
 * Derivative: public/media/hero-beranda/dji-03-1440.webp (1440px wide).
 * Source file: public/media/hero-slides/03.jpg.
 * Provenance: public/media/CREDITS.md — "Foto aerial DJI — dokumentasi Aceh Tangguh".
 * The file has no lokasi, tahun, or sumber metadata, so the hero shows no caption.
 */
export const HERO_PHOTO = {
  src: "/media/hero-beranda/dji-03-1440.webp",
  alt: SITE_MEDIA.heroSlides[2].alt,
  width: 1440,
  height: 1079,
  blurDataURL:
    "data:image/jpeg;base64,/9j/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAMABADASIAAhEBAxEB/8QAFwAAAwEAAAAAAAAAAAAAAAAAAAECBf/EABwQAAICAgMAAAAAAAAAAAAAAAABAkEDERMhMf/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAVEQEBAAAAAAAAAAAAAAAAAAAAEf/aAAwDAQACEQMRAD8AxXnmqSDnku2TSvY1px8QpH//2Q==",
} as const;

/**
 * Ink #111 over the aerial. About 80% behind the headline column, then
 * 50% by the middle and 46% on the right so the river and roofs stay visible.
 * The year chart sits on its own panel and does not use this scrim for contrast.
 */
export const HERO_SCRIM_LEFT = 0.8;
export const HERO_SCRIM_MID = 0.5;
export const HERO_SCRIM_RIGHT = 0.46;
export const HERO_SCRIM_MID_AT = 0.55;
/** Chart panel. Translucent ink plus blur; the 2020 bar carries a 1px white outline. */
export const HERO_PANEL_ALPHA = 0.66;

export function heroScrimAlpha(xRatio: number): number {
  const t = Math.min(1, Math.max(0, xRatio));
  if (t <= HERO_SCRIM_MID_AT) {
    return HERO_SCRIM_LEFT + (HERO_SCRIM_MID - HERO_SCRIM_LEFT) * (t / HERO_SCRIM_MID_AT);
  }
  const u = (t - HERO_SCRIM_MID_AT) / (1 - HERO_SCRIM_MID_AT);
  return HERO_SCRIM_MID + (HERO_SCRIM_RIGHT - HERO_SCRIM_MID) * u;
}

export type HeroPhotoMeta = {
  lokasi?: string | null;
  tahun?: string | number | null;
  sumber?: string | null;
};

export function heroPhotoCaption(meta: HeroPhotoMeta | null | undefined): string | null {
  if (!meta) return null;
  const lokasi = meta.lokasi?.trim() ?? "";
  const sumber = meta.sumber?.trim() ?? "";
  const tahun = meta.tahun == null ? "" : String(meta.tahun).trim();
  if (!lokasi || !tahun || !sumber) return null;
  return `Foto: ${lokasi}, ${tahun} · ${sumber}`;
}

export function heroBackgroundMode(
  photo: { src?: string | null } | null | undefined,
  failed: boolean,
): "photo" | "plain" {
  if (failed) return "plain";
  if (!photo?.src) return "plain";
  return "photo";
}
