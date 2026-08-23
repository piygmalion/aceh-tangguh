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
      <img
        src={iconSrc}
        alt=""
        className={
          size === "sm"
            ? "map-layer-icon map-layer-icon-sm"
            : "map-layer-icon"
        }
        aria-hidden
      />
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
