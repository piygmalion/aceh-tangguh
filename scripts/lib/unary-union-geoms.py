#!/usr/bin/env python3
"""Unary-union GeometryCollection members. Properties pass through unchanged."""
from __future__ import annotations

import json
import sys
from pathlib import Path

from shapely.geometry import mapping, shape
from shapely.ops import unary_union


def _clean(geom: object):
    g = shape(geom)
    if g.is_empty:
        return None
    if not g.is_valid:
        g = g.buffer(0)
    if g.is_empty:
        return None
    return g


def _as_poly(merged):
    if merged is None or merged.is_empty:
        return None
    if merged.geom_type in ("Polygon", "MultiPolygon"):
        return merged
    if merged.geom_type == "GeometryCollection":
        parts = [g for g in merged.geoms if g.geom_type in ("Polygon", "MultiPolygon")]
        if not parts:
            return None
        return _as_poly(unary_union(parts))
    return None


def union_feature(feature: dict) -> dict | None:
    geom = feature.get("geometry")
    if not geom:
        return None
    if geom.get("type") == "GeometryCollection":
        parts = []
        for child in geom.get("geometries") or []:
            cleaned = _clean(child)
            if cleaned is not None:
                parts.append(cleaned)
        if not parts:
            return None
        merged = _as_poly(unary_union(parts))
    else:
        merged = _as_poly(_clean(geom))
    if merged is None:
        return None
    return {
        "type": "Feature",
        "properties": feature.get("properties") or {},
        "geometry": mapping(merged),
    }


def main() -> int:
    if len(sys.argv) != 3:
        print("usage: unary-union-geoms.py IN.geojson OUT.geojson", file=sys.stderr)
        return 2
    src = Path(sys.argv[1])
    dest = Path(sys.argv[2])
    fc = json.loads(src.read_text(encoding="utf-8"))
    out_features = []
    skipped = 0
    for feat in fc.get("features") or []:
        merged = union_feature(feat)
        if merged is None:
            skipped += 1
            continue
        out_features.append(merged)
    dest.write_text(
        json.dumps(
            {
                "type": "FeatureCollection",
                "metadata": fc.get("metadata"),
                "features": out_features,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        encoding="utf-8",
    )
    print(f"unioned={len(out_features)} skipped_empty={skipped}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
