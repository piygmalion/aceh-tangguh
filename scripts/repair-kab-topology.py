#!/usr/bin/env python3
"""Repair GADM 4.1 kabupaten topology (gadm41_IDN_2, catalog id gadm-kab).

The source polygons stay the input features. This does not dissolve villages.

Overlap rule
    The smaller ``kode_kab`` keeps the intersection. The larger ``kode_kab``
    is replaced by ``difference``. Features are visited in ascending
    ``kode_kab``, so the smallest code also wins a triple overlap.

Gap rule
    Each interior hole of the union is given entirely to the neighbour with
    the longest shared boundary. Ties go to the smaller ``kode_kab``. Coastal
    concavities that are not interior holes are left alone, so the union
    coastline does not grow.

Shared-boundary clean
    Vertices within 1e-8 degrees (Euclidean) are welded to the
    lexicographically smallest original coordinate in the cluster. No vertices
    are inserted. Vertices within 1e-12 degrees of the segment between their
    neighbours are dropped. Written coordinates use at most 7 decimal places.

Coastline
    The reference coastline is the exterior of ``unary_union`` after
    ``make_valid`` and before overlap or gap edits. ``make_valid`` itself does
    not move boundaries (Hausdorff against the raw rings is ~1e-15). The
    repaired union exterior must stay within 1e-6 degrees of that reference.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from collections import defaultdict
from decimal import Decimal, ROUND_HALF_EVEN
from pathlib import Path

from pyproj import Geod
from shapely import set_precision
from shapely.geometry import MultiPolygon, Polygon, mapping, shape
from shapely.ops import unary_union
from shapely.validation import make_valid

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SRC = ROOT / "public/fixtures/boundaries-aceh-kab.geojson"
R3P_PATH = ROOT / "public/fixtures/areas/r3pDistribution.geojson"
IRBI_PATH = ROOT / "public/fixtures/areas/irbi2025.geojson"

# Weld radius. Half of 1e-7, and two orders under the 1e-6 coastline budget.
SNAP_DEG = 1e-8
# Drop a vertex only when it already lies on the neighbouring segment.
COLLINEAR_TOL = 1e-12
# Ignore numerical dust. 1e-12 deg2 is ~1e-8 km2 at Aceh's latitude.
MIN_AREA_DEG2 = 1e-12
GEOD = Geod(ellps="WGS84")
KM2_PER_DEG2_AT = lambda lat: 110.574 * 111.320 * math.cos(math.radians(lat))


def polygonal(geom):
    if geom is None or geom.is_empty:
        return Polygon()
    geom = make_valid(geom)
    if geom.geom_type == "GeometryCollection":
        parts = [
            part
            for part in geom.geoms
            if part.geom_type in ("Polygon", "MultiPolygon") and not part.is_empty
        ]
        geom = unary_union(parts) if parts else Polygon()
        geom = make_valid(geom)
    if geom.geom_type == "Polygon":
        polys = [geom]
    elif geom.geom_type == "MultiPolygon":
        polys = list(geom.geoms)
    else:
        return Polygon()
    kept = [poly for poly in polys if poly.area >= MIN_AREA_DEG2]
    if not kept:
        return Polygon()
    if len(kept) == 1:
        return kept[0]
    return MultiPolygon(kept)


def as_multipolygon(geom):
    geom = polygonal(geom)
    if geom.is_empty:
        return MultiPolygon([])
    if geom.geom_type == "Polygon":
        return MultiPolygon([geom])
    return geom


def holes_of(geom):
    if geom.is_empty:
        return []
    polys = [geom] if geom.geom_type == "Polygon" else list(geom.geoms)
    found = []
    for poly in polys:
        for ring in poly.interiors:
            hole = polygonal(Polygon(ring))
            if not hole.is_empty and hole.area >= MIN_AREA_DEG2:
                found.append(hole)
    return found


def exterior_lines(geom):
    if geom.is_empty:
        return Polygon().boundary
    polys = [geom] if geom.geom_type == "Polygon" else list(geom.geoms)
    lines = [poly.exterior for poly in polys if not poly.is_empty]
    return unary_union(lines) if lines else Polygon().boundary


def assign_overlaps(geoms, kodes):
    """Smaller kode_kab keeps the overlap."""
    order = sorted(range(len(geoms)), key=lambda index: kodes[index])
    for pos, keeper in enumerate(order):
        for loser in order[pos + 1 :]:
            if geoms[keeper].is_empty or geoms[loser].is_empty:
                continue
            if not geoms[keeper].intersects(geoms[loser]):
                continue
            overlap = geoms[keeper].intersection(geoms[loser])
            if overlap.is_empty or overlap.area < MIN_AREA_DEG2:
                continue
            geoms[loser] = polygonal(geoms[loser].difference(geoms[keeper]))
    return geoms


def fill_gaps(geoms, kodes):
    """Give each interior hole to the longest shared boundary."""
    for _ in range(8):
        union = unary_union([geom for geom in geoms if not geom.is_empty])
        holes = holes_of(union)
        if not holes:
            break
        for hole in holes:
            best_index = None
            best_key = None
            for index, geom in enumerate(geoms):
                if geom.is_empty:
                    continue
                shared = geom.boundary.intersection(hole.boundary).length
                # Longest boundary, then smaller kode, then the nearer polygon.
                key = (-shared, kodes[index], geom.distance(hole))
                if best_key is None or key < best_key:
                    best_key = key
                    best_index = index
            geoms[best_index] = polygonal(geoms[best_index].union(hole))
    return geoms


def _ring_coords(coords, tol):
    points = [(float(x), float(y)) for x, y, *rest in coords]
    if len(points) < 4:
        return None
    deduped = [points[0]]
    for point in points[1:]:
        if math.hypot(point[0] - deduped[-1][0], point[1] - deduped[-1][1]) > tol:
            deduped.append(point)
    if math.hypot(deduped[0][0] - deduped[-1][0], deduped[0][1] - deduped[-1][1]) <= tol:
        deduped[-1] = deduped[0]
    else:
        deduped.append(deduped[0])
    open_ring = deduped[:-1]
    if len(open_ring) < 3:
        return None
    kept = []
    count = len(open_ring)
    for index, point in enumerate(open_ring):
        previous = open_ring[(index - 1) % count]
        nxt = open_ring[(index + 1) % count]
        dx = nxt[0] - previous[0]
        dy = nxt[1] - previous[1]
        length = math.hypot(dx, dy)
        if length == 0:
            continue
        cross = abs((point[0] - previous[0]) * dy - (point[1] - previous[1]) * dx)
        if cross / length <= tol:
            continue
        kept.append(point)
    if len(kept) < 3:
        return None
    return kept + [kept[0]]


def drop_collinear(geom, tol=COLLINEAR_TOL):
    geom = polygonal(geom)
    if geom.is_empty:
        return geom

    def simplify_polygon(poly):
        exterior = _ring_coords(list(poly.exterior.coords), tol)
        if exterior is None:
            return Polygon()
        holes = []
        for ring in poly.interiors:
            hole = _ring_coords(list(ring.coords), tol)
            if hole is not None:
                holes.append(hole)
        return polygonal(Polygon(exterior, holes))

    if geom.geom_type == "Polygon":
        return simplify_polygon(geom)
    parts = [simplify_polygon(poly) for poly in geom.geoms]
    parts = [part for part in parts if not part.is_empty]
    if not parts:
        return Polygon()
    return parts[0] if len(parts) == 1 else MultiPolygon(parts)


def _walk_coords(node, found):
    if (
        isinstance(node, (list, tuple))
        and len(node) >= 2
        and isinstance(node[0], (int, float))
        and isinstance(node[1], (int, float))
    ):
        found.append((float(node[0]), float(node[1])))
        return
    if isinstance(node, (list, tuple)):
        for child in node:
            _walk_coords(child, found)


def _rewrite_coords(node, representative):
    if (
        isinstance(node, (list, tuple))
        and len(node) >= 2
        and isinstance(node[0], (int, float))
        and isinstance(node[1], (int, float))
    ):
        point = (float(node[0]), float(node[1]))
        x, y = representative.get(point, point)
        return [x, y]
    if isinstance(node, list):
        return [_rewrite_coords(child, representative) for child in node]
    return node


def weld_vertices(geoms, snap=SNAP_DEG):
    """Mapshaper -clean analogue that welds existing vertices and inserts none."""
    bag = []
    payloads = []
    for geom in geoms:
        data = mapping(as_multipolygon(geom))
        payloads.append(data)
        _walk_coords(data["coordinates"], bag)
    unique = list(dict.fromkeys(bag))
    if not unique:
        return geoms

    parent = {point: point for point in unique}

    def find(point):
        while parent[point] != point:
            parent[point] = parent[parent[point]]
            point = parent[point]
        return point

    def unite(left, right):
        left_root = find(left)
        right_root = find(right)
        if left_root == right_root:
            return
        if left_root < right_root:
            parent[right_root] = left_root
        else:
            parent[left_root] = right_root

    cells = defaultdict(list)
    for point in unique:
        cells[(math.floor(point[0] / snap), math.floor(point[1] / snap))].append(point)
    for point in unique:
        cx = math.floor(point[0] / snap)
        cy = math.floor(point[1] / snap)
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for other in cells[(cx + dx, cy + dy)]:
                    if other <= point:
                        continue
                    if (point[0] - other[0]) ** 2 + (point[1] - other[1]) ** 2 <= snap * snap:
                        unite(point, other)

    clusters = defaultdict(list)
    for point in unique:
        clusters[find(point)].append(point)
    representative = {}
    welded = 0
    for members in clusters.values():
        chosen = min(members)
        for member in members:
            representative[member] = chosen
            if member != chosen:
                welded += 1

    cleaned = []
    for data in payloads:
        rewritten = {
            "type": "MultiPolygon",
            "coordinates": _rewrite_coords(data["coordinates"], representative),
        }
        cleaned.append(drop_collinear(polygonal(shape(rewritten))))
    return cleaned, welded


def round7(value):
    quantized = Decimal(str(value)).quantize(Decimal("0.0000001"), rounding=ROUND_HALF_EVEN)
    return float(quantized)


def quantize(geoms):
    """Snap vertices onto the 1e-7 degree grid without the spikes naive rounding makes."""
    return [polygonal(set_precision(geom, 1e-7, mode="valid_output")) for geom in geoms]


def outer_exterior(geom):
    """Exterior of the outer shells only.

    A union ring can carry a zero-area spur, and a micro-sliver can show up as
    its own shell inside the province. Neither is the coastline. Keep shells
    whose representative point is not covered by a larger shell.
    """
    if geom.is_empty:
        return Polygon().boundary
    polys = [geom] if geom.geom_type == "Polygon" else [part for part in geom.geoms if not part.is_empty]
    shells = []
    for poly in polys:
        shell = Polygon(poly.exterior)
        if shell.is_empty:
            continue
        if not shell.is_valid:
            shell = polygonal(shell)
            if shell.is_empty:
                continue
            if shell.geom_type == "MultiPolygon":
                shell = max(shell.geoms, key=lambda part: part.area)
        shells.append(shell)
    kept = []
    for index, shell in enumerate(shells):
        point = shell.representative_point()
        covered = False
        for other_index, other in enumerate(shells):
            if index == other_index:
                continue
            if other.area > shell.area and other.buffer(1e-12).covers(point):
                covered = True
                break
        if not covered:
            kept.append(shell)
    if not kept:
        return Polygon().boundary
    return exterior_lines(unary_union(kept))


def repair(features):
    kodes = [str(feature["properties"]["kode_kab"]) for feature in features]
    raw = [shape(feature["geometry"]) for feature in features]
    geoms = [polygonal(geom) for geom in raw]
    valid_shift = []
    for original, cleaned in zip(raw, geoms):
        if original.is_empty or cleaned.is_empty:
            valid_shift.append(0.0)
            continue
        valid_shift.append(original.boundary.hausdorff_distance(cleaned.boundary))

    baseline = unary_union([geom for geom in geoms if not geom.is_empty])
    baseline_exterior = outer_exterior(baseline)
    geoms = assign_overlaps(geoms, kodes)
    geoms = fill_gaps(geoms, kodes)
    geoms, welded = weld_vertices(geoms)
    geoms = assign_overlaps(geoms, kodes)
    geoms = fill_gaps(geoms, kodes)
    geoms = [drop_collinear(geom) for geom in geoms]
    # Grid snap after the topology is already clean. Another overlap or gap
    # pass here reopens the outer ring, so it stops at the grid.
    geoms = quantize(geoms)

    repaired_union = unary_union([geom for geom in geoms if not geom.is_empty])
    repaired_exterior = outer_exterior(repaired_union)
    return {
        "geoms": geoms,
        "kodes": kodes,
        "baseline": baseline,
        "repaired_union": repaired_union,
        "hausdorff_deg": baseline_exterior.hausdorff_distance(repaired_exterior),
        "make_valid_boundary_hausdorff_max": max(valid_shift) if valid_shift else 0.0,
        "vertices_welded": welded,
    }


def geodesic_km2(geom):
    if geom is None or geom.is_empty:
        return 0.0

    def ring_m2(coords):
        lon = [point[0] for point in coords]
        lat = [point[1] for point in coords]
        area, _perimeter = GEOD.polygon_area_perimeter(lon, lat)
        return abs(area)

    total = 0.0
    polys = [geom] if geom.geom_type == "Polygon" else [
        part for part in getattr(geom, "geoms", []) if part.geom_type in ("Polygon", "MultiPolygon")
    ]
    # GeometryCollection from an intersection can mix lines and polygons.
    if geom.geom_type == "GeometryCollection":
        polys = [part for part in geom.geoms if part.geom_type in ("Polygon", "MultiPolygon")]
    flat = []
    for poly in polys:
        if poly.geom_type == "MultiPolygon":
            flat.extend(poly.geoms)
        elif poly.geom_type == "Polygon":
            flat.append(poly)
    for poly in flat:
        total += ring_m2(poly.exterior.coords)
        for hole in poly.interiors:
            total -= ring_m2(hole.coords)
    return total / 1_000_000


def degree_km2(geom, lat):
    if geom is None or geom.is_empty:
        return 0.0
    return abs(geom.area) * KM2_PER_DEG2_AT(lat)


def topology_report(geoms, names):
    overlaps = []
    safe = [geom if geom.is_valid else polygonal(geom) for geom in geoms]
    for left in range(len(safe)):
        for right in range(left + 1, len(safe)):
            if safe[left].is_empty or safe[right].is_empty:
                continue
            if not safe[left].intersects(safe[right]):
                continue
            overlap = safe[left].intersection(safe[right])
            if overlap.is_empty or overlap.area < 1e-16:
                continue
            centroid = overlap.centroid
            overlaps.append(
                {
                    "a": names[left],
                    "b": names[right],
                    "km2": round(geodesic_km2(overlap), 6),
                    "km2_deg": round(degree_km2(overlap, centroid.y), 6),
                    "lon": round(centroid.x, 5),
                    "lat": round(centroid.y, 5),
                }
            )
    overlaps.sort(key=lambda item: -item["km2"])
    union = unary_union([geom for geom in safe if not geom.is_empty])
    holes = []
    for hole in holes_of(union):
        centroid = hole.centroid
        holes.append(
            {
                "km2": round(geodesic_km2(hole), 6),
                "km2_deg": round(degree_km2(hole, centroid.y), 6),
                "lon": round(centroid.x, 5),
                "lat": round(centroid.y, 5),
            }
        )
    holes.sort(key=lambda item: -item["km2"])
    invalid = [
        names[index]
        for index, geom in enumerate(geoms)
        if geom.is_empty or not geom.is_valid
    ]
    return {
        "invalid": invalid,
        "overlap_count": len(overlaps),
        "overlap_km2": round(sum(item["km2"] for item in overlaps), 4),
        "overlap_km2_deg": round(sum(item["km2_deg"] for item in overlaps), 4),
        "overlaps_ge_0_01": [item for item in overlaps if item["km2_deg"] >= 0.01],
        "largest_overlaps": overlaps[:8],
        "hole_count": len(holes),
        "hole_km2": round(sum(item["km2"] for item in holes), 4),
        "hole_km2_deg": round(sum(item["km2_deg"] for item in holes), 4),
        "max_hole_km2": holes[0]["km2"] if holes else 0,
        "holes_ge_0_01": len([item for item in holes if item["km2_deg"] >= 0.01]),
        "largest_holes": holes[:6],
    }


def vertex_count(geom):
    data = mapping(as_multipolygon(geom))
    found = []
    _walk_coords(data["coordinates"], found)
    return len(found)


def geometry_payload(geom):
    data = mapping(as_multipolygon(geom))

    def walk(node):
        if (
            isinstance(node, (list, tuple))
            and len(node) >= 2
            and isinstance(node[0], (int, float))
        ):
            return [round7(node[0]), round7(node[1])]
        return [walk(child) for child in node]

    return {"type": "MultiPolygon", "coordinates": walk(data["coordinates"])}


def dump_compact(payload):
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n"


def feature_collection(source, features, geoms):
    built = []
    for feature, geom in zip(features, geoms):
        props = feature["properties"]
        built.append(
            {
                "type": "Feature",
                "id": feature["id"],
                "properties": {
                    "name": props["name"],
                    "level": props["level"],
                    "kode_kab": props["kode_kab"],
                },
                "geometry": geometry_payload(geom),
            }
        )
    return {
        "type": "FeatureCollection",
        "name": source.get("name"),
        "crs": source.get("crs"),
        "features": built,
    }


def replace_area_geometries(path, separators, by_name):
    raw = path.read_text(encoding="utf-8")
    collection = json.loads(raw)
    missing = []
    for feature in collection["features"]:
        name = feature["properties"]["name"]
        if name not in by_name:
            missing.append(name)
            continue
        feature["geometry"] = by_name[name]
    if missing:
        raise SystemExit(f"{path} missing repaired geometry for {missing}")
    text = json.dumps(collection, ensure_ascii=False, separators=separators)
    if raw.endswith("\n"):
        text += "\n"
    path.write_text(text, encoding="utf-8")


def max_decimals(payload):
    found = 0

    def walk(node):
        nonlocal found
        if isinstance(node, float):
            text = json.dumps(node)
            if "." in text:
                found = max(found, len(text.split(".", 1)[1]))
        elif isinstance(node, list):
            for child in node:
                walk(child)
        elif isinstance(node, dict):
            for child in node.values():
                walk(child)

    walk(payload)
    return found


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--src", type=Path, default=DEFAULT_SRC)
    parser.add_argument("--out", type=Path)
    parser.add_argument("--metrics", type=Path)
    parser.add_argument(
        "--write-areas",
        action="store_true",
        help="Copy repaired geometry onto r3pDistribution and irbi2025 by name",
    )
    args = parser.parse_args()

    source = json.loads(args.src.read_text(encoding="utf-8"))
    features = source["features"]
    names = [feature["properties"]["name"] for feature in features]
    before_geoms = [shape(feature["geometry"]) for feature in features]
    before = topology_report(before_geoms, names)
    # make_valid the before-report overlaps so the named km2 figures match a
    # defined polygon area. Invalid rings still count via is_valid above.
    before_valid = topology_report([polygonal(geom) for geom in before_geoms], names)
    result = repair(features)
    after = topology_report(result["geoms"], names)
    payload = feature_collection(source, features, result["geoms"])
    text = dump_compact(payload)
    reloaded = json.loads(text)
    reloaded_geoms = [shape(feature["geometry"]) for feature in reloaded["features"]]
    reloaded_report = topology_report(reloaded_geoms, names)
    properties_same = [
        (
            feature["properties"]["name"],
            feature["properties"]["level"],
            feature["properties"]["kode_kab"],
            feature["id"],
        )
        for feature in features
    ] == [
        (
            feature["properties"]["name"],
            feature["properties"]["level"],
            feature["properties"]["kode_kab"],
            feature["id"],
        )
        for feature in reloaded["features"]
    ]
    metrics = {
        "src_bytes": args.src.stat().st_size,
        "out_bytes": len(text.encode("utf-8")),
        "size_ratio": round(len(text.encode("utf-8")) / args.src.stat().st_size, 4),
        "feature_count": len(reloaded["features"]),
        "properties_unchanged": properties_same,
        "vertices_before": sum(vertex_count(geom) for geom in before_geoms),
        "vertices_after": sum(vertex_count(geom) for geom in result["geoms"]),
        "vertices_welded": result["vertices_welded"],
        "hausdorff_deg": result["hausdorff_deg"],
        "make_valid_boundary_hausdorff_max": result["make_valid_boundary_hausdorff_max"],
        "max_decimals": max_decimals(reloaded),
        "before_raw": before,
        "before_make_valid": {
            "overlap_count": before_valid["overlap_count"],
            "overlap_km2": before_valid["overlap_km2"],
            "hole_count": before_valid["hole_count"],
            "hole_km2": before_valid["hole_km2"],
            "max_hole_km2": before_valid["max_hole_km2"],
            "holes_ge_0_01": before_valid["holes_ge_0_01"],
            "largest_overlaps": before_valid["largest_overlaps"],
        },
        "after": after,
        "after_reloaded": {
            "invalid": reloaded_report["invalid"],
            "overlap_count": reloaded_report["overlap_count"],
            "overlap_km2": reloaded_report["overlap_km2"],
            "overlap_km2_deg": reloaded_report["overlap_km2_deg"],
            "overlaps_ge_0_01": reloaded_report["overlaps_ge_0_01"],
            "hole_count": reloaded_report["hole_count"],
            "hole_km2": reloaded_report["hole_km2"],
            "max_hole_km2": reloaded_report["max_hole_km2"],
            "holes_ge_0_01": reloaded_report["holes_ge_0_01"],
        },
    }
    problems = []
    if metrics["feature_count"] != 23 or not properties_same:
        problems.append("identity")
    if metrics["hausdorff_deg"] > 1e-6:
        problems.append("coastline")
    if metrics["size_ratio"] > 1.10:
        problems.append("size")
    if reloaded_report["invalid"] or reloaded_report["overlaps_ge_0_01"] or reloaded_report["holes_ge_0_01"]:
        problems.append("topology")
    if metrics["max_decimals"] > 7:
        problems.append("precision")
    metrics["problems"] = problems

    rendered = json.dumps(metrics, indent=2)
    print(rendered)
    if args.metrics:
        args.metrics.write_text(rendered + "\n", encoding="utf-8")
    if problems:
        print("REFUSING TO WRITE", problems, file=sys.stderr)
        return 1
    if args.out:
        args.out.write_text(text, encoding="utf-8")
    if args.write_areas:
        by_name = {
            feature["properties"]["name"]: feature["geometry"] for feature in reloaded["features"]
        }
        replace_area_geometries(R3P_PATH, (",", ":"), by_name)
        replace_area_geometries(IRBI_PATH, (", ", ": "), by_name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
