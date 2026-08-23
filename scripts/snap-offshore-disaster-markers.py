#!/usr/bin/env python3
"""Snap disasterEvents markers that fall outside Aceh kab polygons onto land.

Uses public/fixtures/boundaries-aceh-kab.geojson. Updates:
  - public/fixtures/markers.geojson
  - public/fixtures/kejadian-bencana.json (arah_di_peta)

Usage:
  python3 scripts/snap-offshore-disaster-markers.py
"""
from __future__ import annotations

import hashlib
import json
import random
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BOUNDARIES = ROOT / "public/fixtures/boundaries-aceh-kab.geojson"
MARKERS = ROOT / "public/fixtures/markers.geojson"
KEJADIAN = ROOT / "public/fixtures/kejadian-bencana.json"

ALIASES = {
    "kota langsa": "Langsa",
    "langsa": "Langsa",
    "kota lhokseumawe": "Lhokseumawe",
    "lhokseumawe": "Lhokseumawe",
    "kota banda aceh": "Banda Aceh",
    "banda aceh": "Banda Aceh",
    "kota sabang": "Sabang",
    "sabang": "Sabang",
    "kota subulussalam": "Subulussalam",
    "subulussalam": "Subulussalam",
}


def point_in_ring(x, y, ring):
    inside = False
    n = len(ring)
    j = n - 1
    for i in range(n):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if ((yi > y) != (yj > y)) and (x < (xj - xi) * (y - yi) / (yj - yi + 1e-15) + xi):
            inside = not inside
        j = i
    return inside


def point_in_geom(x, y, geom):
    t = geom["type"]
    if t == "Polygon":
        if not point_in_ring(x, y, geom["coordinates"][0]):
            return False
        return all(not point_in_ring(x, y, hole) for hole in geom["coordinates"][1:])
    if t == "MultiPolygon":
        for poly in geom["coordinates"]:
            if point_in_ring(x, y, poly[0]) and all(
                not point_in_ring(x, y, hole) for hole in poly[1:]
            ):
                return True
        return False
    return False


def centroid(geom):
    coords = []
    if geom["type"] == "Polygon":
        coords = geom["coordinates"][0]
    else:
        for p in geom["coordinates"]:
            coords.extend(p[0])
    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    return (sum(xs) / len(xs), sum(ys) / len(ys))


def exterior_rings(geom):
    if geom["type"] == "Polygon":
        return [geom["coordinates"][0]]
    return [p[0] for p in geom["coordinates"]]


def nearest_on_ring(x, y, ring):
    best = None
    best_d = 1e18
    for i in range(len(ring) - 1):
        x1, y1 = ring[i][0], ring[i][1]
        x2, y2 = ring[i + 1][0], ring[i + 1][1]
        dx, dy = x2 - x1, y2 - y1
        if dx == 0 and dy == 0:
            px, py = x1, y1
        else:
            t = max(0.0, min(1.0, ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)))
            px, py = x1 + t * dx, y1 + t * dy
        d = (px - x) ** 2 + (py - y) ** 2
        if d < best_d:
            best_d = d
            best = (px, py)
    return best


def snap_into_land(lon, lat, geom, seed):
    if point_in_geom(lon, lat, geom):
        return lon, lat, False
    nearest = None
    best = 1e18
    for ring in exterior_rings(geom):
        p = nearest_on_ring(lon, lat, ring)
        if not p:
            continue
        d = (p[0] - lon) ** 2 + (p[1] - lat) ** 2
        if d < best:
            best = d
            nearest = p
    cx, cy = centroid(geom)
    rng = random.Random(seed)
    if nearest:
        vx, vy = cx - nearest[0], cy - nearest[1]
        norm = (vx * vx + vy * vy) ** 0.5 or 1.0
        for pull in (0.012 + rng.random() * 0.008, 0.006, 0.003, 0.0015):
            nlon = nearest[0] + vx / norm * pull
            nlat = nearest[1] + vy / norm * pull
            if point_in_geom(nlon, nlat, geom):
                return nlon, nlat, True
    for scale in (0.04, 0.02, 0.01, 0.005):
        for _ in range(40):
            nlat = cy + (rng.random() - 0.5) * scale
            nlon = cx + (rng.random() - 0.5) * scale
            if point_in_geom(nlon, nlat, geom):
                return nlon, nlat, True
    return cx, cy, True


def load_kab_polys():
    boundaries = json.loads(BOUNDARIES.read_text(encoding="utf-8"))
    kab_polys = {}
    for f in boundaries["features"]:
        p = f.get("properties") or {}
        name = p.get("name") or p.get("NAMOBJ") or p.get("kabupaten") or p.get("WADMKK")
        if not name:
            continue
        for key in (
            name,
            name.lower(),
            re.sub(r"^(kab\.?|kabupaten|kota)\s+", "", name.strip(), flags=re.I),
        ):
            kab_polys[key] = f["geometry"]
            kab_polys[key.lower()] = f["geometry"]
    return kab_polys


def resolve_kab(raw, kab_polys):
    if not raw:
        return None
    s = str(raw).strip()
    for cand in (s, re.sub(r"^(kab\.?|kabupaten|kota)\s+", "", s, flags=re.I).strip()):
        al = ALIASES.get(cand.lower())
        if al and al in kab_polys:
            return al
        if cand in kab_polys:
            return cand
        for k in kab_polys:
            if k.lower() == cand.lower():
                return k
    return None


def any_land(lon, lat, kab_polys):
    seen = set()
    for g in kab_polys.values():
        if id(g) in seen:
            continue
        seen.add(id(g))
        if point_in_geom(lon, lat, g):
            return True
    return False


def main():
    kab_polys = load_kab_polys()
    markers = json.loads(MARKERS.read_text(encoding="utf-8"))
    kejadian = json.loads(KEJADIAN.read_text(encoding="utf-8"))
    fixed = {}
    stats = Counter()
    for f in markers["features"]:
        p = f.get("properties") or {}
        if p.get("layer") != "disasterEvents":
            continue
        if p.get("coord_quality") == "offshore_or_out_of_bbox":
            stats["skip_flagged_offshore"] += 1
            continue
        lon, lat = f["geometry"]["coordinates"]
        if any_land(lon, lat, kab_polys):
            stats["ok_land"] += 1
            continue
        key = resolve_kab(p.get("kabupaten"), kab_polys)
        if not key:
            stats["skip_no_kab"] += 1
            continue
        seed = hashlib.md5(str(f.get("id") or p.get("title")).encode()).hexdigest()
        nlon, nlat, moved = snap_into_land(lon, lat, kab_polys[key], seed)
        if not moved:
            stats["ok_land"] += 1
            continue
        old = (lat, lon)
        f["geometry"]["coordinates"] = [nlon, nlat]
        p["approx"] = True
        p["coord_fixed"] = "snapped_onshore"
        p["coord_original"] = {"lat": old[0], "lng": old[1]}
        fixed[str(f.get("id"))] = (nlat, nlon, old)
        stats["snapped"] += 1
        print(
            f"snap {f.get('id')} {p.get('jenis_bencana')} {p.get('kabupaten')}: "
            f"{old[0]:.5f},{old[1]:.5f} -> {nlat:.5f},{nlon:.5f}"
        )

    MARKERS.write_text(
        json.dumps(markers, ensure_ascii=False, separators=(",", ":")), encoding="utf-8"
    )

    rows = None
    list_key = None
    if isinstance(kejadian, dict):
        for k, v in kejadian.items():
            if isinstance(v, list) and v and isinstance(v[0], dict) and "jenis_bencana" in v[0]:
                rows = v
                list_key = k
                break
    else:
        rows = kejadian
    updated = 0
    if rows:
        for r in rows:
            rid = str(r.get("id") or "")
            if rid not in fixed:
                continue
            nlat, nlon, old = fixed[rid]
            arah = r.get("arah_di_peta") if isinstance(r.get("arah_di_peta"), dict) else {}
            arah.update(
                {
                    "latitude": nlat,
                    "longitude": nlon,
                    "approx": True,
                    "coord_fixed": "snapped_onshore",
                    "coord_original": {"lat": old[0], "lng": old[1]},
                }
            )
            r["arah_di_peta"] = arah
            updated += 1
        if list_key:
            kejadian[list_key] = rows
        KEJADIAN.write_text(json.dumps(kejadian, ensure_ascii=False), encoding="utf-8")

    left = sum(
        1
        for f in markers["features"]
        if (f.get("properties") or {}).get("layer") == "disasterEvents"
        and not any_land(f["geometry"]["coordinates"][0], f["geometry"]["coordinates"][1], kab_polys)
    )
    print("stats", dict(stats), "kejadian_updated", updated, "remaining_offshore", left)


if __name__ == "__main__":
    main()
