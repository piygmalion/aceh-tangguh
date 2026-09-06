#!/usr/bin/env python3
"""Build public/tiles/r3p-kab.pmtiles from r3pDistribution.geojson.

Preferred path is tippecanoe (scripts/build-pmtiles.sh). This is the Windows
fallback when tippecanoe is not installed. Source-layer must stay `r3p`.

Requires: shapely, mapbox-vector-tile, pmtiles
"""
from __future__ import annotations

import gzip
import json
import math
import sys
from pathlib import Path

import mapbox_vector_tile
from mapbox_vector_tile.encoder import on_invalid_geometry_make_valid
from pmtiles.tile import Compression, TileType, tileid_to_zxy, zxy_to_tileid
from pmtiles.writer import Writer
from shapely.geometry import box, mapping, shape

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "public/fixtures/areas/r3pDistribution.geojson"
OUT = ROOT / "public/tiles/r3p-kab.pmtiles"
KEEP = (
    "name",
    "value",
    "bucket",
    "kode_kab",
    "kode_kabupaten",
    "kabupaten",
    "rumah_rr",
    "rumah_rs",
    "rumah_rb",
    "level",
)
MIN_ZOOM = 0
MAX_ZOOM = 9


def tile_lon(x: int, z: int) -> float:
    return x / (2**z) * 360.0 - 180.0


def tile_lat(y: int, z: int) -> float:
    n = math.pi - 2.0 * math.pi * y / (2**z)
    return math.degrees(math.atan(math.sinh(n)))


def tile_bounds(z: int, x: int, y: int) -> tuple[float, float, float, float]:
    west = tile_lon(x, z)
    east = tile_lon(x + 1, z)
    north = tile_lat(y, z)
    south = tile_lat(y + 1, z)
    return west, south, east, north


def lonlat_to_tile(lon: float, lat: float, z: int) -> tuple[int, int]:
    lat = min(max(lat, -85.05112878), 85.05112878)
    n = 2**z
    x = int((lon + 180.0) / 360.0 * n)
    lat_rad = math.radians(lat)
    y = int((1.0 - math.log(math.tan(lat_rad) + 1.0 / math.cos(lat_rad)) / math.pi) / 2.0 * n)
    return max(0, min(n - 1, x)), max(0, min(n - 1, y))


def covering_tiles(bounds: tuple[float, float, float, float], z: int) -> list[tuple[int, int, int]]:
    minx, miny, maxx, maxy = bounds
    x0, y1 = lonlat_to_tile(minx, miny, z)
    x1, y0 = lonlat_to_tile(maxx, maxy, z)
    if x0 > x1:
        x0, x1 = x1, x0
    if y0 > y1:
        y0, y1 = y1, y0
    return [(z, x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]


def keep_props(props: dict) -> dict:
    out = {}
    for key in KEEP:
        if key not in props or props[key] is None:
            continue
        value = props[key]
        if isinstance(value, bool):
            out[key] = value
        elif isinstance(value, (int, float)) and not isinstance(value, bool):
            out[key] = int(value) if float(value).is_integer() else float(value)
        else:
            out[key] = str(value)
    return out


def main() -> int:
    fc = json.loads(SRC.read_text(encoding="utf-8"))
    features = []
    all_bounds = None
    for feat in fc.get("features") or []:
        geom = shape(feat.get("geometry"))
        if geom.is_empty:
            continue
        if not geom.is_valid:
            geom = geom.buffer(0)
        if geom.is_empty:
            continue
        props = keep_props(feat.get("properties") or {})
        features.append((geom, props, geom.bounds))
        minx, miny, maxx, maxy = geom.bounds
        if all_bounds is None:
            all_bounds = [minx, miny, maxx, maxy]
        else:
            all_bounds[0] = min(all_bounds[0], minx)
            all_bounds[1] = min(all_bounds[1], miny)
            all_bounds[2] = max(all_bounds[2], maxx)
            all_bounds[3] = max(all_bounds[3], maxy)

    if not features or all_bounds is None:
        print("no kab features", file=sys.stderr)
        return 1

    tiles: dict[int, list] = {}
    for geom, props, bounds in features:
        seen = set()
        for z in range(MIN_ZOOM, MAX_ZOOM + 1):
            for zxy in covering_tiles(bounds, z):
                if zxy in seen:
                    continue
                seen.add(zxy)
                west, south, east, north = tile_bounds(*zxy)
                clipped = geom.intersection(box(west, south, east, north))
                if clipped.is_empty:
                    continue
                tile_id = zxy_to_tileid(*zxy)
                tiles.setdefault(tile_id, []).append(
                    {"geometry": mapping(clipped), "properties": props}
                )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("wb") as fh:
        writer = Writer(fh)
        for tile_id in sorted(tiles):
            raw = mapbox_vector_tile.encode(
                [{"name": "r3p", "features": tiles[tile_id]}],
                default_options={
                    "quantize_bounds": tile_bounds(*tileid_to_zxy(tile_id)),
                    "on_invalid_geometry": on_invalid_geometry_make_valid,
                },
            )
            writer.write_tile(tile_id, gzip.compress(raw))

        minx, miny, maxx, maxy = all_bounds
        writer.finalize(
            {
                "tile_type": TileType.MVT,
                "tile_compression": Compression.GZIP,
                "min_lon_e7": int(minx * 1e7),
                "min_lat_e7": int(miny * 1e7),
                "max_lon_e7": int(maxx * 1e7),
                "max_lat_e7": int(maxy * 1e7),
                "center_zoom": 7,
                "center_lon_e7": int(((minx + maxx) / 2) * 1e7),
                "center_lat_e7": int(((miny + maxy) / 2) * 1e7),
            },
            {
                "name": "Aceh R3P kab",
                "attribution": "Aceh Tangguh / dissolve kecamatanDistribution by kode_kabupaten",
                "minzoom": MIN_ZOOM,
                "maxzoom": MAX_ZOOM,
                "vector_layers": [
                    {
                        "id": "r3p",
                        "minzoom": MIN_ZOOM,
                        "maxzoom": MAX_ZOOM,
                        "fields": {
                            "name": "String",
                            "value": "Number",
                            "bucket": "String",
                            "kode_kab": "String",
                            "kode_kabupaten": "String",
                            "kabupaten": "String",
                            "rumah_rr": "Number",
                            "rumah_rs": "Number",
                            "rumah_rb": "Number",
                            "level": "String",
                        },
                    }
                ],
            },
        )

    print(f"wrote {OUT.relative_to(ROOT)} tiles={len(tiles)} features={len(features)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
