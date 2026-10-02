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

/** Ink #111. Stronger on the left, still dark enough on the right for the red 2020 bar. */
export const HERO_SCRIM_LEFT = 0.94;
export const HERO_SCRIM_RIGHT = 0.92;

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
