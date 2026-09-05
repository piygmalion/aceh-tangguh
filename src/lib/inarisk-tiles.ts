import type { OverlayLayerKey } from "@/lib/overlay-layers";

const INARISK_IMAGE: Partial<Record<OverlayLayerKey, string>> = {
  inariskBahayaGempa: "layer_bahaya_gempabumi",
  inariskBahayaTsunami: "layer_bahaya_tsunami",
  inariskBahayaLongsor: "layer_bahaya_tanah_longsor",
  inariskBahayaBanjir: "layer_bahaya_banjir",
  inariskBahayaKarhutla: "layer_bahaya_kebakaran_hutan_dan_lahan",
  inariskBahayaGunungApi: "layer_bahaya_letusan_gunungapi",
};

const ORIGIN = "https://gis.bnpb.go.id/server/rest/services/inarisk";

export function isInariskRasterKey(key: string): key is OverlayLayerKey {
  return key in INARISK_IMAGE;
}

export function inariskServiceName(key: OverlayLayerKey): string | null {
  return INARISK_IMAGE[key] ?? null;
}

/** Web Mercator tile → EPSG:3857 bbox (xmin,ymin,xmax,ymax). */
export function webMercatorTileBbox(
  z: number,
  x: number,
  y: number,
): [number, number, number, number] {
  const n = 2 ** z;
  const lonMin = (x / n) * 360 - 180;
  const lonMax = ((x + 1) / n) * 360 - 180;
  const latMax =
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  const latMin =
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n))) * 180) / Math.PI;
  return [
    lonToMeters(lonMin),
    latToMeters(latMin),
    lonToMeters(lonMax),
    latToMeters(latMax),
  ];
}

function lonToMeters(lon: number): number {
  return (lon * 20037508.34) / 180;
}

function latToMeters(lat: number): number {
  const y =
    Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180);
  return (y * 20037508.34) / 180;
}

export function inariskExportImageUrl(key: OverlayLayerKey, z: number, x: number, y: number): string | null {
  const service = inariskServiceName(key);
  if (!service) return null;
  const [xmin, ymin, xmax, ymax] = webMercatorTileBbox(z, x, y);
  const params = new URLSearchParams({
    bbox: `${xmin},${ymin},${xmax},${ymax}`,
    bboxSR: "3857",
    imageSR: "3857",
    size: "256,256",
    format: "png32",
    f: "image",
    transparent: "true",
  });
  return `${ORIGIN}/${service}/ImageServer/exportImage?${params.toString()}`;
}
