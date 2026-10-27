#!/usr/bin/env python3
"""Report-only PIP check: does each marker's stored kabupaten match the
kabupaten polygon its point falls in?

Never rewrites fixtures. Exits 0 unless --strict is passed.

  python3 scripts/check-marker-kab-pip.py [--csv out.csv] [--tolerance-m 20] [--strict]

Point-in-polygon uses point_in_geom from scripts/snap-offshore-disaster-markers.py
(same as scripts/report-kab-topology-pip.py). A point within --tolerance-m of the
stored kabupaten's boundary counts as a match, so points on the line do not fail.
Kab names are normalised: lower-case, "Kabupaten"/"Kab."/"Kota" prefix stripped;
`kabupaten_normalisasi` is preferred over `kabupaten`.
"""
from __future__ import annotations

import argparse
import csv
import importlib.util
import json
import math
import re
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SNAP_PATH = ROOT / "scripts/snap-offshore-disaster-markers.py"
MARKERS = ROOT / "public/fixtures/markers.geojson"
BOUNDARIES = ROOT / "public/fixtures/boundaries-aceh-kab.geojson"


def load_point_in_geom():
    spec = importlib.util.spec_from_file_location("snap_offshore", SNAP_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.point_in_geom


def norm(name: str | None) -> str:
    s = (name or "").lower().strip()
    s = re.sub(r"^(kabupaten|kab\.?|kota)\s+", "", s)
    return re.sub(r"\s+", " ", s).strip()


def rings(geom):
    polys = [geom["coordinates"]] if geom["type"] == "Polygon" else geom["coordinates"]
    for poly in polys:
        for ring in poly:
            yield ring


def dist_to_boundary_m(lon, lat, geom):
    """Approximate distance (m) from point to the polygon boundary (equirectangular)."""
    kx = 111_320.0 * math.cos(math.radians(lat))
    ky = 110_574.0
    best = float("inf")
    for ring in rings(geom):
        for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
            ax, ay = (x1 - lon) * kx, (y1 - lat) * ky
            bx, by = (x2 - lon) * kx, (y2 - lat) * ky
            dx, dy = bx - ax, by - ay
            L = dx * dx + dy * dy
            t = 0.0 if L == 0 else max(0.0, min(1.0, -(ax * dx + ay * dy) / L))
            px, py = ax + t * dx, ay + t * dy
            best = min(best, math.hypot(px, py))
    return best


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--markers", default=str(MARKERS))
    ap.add_argument("--boundaries", default=str(BOUNDARIES))
    ap.add_argument("--tolerance-m", type=float, default=20.0)
    ap.add_argument("--csv")
    ap.add_argument("--strict", action="store_true", help="exit 1 on any mismatch")
    a = ap.parse_args(argv)

    pig = load_point_in_geom()
    polys = []
    for f in json.loads(Path(a.boundaries).read_text(encoding="utf-8"))["features"]:
        p = f["properties"]
        polys.append((str(p["kode_kab"]), norm(p["name"]), f["geometry"]))
    polys.sort()
    by_name = {n: g for _k, n, g in polys}

    rows = []
    stats = Counter()
    for f in json.loads(Path(a.markers).read_text(encoding="utf-8"))["features"]:
        props = f.get("properties") or {}
        lon, lat = map(float, f["geometry"]["coordinates"][:2])
        stored = norm(props.get("kabupaten_normalisasi") or props.get("kabupaten"))
        hits = [n for _k, n, g in polys if pig(lon, lat, g)]
        stats["total"] += 1
        if stored in hits:
            stats["ok"] += 1
            continue
        d = dist_to_boundary_m(lon, lat, by_name[stored]) if stored in by_name else None
        if d is not None and d <= a.tolerance_m:
            stats["ok_edge"] += 1
            continue
        status = "outside_all" if not hits else "mismatch"
        if stored not in by_name:
            status += "_unknown_stored"
        stats[status] += 1
        rows.append({
            "id": f.get("id") or props.get("id") or "",
            "layer": props.get("layer") or "",
            "title": props.get("title") or "",
            "lon": lon,
            "lat": lat,
            "stored_kab": stored,
            "geom_kab": hits[0] if hits else "",
            "dist_to_stored_m": "" if d is None else round(d),
            "coord_quality": props.get("coord_quality") or "",
            "approx": bool(props.get("approx")),
            "status": status,
        })

    print(f"check-marker-kab-pip (report-only, tolerance {a.tolerance_m:g} m)")
    for k in sorted(stats):
        print(f"  {k}: {stats[k]}")
    if a.csv:
        with open(a.csv, "w", newline="", encoding="utf-8") as fh:
            w = csv.DictWriter(fh, fieldnames=list(rows[0].keys()) if rows else ["id"])
            w.writeheader()
            w.writerows(rows)
        print(f"  wrote {len(rows)} rows to {a.csv}")
    if a.strict and rows:
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
