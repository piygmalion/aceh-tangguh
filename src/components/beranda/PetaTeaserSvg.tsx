import { PETA_TEASER_PATHS, PETA_TEASER_VIEWBOX } from "./peta-teaser-paths";

/** Static kabupaten outlines. Paths come from public/fixtures/boundaries-aceh-kab.geojson. */
export function PetaTeaserSvg() {
  const { width, height } = PETA_TEASER_VIEWBOX;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-44 w-full bg-[var(--bg-muted)]"
      role="img"
      aria-hidden
      data-peta-teaser-svg
    >
      {PETA_TEASER_PATHS.map((item) => (
        <path
          key={item.kode_kab}
          data-kode-kab={item.kode_kab}
          data-kab={item.name}
          d={item.d}
          className="peta-teaser-kab"
          fill="var(--bg-raised)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
