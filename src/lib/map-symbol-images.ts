import type { Map as MaplibreMap } from "maplibre-gl";
import { COLOR_TOKENS } from "@/lib/layer-colors";
import { listMapSymbolIcons } from "@/lib/layer-icons";
import { MAP_PIN_DISC_PX, MAP_PIN_GLYPH_PX } from "@/lib/map-marker-chrome";

const PIXEL_RATIO = 2;
const DISC = MAP_PIN_DISC_PX * PIXEL_RATIO;
const GLYPH = MAP_PIN_GLYPH_PX * PIXEL_RATIO;

function composeGlyphOnDisc(
  image: HTMLImageElement | ImageBitmap,
  stroke: string
): ImageData {
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
  ctx.lineWidth = 1.5 * PIXEL_RATIO;
  ctx.strokeStyle = stroke;
  ctx.stroke();

  const pad = (DISC - GLYPH) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cx, radius - PIXEL_RATIO, 0, Math.PI * 2);
  ctx.clip();
  ctx.drawImage(image, pad, pad, GLYPH, GLYPH);
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

/** Compose existing flat glyphs onto 28px charcoal discs. No new PNG assets. */
export async function registerMapChromeIcons(
  map: MaplibreMap,
  stroke: string = COLOR_TOKENS.paper
): Promise<boolean> {
  if (typeof document === "undefined") return false;
  let added = 0;
  for (const { id, url } of listMapSymbolIcons()) {
    if (map.hasImage(id)) {
      try {
        map.removeImage(id);
      } catch {
        continue;
      }
    }
    const image = await loadStyleImage(map, url);
    if (!image) continue;
    try {
      map.addImage(id, composeGlyphOnDisc(image, stroke), { pixelRatio: PIXEL_RATIO });
      added += 1;
    } catch {
      // Style may have reloaded mid-loop; next style.load retries.
    }
  }
  return added > 0;
}
