import type { CSSProperties } from "react";
import type { MarkerLayerKey } from "@/lib/types";
import { DISASTER_JENIS_COLORS } from "@/lib/disaster-jenis";
import { COLOR_TOKENS, LAYER_COLORS } from "@/lib/layer-colors";
import { getMarkerIconPath } from "@/lib/layer-icons";

type MapMarkerPinProps = {
  layer: MarkerLayerKey;
  jenisBencana?: string | null;
  title: string;
};

export function MapMarkerPin({ layer, jenisBencana, title }: MapMarkerPinProps) {
  const fallbackColor =
    layer === "disasterEvents"
      ? DISASTER_JENIS_COLORS[jenisBencana ?? ""] ?? LAYER_COLORS.disasterEvents
      : LAYER_COLORS[layer] ?? COLOR_TOKENS.ink;

  const iconSrc = getMarkerIconPath(layer, jenisBencana);

  if (iconSrc) {
    return (
      <button
        type="button"
        className="map-marker-pin"
        style={{ "--marker-ring": fallbackColor } as CSSProperties}
        aria-label={title}
      >
        <img src={iconSrc} alt="" className="map-marker-pin-icon" aria-hidden />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="h-3.5 w-3.5 rounded-full border-2 border-white shadow-md ring-1 ring-black/10"
      style={{ background: fallbackColor }}
      aria-label={title}
    />
  );
}
