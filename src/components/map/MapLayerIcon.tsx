type MapLayerIconProps = {
  iconSrc?: string | null;
  fallbackColor: string;
  size?: "sm" | "md";
};

export function MapLayerIcon({
  iconSrc,
  fallbackColor,
  size = "md",
}: MapLayerIconProps) {
  if (iconSrc) {
    return (
      <span
        className={
          size === "sm"
            ? "map-layer-icon-disc map-layer-icon-disc-sm"
            : "map-layer-icon-disc"
        }
        aria-hidden
      >
        <img src={iconSrc} alt="" className="map-layer-icon-glyph" />
      </span>
    );
  }

  return (
    <span
      className="map-swatch"
      style={{ background: fallbackColor }}
      aria-hidden
    />
  );
}
