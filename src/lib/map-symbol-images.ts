import type { Map as MaplibreMap } from "maplibre-gl";
import { COLOR_TOKENS } from "@/lib/layer-colors";
import { listMapSymbolIcons } from "@/lib/layer-icons";
import { MAP_PIN_DISC_PX, MAP_PIN_GLYPH_PX } from "@/lib/map-marker-chrome";

const PIXEL_RATIO = 2;
const DISC = MAP_PIN_DISC_PX * PIXEL_RATIO;
const GLYPH = MAP_PIN_GLYPH_PX * PIXEL_RATIO;

/** Paper or charcoal fill left in generated neon glyphs — knock out before compositing. */
export function isKnockoutRgb(r: number, g: number, b: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  return (max > 220 && sat < 0.08) || (max < 110 && sat < 0.12);
}

function knockoutPaperPixels(data: ImageData): ImageData {
  const next = new ImageData(new Uint8ClampedArray(data.data), data.width, data.height);
  const px = next.data;
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    if (isKnockoutRgb(px[i], px[i + 1], px[i + 2])) {
      px[i + 3] = 0;
    }
  }
  return next;
}

/** Dilate opaque neon strokes 1px, then lift luminance so thin glyphs read on charcoal. */
export function thickenGlyphPixels(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8ClampedArray {
  const src = new Uint8ClampedArray(pixels);
  const out = new Uint8ClampedArray(pixels);
  const idx = (x: number, y: number) => (y * width + x) * 4;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = idx(x, y);
      if (src[i + 3] > 140) continue;
      let bestA = 0;
      let br = 0;
      let bg = 0;
      let bb = 0;
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const j = idx(nx, ny);
          if (src[j + 3] > bestA) {
            bestA = src[j + 3];
            br = src[j];
            bg = src[j + 1];
            bb = src[j + 2];
          }
        }
      }
      if (bestA > 160) {
        out[i] = br;
        out[i + 1] = bg;
        out[i + 2] = bb;
        out[i + 3] = Math.min(255, bestA);
      }
    }
  }
  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] < 40) continue;
    out[i] = Math.min(255, Math.round(out[i] * 1.18 + 18));
    out[i + 1] = Math.min(255, Math.round(out[i + 1] * 1.12 + 10));
    out[i + 2] = Math.min(255, Math.round(out[i + 2] * 1.08 + 6));
    out[i + 3] = Math.min(255, Math.round(out[i + 3] * 1.08));
  }
  return out;
}

export function thickenGlyphContrast(data: ImageData): ImageData {
  const pixels = thickenGlyphPixels(data.data, data.width, data.height);
  return new ImageData(new Uint8ClampedArray(pixels), data.width, data.height);
}

function cloneImageData(data: ImageData): ImageData {
  return new ImageData(new Uint8ClampedArray(data.data), data.width, data.height);
}

function composeGlyphOnDisc(
  image: HTMLImageElement | ImageBitmap,
  stroke: string
): ImageData {
  const glyphCanvas = document.createElement("canvas");
  glyphCanvas.width = GLYPH;
  glyphCanvas.height = GLYPH;
  const glyphCtx = glyphCanvas.getContext("2d");
  if (!glyphCtx) {
    throw new Error("canvas 2d unavailable");
  }
  glyphCtx.clearRect(0, 0, GLYPH, GLYPH);
  glyphCtx.drawImage(image, 0, 0, GLYPH, GLYPH);
  const knocked = knockoutPaperPixels(glyphCtx.getImageData(0, 0, GLYPH, GLYPH));
  glyphCtx.putImageData(thickenGlyphContrast(knocked), 0, 0);

  const canvas = document.createElement("canvas");
  canvas.width = DISC;
  canvas.height = DISC;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("canvas 2d unavailable");
  }

  const cx = DISC / 2;
  const radius = DISC / 2 - PIXEL_RATIO;
  ctx.beginPath();
  ctx.arc(cx, cx, radius, 0, Math.PI * 2);
  ctx.fillStyle = COLOR_TOKENS.ink;
  ctx.fill();
  ctx.lineWidth = 2 * PIXEL_RATIO;
  ctx.strokeStyle = stroke;
  ctx.stroke();

  const pad = (DISC - GLYPH) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cx, radius - PIXEL_RATIO, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(glyphCanvas, pad, pad);
  ctx.restore();

  return ctx.getImageData(0, 0, DISC, DISC);
}

async function loadStyleImage(
  map: MaplibreMap,
  url: string
): Promise<HTMLImageElement | ImageBitmap | null> {
  try {
    const result = await map.loadImage(url);
    return result.data;
  } catch {
    return null;
  }
}

function upsertStyleImage(map: MaplibreMap, id: string, data: ImageData): boolean {
  if (map.hasImage(id)) {
    try {
      map.removeImage(id);
    } catch {
      // Style may have reloaded; try addImage anyway.
    }
  }
  try {
    map.addImage(id, data, { pixelRatio: PIXEL_RATIO });
    return map.hasImage(id);
  } catch {
    return false;
  }
}

/** Compose existing flat glyphs onto 28px charcoal discs. No new PNG assets. */
export async function registerMapChromeIcons(
  map: MaplibreMap,
  stroke: string = COLOR_TOKENS.paper
): Promise<boolean> {
  if (typeof document === "undefined") return false;
  const icons = listMapSymbolIcons();
  const byUrl = new Map<string, string[]>();
  for (const { id, url } of icons) {
    const ids = byUrl.get(url) ?? [];
    ids.push(id);
    byUrl.set(url, ids);
  }

  let added = 0;
  for (const [url, ids] of Array.from(byUrl.entries())) {
    const image = await loadStyleImage(map, url);
    if (!image) continue;
    try {
      const composed = composeGlyphOnDisc(image, stroke);
      for (const id of ids) {
        if (upsertStyleImage(map, id, cloneImageData(composed))) added += 1;
      }
    } catch {
      // Style may have reloaded mid-loop; next style.load retries.
    }
  }
  return added === icons.length && added > 0;
}
