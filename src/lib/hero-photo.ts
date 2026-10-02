import { HERO_PHOTO_ENABLED } from "@/lib/media";

/**
 * Homepage hero background.
 * Derivative: public/media/hero-beranda/dji-03-1440.webp (1440px wide).
 * Source file: public/media/hero-slides/03.jpg.
 * Provenance: public/media/CREDITS.md — foto aerial DJI, dokumentasi Aceh Tangguh.
 * lokasi/waktu: konfirmasi pemilik, 2 Okt 2026; kabupaten dan bulan tidak diketahui. Jangan dilengkapi dari kenampakan foto.
 */
export const HERO_PHOTO_ALT =
  "Foto aerial DJI — permukiman di tepi sungai di Aceh dengan bangunan rusak dan genangan lumpur";

export const HERO_PHOTO_CREDIT = "Foto aerial DJI, dokumentasi Aceh Tangguh";

export const HERO_PHOTO = {
  src: "/media/hero-beranda/dji-03-1440.webp",
  alt: HERO_PHOTO_ALT,
  width: 1440,
  height: 1079,
  blurDataURL:
    "data:image/jpeg;base64,/9j/2wBDABQODxIPDRQSEBIXFRQYHjIhHhwcHj0sLiQySUBMS0dARkVQWnNiUFVtVkVGZIhlbXd7gYKBTmCNl4x9lnN+gXz/2wBDARUXFx4aHjshITt8U0ZTfHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHx8fHz/wAARCAAMABADASIAAhEBAxEB/8QAFwAAAwEAAAAAAAAAAAAAAAAAAAECBf/EABwQAAICAgMAAAAAAAAAAAAAAAABAkEDERMhMf/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAVEQEBAAAAAAAAAAAAAAAAAAAAEf/aAAwDAQACEQMRAD8AxXnmqSDnku2TSvY1px8QpH//2Q==",
  lokasi: "",
  waktu: "",
  keadaan: "",
} as const;

/**
 * Ink #111 over the aerial. About 72% behind the headline so the photo
 * still reads under the red header, then 50% by the middle and 46% on the right.
 * The year chart sits on its own panel and does not use this scrim for contrast.
 */
export const HERO_SCRIM_LEFT = 0.72;
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
  waktu?: string | null;
  keadaan?: string | null;
};

/** Caption only when lokasi and waktu were filled in by hand. Keadaan is optional. */
export function heroPhotoCaption(meta: HeroPhotoMeta | null | undefined): string | null {
  if (!meta) return null;
  const lokasi = meta.lokasi?.trim() ?? "";
  const waktu = meta.waktu?.trim() ?? "";
  const keadaan = meta.keadaan?.trim() ?? "";
  if (!lokasi || !waktu) return null;
  const lead = keadaan ? `${keadaan}, ${lokasi}, ${waktu}` : `${lokasi}, ${waktu}`;
  return `${lead} — ${HERO_PHOTO_CREDIT}`;
}

export function heroBackgroundMode(
  photo: { src?: string | null } | null | undefined,
  failed: boolean,
  enabled: boolean = HERO_PHOTO_ENABLED,
): "photo" | "plain" {
  if (!enabled || failed || !photo?.src) return "plain";
  return "photo";
}
