#!/usr/bin/env python3
"""Read-only point-in-polygon diff for the kabupaten topology repair.

Uses point_in_geom from scripts/snap-offshore-disaster-markers.py. Does not
rewrite markers or kejadian fixtures.
"""

from __future__ import annotations

import importlib.util
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SNAP_PATH = ROOT / "scripts/snap-offshore-disaster-markers.py"
MARKERS = ROOT / "public/fixtures/markers.geojson"
KEJADIAN = ROOT / "public/fixtures/kejadian-bencana.json"


def load_snap():
    spec = importlib.util.spec_from_file_location("snap_offshore", SNAP_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.point_in_geom


def load_polys(path):
    collection = json.loads(Path(path).read_text(encoding="utf-8"))
    polys = []
    for feature in collection["features"]:
        props = feature["properties"]
        polys.append((str(props["kode_kab"]), props["name"], feature["geometry"]))
    polys.sort()
    return polys


def hits_for(point_in_geom, lon, lat, polys):
    found = [(kode, name) for kode, name, geom in polys if point_in_geom(lon, lat, geom)]
    found.sort()
    return found


def resolved(found):
    if not found:
        return None
    return found[0]


def count_tables(rows, polys):
    contained = Counter()
    chosen = Counter()
    outside = 0
    for row in rows:
        if not row["before_hits"]:
            outside += 1
        for kode, name in row["before_hits"]:
            contained[(kode, name)] += 1
        pick = resolved(row["before_hits"])
        if pick:
            chosen[pick] += 1
    contained_after = Counter()
    chosen_after = Counter()
    outside_after = 0
    for row in rows:
        if not row["after_hits"]:
            outside_after += 1
        for kode, name in row["after_hits"]:
            contained_after[(kode, name)] += 1
        pick = resolved(row["after_hits"])
        if pick:
            chosen_after[pick] += 1
    keys = [(kode, name) for kode, name, _geom in polys]
    lines = [
        "| kode | name | contained before | contained after | delta | resolved before | resolved after | delta |",
        "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for key in keys:
        kode, name = key
        cb, ca = contained[key], contained_after[key]
        rb, ra = chosen[key], chosen_after[key]
        lines.append(
            f"| {kode} | {name} | {cb} | {ca} | {ca - cb} | {rb} | {ra} | {ra - rb} |"
        )
    lines.append("")
    lines.append(
        f"Outside any kabupaten: {outside} before, {outside_after} after."
    )
    return "\n".join(lines)


def changed_rows(rows):
    changed = []
    for row in rows:
        if row["before_hits"] != row["after_hits"] or resolved(row["before_hits"]) != resolved(
            row["after_hits"]
        ):
            changed.append(row)
    return changed


def format_hits(found):
    if not found:
        return "outside"
    return ", ".join(f"{kode} {name}" for kode, name in found)


def main():
    before_path = Path(sys.argv[1])
    after_path = Path(sys.argv[2])
    point_in_geom = load_snap()
    before = load_polys(before_path)
    after = load_polys(after_path)
    markers = json.loads(MARKERS.read_text(encoding="utf-8"))["features"]
    kejadian = json.loads(KEJADIAN.read_text(encoding="utf-8"))["kejadian"]

    def classify(lon, lat):
        before_hits = hits_for(point_in_geom, lon, lat, before)
        after_hits = hits_for(point_in_geom, lon, lat, after)
        return before_hits, after_hits

    events = []
    for row in kejadian:
        arah = row.get("arah_di_peta") or {}
        lat = arah.get("latitude")
        lon = arah.get("longitude")
        if lat is None or lon is None:
            continue
        before_hits, after_hits = classify(float(lon), float(lat))
        events.append(
            {
                "kind": "kejadian",
                "id": row.get("id"),
                "layer": "disasterEvents",
                "title": row.get("jenis_bencana"),
                "lon": float(lon),
                "lat": float(lat),
                "before_hits": before_hits,
                "after_hits": after_hits,
            }
        )

    marker_rows = []
    for feature in markers:
        lon, lat = feature["geometry"]["coordinates"][:2]
        props = feature.get("properties") or {}
        before_hits, after_hits = classify(float(lon), float(lat))
        marker_rows.append(
            {
                "kind": "marker",
                "id": feature.get("id") or props.get("id"),
                "layer": props.get("layer"),
                "title": props.get("title"),
                "lon": float(lon),
                "lat": float(lat),
                "before_hits": before_hits,
                "after_hits": after_hits,
            }
        )

    def section(title, rows):
        changed = changed_rows(rows)
        lines = [f"## {title}", "", count_tables(rows, before), ""]
        lines.append(f"Points whose containing kabupaten set or resolved kabupaten changes: {len(changed)}.")
        lines.append("")
        if changed:
            lines.append("| kind | id | layer | title | lon | lat | before | after | resolved before | resolved after |")
            lines.append("| --- | --- | --- | --- | ---: | ---: | --- | --- | --- | --- |")
            for row in changed:
                title_text = str(row["title"] or "").replace("|", "/")
                lines.append(
                    "| {kind} | {id} | {layer} | {title} | {lon:.5f} | {lat:.5f} | {before} | {after} | {rb} | {ra} |".format(
                        kind=row["kind"],
                        id=row["id"],
                        layer=row["layer"],
                        title=title_text,
                        lon=row["lon"],
                        lat=row["lat"],
                        before=format_hits(row["before_hits"]),
                        after=format_hits(row["after_hits"]),
                        rb=format_hits([resolved(row["before_hits"])] if resolved(row["before_hits"]) else []),
                        ra=format_hits([resolved(row["after_hits"])] if resolved(row["after_hits"]) else []),
                    )
                )
            lines.append("")
        return "\n".join(lines)

    disaster = [row for row in marker_rows if row["layer"] == "disasterEvents"]
    text = "\n".join(
        [
            section(f"Event points (kejadian, n={len(events)})", events),
            section(f"Markers (n={len(marker_rows)})", marker_rows),
            section(f"Markers with layer disasterEvents (n={len(disaster)})", disaster),
        ]
    )
    sys.stdout.write(text)


if __name__ == "__main__":
    main()
