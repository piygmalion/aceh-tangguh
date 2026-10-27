/**
 * Topology checks for public/fixtures/boundaries-aceh-kab.geojson.
 * Area uses the same degree-to-km2 factor as the repair notes:
 * 110.574 * 111.320 * cos(latitude).
 */
import polygonClipping from "polygon-clipping";

export const KAB_IDENTITY = [
  ["1107", "Aceh Barat"],
  ["1112", "Aceh Barat Daya"],
  ["1108", "Aceh Besar"],
  ["1116", "Aceh Jaya"],
  ["1103", "Aceh Selatan"],
  ["1102", "Aceh Singkil"],
  ["1114", "Aceh Tamiang"],
  ["1106", "Aceh Tengah"],
  ["1104", "Aceh Tenggara"],
  ["1105", "Aceh Timur"],
  ["1111", "Aceh Utara"],
  ["1171", "Banda Aceh"],
  ["1117", "Bener Meriah"],
  ["1110", "Bireuen"],
  ["1113", "Gayo Lues"],
  ["1173", "Langsa"],
  ["1174", "Lhokseumawe"],
  ["1115", "Nagan Raya"],
  ["1109", "Pidie"],
  ["1118", "Pidie Jaya"],
  ["1172", "Sabang"],
  ["1101", "Simeulue"],
  ["1175", "Subulussalam"],
];

const MAX_OVERLAP_KM2 = 0.01;
const MAX_GAP_KM2 = 0.01;

function orient(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function pointInRing(x, y, ring) {
  let inside = false;
  let j = ring.length - 1;
  for (let i = 0; i < ring.length; i += 1) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-15) + xi) {
      inside = !inside;
    }
    j = i;
  }
  return inside;
}

function segmentsCross(a, b, c, d) {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  // Proper crossing only. Endpoint touches of a shared vertex are allowed.
  return o1 * o2 < 0 && o3 * o4 < 0;
}

function ringSelfIntersects(ring) {
  const edges = [];
  for (let i = 0; i < ring.length - 1; i += 1) {
    edges.push([ring[i], ring[i + 1]]);
  }
  for (let i = 0; i < edges.length; i += 1) {
    for (let j = i + 1; j < edges.length; j += 1) {
      if (Math.abs(i - j) <= 1) continue;
      if (i === 0 && j === edges.length - 1) continue;
      if (segmentsCross(edges[i][0], edges[i][1], edges[j][0], edges[j][1])) return true;
    }
  }
  return false;
}

function nestedShells(polygons) {
  const shells = polygons.map((poly) => poly[0]).filter((ring) => ring && ring.length >= 4);
  for (let i = 0; i < shells.length; i += 1) {
    for (let j = 0; j < shells.length; j += 1) {
      if (i === j) continue;
      const sample = shells[i][0];
      if (pointInRing(sample[0], sample[1], shells[j])) {
        const onBoundary = shells[j].some(
          (point) => point[0] === sample[0] && point[1] === sample[1],
        );
        if (!onBoundary) return true;
      }
    }
  }
  return false;
}

export function featureInvalidReason(feature) {
  const geometry = feature.geometry;
  if (!geometry || geometry.type !== "MultiPolygon") return "not a MultiPolygon";
  const polygons = geometry.coordinates;
  if (!Array.isArray(polygons) || polygons.length === 0) return "empty";
  for (const polygon of polygons) {
    if (!polygon?.length) return "empty polygon";
    for (const ring of polygon) {
      if (!ring || ring.length < 4) return "ring too short";
      const first = ring[0];
      const last = ring[ring.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) return "ring is not closed";
      if (ringSelfIntersects(ring)) return "self-intersection";
    }
    const shell = polygon[0];
    for (const hole of polygon.slice(1)) {
      if (!pointInRing(hole[0][0], hole[0][1], shell)) return "hole outside shell";
    }
  }
  if (nestedShells(polygons)) return "nested shells";
  return null;
}

function ringArea(ring) {
  let area = 0;
  for (let i = 1; i < ring.length; i += 1) {
    area += ring[i - 1][0] * ring[i][1] - ring[i][0] * ring[i - 1][1];
  }
  return area / 2;
}

function multiAreaDeg2(multi) {
  let area = 0;
  for (const polygon of multi) {
    if (!polygon?.length) continue;
    area += Math.abs(ringArea(polygon[0]));
    for (const hole of polygon.slice(1)) area -= Math.abs(ringArea(hole));
  }
  return area;
}

function meanLat(multi) {
  let sum = 0;
  let count = 0;
  for (const polygon of multi) {
    for (const ring of polygon) {
      for (const point of ring) {
        sum += point[1];
        count += 1;
      }
    }
  }
  return count ? sum / count : 4.5;
}

export function areaKm2(multi) {
  if (!multi?.length) return 0;
  const deg2 = multiAreaDeg2(multi);
  const lat = meanLat(multi);
  return Math.abs(deg2) * 110.574 * 111.32 * Math.cos((lat * Math.PI) / 180);
}

function asMulti(feature) {
  return feature.geometry.coordinates;
}

export function topologyFindings(features) {
  const invalid = [];
  for (const feature of features) {
    const reason = featureInvalidReason(feature);
    if (reason) invalid.push({ name: feature.properties?.name, reason });
  }
  const overlaps = [];
  for (let i = 0; i < features.length; i += 1) {
    for (let j = i + 1; j < features.length; j += 1) {
      let overlap;
      try {
        overlap = polygonClipping.intersection(asMulti(features[i]), asMulti(features[j]));
      } catch {
        overlaps.push({
          a: features[i].properties.name,
          b: features[j].properties.name,
          km2: Number.POSITIVE_INFINITY,
        });
        continue;
      }
      const km2 = areaKm2(overlap);
      if (km2 >= MAX_OVERLAP_KM2) {
        overlaps.push({
          a: features[i].properties.name,
          b: features[j].properties.name,
          km2,
        });
      }
    }
  }
  let union;
  try {
    union = polygonClipping.union(...features.map(asMulti));
  } catch {
    union = null;
  }
  const gaps = [];
  if (!union) {
    gaps.push({ km2: Number.POSITIVE_INFINITY });
  } else {
    for (const polygon of union) {
      for (const hole of polygon.slice(1)) {
        const km2 = areaKm2([[hole]]);
        if (km2 >= MAX_GAP_KM2) gaps.push({ km2 });
      }
    }
  }
  return { invalid, overlaps, gaps };
}

export function identityMismatches(features) {
  const expected = new Map(KAB_IDENTITY);
  if (features.length !== expected.size) {
    return [`feature count ${features.length}`];
  }
  const seen = new Set();
  const mismatches = [];
  for (const feature of features) {
    const props = feature.properties ?? {};
    const keys = Object.keys(props).sort().join(",");
    if (keys !== "kode_kab,level,name") mismatches.push(`${props.name ?? "?"} properties ${keys}`);
    if (props.level !== "kab") mismatches.push(`${props.kode_kab} level ${props.level}`);
    const kode = String(props.kode_kab ?? "");
    const name = props.name;
    if (!expected.has(kode)) mismatches.push(`unexpected kode ${kode}`);
    else if (expected.get(kode) !== name) {
      mismatches.push(`${kode} name ${name}`);
    }
    if (seen.has(kode)) mismatches.push(`duplicate ${kode}`);
    seen.add(kode);
  }
  for (const kode of expected.keys()) {
    if (!seen.has(kode)) mismatches.push(`missing ${kode}`);
  }
  return mismatches;
}
