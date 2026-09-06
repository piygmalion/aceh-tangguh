#!/usr/bin/env python3
"""Rebuild villageDistribution.geojson from Aceh geoportal + data-bencana-aceh profil.

Join key: digits of geoportal kdepum == profil_desa.kode_desa_kelurahan (10-digit BPS).
Do not invent codes. Do not use ArcGIS feature.id / globalid as the join.
Stamp kode only when a coded profil row exists. Official polygons without a profil
kode (blank kdepum, or geo-only Sungai Lueng) stay leftover: name/kab/kec only.

Raw cache stays under --cache-dir (default /tmp); do not commit it.
"""
from __future__ import annotations

import argparse
import json
import math
import re
import ssl
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LAYER_URL = (
    "https://geoportal.acehprov.go.id/server/rest/services/"
    "Hosted/Peta_Administrasi_Desa/FeatureServer/0/query"
)
DEFAULT_PROFIL = Path("/tmp/data-bencana-aceh/database/profil_desa/profil_desa_aceh.json")
DEFAULT_CACHE = Path("/tmp/geoportal-desa-aceh")
OUT_GEO = ROOT / "public/fixtures/areas/villageDistribution.geojson"
TEN_DIGIT = re.compile(r"^\d{10}$")
SSL_CTX = ssl._create_unverified_context()


def kdepum_digits(raw) -> str | None:
    if raw is None:
        return None
    digits = re.sub(r"\D", "", str(raw).strip())
    return digits if TEN_DIGIT.match(digits) else None


def num(v):
    if v is None or v == "":
        return None
    try:
        x = float(v) if not isinstance(v, (int, float)) else v
    except (TypeError, ValueError):
        return None
    if isinstance(x, float) and not math.isfinite(x):
        return None
    if isinstance(x, float) and x.is_integer():
        return int(x)
    return int(x) if isinstance(x, int) else x


def bucket(total, unknown=False) -> str:
    if unknown:
        return "belum_diketahui"
    t = total or 0
    if t <= 20:
        return "sangat_rendah"
    if t <= 191:
        return "rendah"
    if t <= 731:
        return "sedang"
    if t <= 2849:
        return "tinggi"
    return "sangat_tinggi"


def flatten_profil(d: dict) -> dict:
    kab = (d.get("kabupaten_kota") or {})
    lokasi = d.get("lokasi") or {}
    dampak = d.get("dampak_bencana") or {}
    demo = d.get("demografi") or {}
    kondisi = d.get("kondisi") or {}
    rr = num(dampak.get("rumah_rusak_ringan"))
    rs = num(dampak.get("rumah_rusak_sedang"))
    rb = num(dampak.get("rumah_rusak_berat"))
    total = num(dampak.get("total_rumah_rusak"))
    if total is None:
        parts = [v for v in (rr, rs, rb) if v is not None]
        total = sum(parts) if parts else None
    return {
        "id": d.get("id"),
        "kode_desa_kelurahan": d.get("kode_desa_kelurahan"),
        "nama": d.get("desa_kelurahan"),
        "kabupaten": kab.get("nama_normalisasi") or kab.get("nama"),
        "kecamatan": lokasi.get("kecamatan"),
        "kode_kabupaten": lokasi.get("kode_kabupaten_kota"),
        "kode_kecamatan": lokasi.get("kode_kecamatan"),
        "kondisi_kode": kondisi.get("kondisi_desa_kode"),
        "kk": num(demo.get("jumlah_kk")),
        "populasi": num(demo.get("jumlah_populasi")),
        "rumah_rr": rr,
        "rumah_rs": rs,
        "rumah_rb": rb,
        "total_rumah_rusak": total,
    }


def load_profil(path: Path) -> tuple[dict[str, dict], list[dict]]:
    src = json.loads(path.read_text(encoding="utf-8"))
    rows = [flatten_profil(d) for d in src.get("desa_kelurahan") or []]
    by_kode: dict[str, dict] = {}
    null_kode = []
    for row in rows:
        raw = row.get("kode_desa_kelurahan")
        if raw is None or str(raw).strip() == "":
            null_kode.append(row)
            continue
        kode = kdepum_digits(raw) or str(raw).strip()
        if kode not in by_kode:
            by_kode[kode] = row
    return by_kode, null_kode


def fetch_json(url: str, retries: int = 5) -> dict:
    last = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "aceh-tangguh-village-build/1.0"})
            with urllib.request.urlopen(req, timeout=180, context=SSL_CTX) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as err:
            last = err
            time.sleep(2 ** attempt)
    raise RuntimeError(f"fetch failed after {retries} tries: {url}") from last


def fetch_pages(cache_dir: Path, page_size: int) -> list[dict]:
    cache_dir.mkdir(parents=True, exist_ok=True)
    features: list[dict] = []
    offset = 0
    page = 0
    while True:
        cache_path = cache_dir / f"page-{page:02d}.geojson"
        if cache_path.exists():
            data = json.loads(cache_path.read_text(encoding="utf-8"))
        else:
            params = {
                "where": "1=1",
                "outFields": "fid,objectid,kdepum,kdebps,wadmkd,wadmkc,wadmkk,globalid",
                "returnGeometry": "true",
                "outSR": "4326",
                "f": "geojson",
                "resultOffset": str(offset),
                "resultRecordCount": str(page_size),
            }
            url = f"{LAYER_URL}?{urllib.parse.urlencode(params)}"
            print(f"fetch offset={offset} -> {cache_path.name}", flush=True)
            data = fetch_json(url)
            cache_path.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")
        batch = data.get("features") or []
        features.extend(batch)
        print(f"  page {page}: {len(batch)} (total {len(features)})", flush=True)
        if len(batch) < page_size:
            break
        offset += page_size
        page += 1
    return features


def perp_dist(p, a, b) -> float:
    x, y = p[0] - a[0], p[1] - a[1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    if dx == 0 and dy == 0:
        return math.hypot(x, y)
    t = max(0.0, min(1.0, (x * dx + y * dy) / (dx * dx + dy * dy)))
    return math.hypot(x - t * dx, y - t * dy)


def douglas_peucker(coords: list, tol: float) -> list:
    if len(coords) <= 4:
        return coords
    closed = coords[0] == coords[-1]
    work = coords[:-1] if closed else coords
    stack = [(0, len(work) - 1)]
    keep = [False] * len(work)
    keep[0] = keep[-1] = True
    while stack:
        i, j = stack.pop()
        max_d = -1.0
        max_k = None
        a, b = work[i], work[j]
        for k in range(i + 1, j):
            d = perp_dist(work[k], a, b)
            if d > max_d:
                max_d = d
                max_k = k
        if max_k is not None and max_d > tol:
            keep[max_k] = True
            stack.append((i, max_k))
            stack.append((max_k, j))
    out = [work[i] for i, flag in enumerate(keep) if flag]
    if closed:
        if out[0] != out[-1]:
            out.append(out[0])
        if len(out) < 4:
            return coords
    return out


def quantize_ring(ring: list, ndigits: int) -> list:
    out = []
    last = None
    for pt in ring:
        q = [round(float(pt[0]), ndigits), round(float(pt[1]), ndigits)]
        if last == q:
            continue
        out.append(q)
        last = q
    if len(out) >= 3 and out[0] != out[-1]:
        out.append(out[0][:])
    return out


def simplify_ring(ring: list, tol: float, ndigits: int) -> list | None:
    simplified = douglas_peucker(ring, tol)
    quantized = quantize_ring(simplified, ndigits)
    if len(quantized) < 4:
        return None
    return quantized


def ring_area(ring: list) -> float:
    area = 0.0
    for i in range(len(ring) - 1):
        area += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
    return abs(area) / 2.0


def simplify_polygon(coords: list, tol: float, ndigits: int, min_hole_area: float) -> list | None:
    if not coords:
        return None
    outer = simplify_ring(coords[0], tol, ndigits)
    if not outer:
        return None
    holes = []
    for hole in coords[1:]:
        simple = simplify_ring(hole, tol, ndigits)
        if simple and ring_area(simple) >= min_hole_area:
            holes.append(simple)
    return [outer, *holes]


def simplify_geometry(geom: dict, tol: float, ndigits: int) -> dict | None:
    if not geom:
        return None
    min_hole = (tol ** 2) * 4
    gtype = geom.get("type")
    coords = geom.get("coordinates")
    if gtype == "Polygon":
        poly = simplify_polygon(coords, tol, ndigits, min_hole)
        return {"type": "Polygon", "coordinates": poly} if poly else None
    if gtype == "MultiPolygon":
        polys = []
        for poly_coords in coords or []:
            poly = simplify_polygon(poly_coords, tol, ndigits, min_hole)
            if poly:
                polys.append(poly)
        if not polys:
            return None
        if len(polys) == 1:
            return {"type": "Polygon", "coordinates": polys[0]}
        return {"type": "MultiPolygon", "coordinates": polys}
    return None


def slug(parts: list[str]) -> str:
    text = "-".join(p for p in parts if p)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^a-z0-9]+", "", text.lower())
    return text or "unknown"


def leftover_id(props: dict, fid) -> str:
    if fid is not None:
        return f"desa-geo-{fid}"
    return "desa-" + slug([props.get("wadmkk") or "", props.get("wadmkd") or "desa"])


def coded_props(row: dict) -> dict:
    total = row.get("total_rumah_rusak") or 0
    return {
        "name": row["nama"],
        "kabupaten": row.get("kabupaten"),
        "kecamatan": row.get("kecamatan"),
        "level": "desa",
        "value": total,
        "bucket": bucket(total),
        "rumah_rr": 0 if row.get("rumah_rr") is None else row.get("rumah_rr"),
        "rumah_rs": 0 if row.get("rumah_rs") is None else row.get("rumah_rs"),
        "rumah_rb": 0 if row.get("rumah_rb") is None else row.get("rumah_rb"),
        "kode_desa_kelurahan": row["kode_desa_kelurahan"],
        "source": "profil_desa_aceh.json",
        "kode_kecamatan": row.get("kode_kecamatan"),
        "kode_kabupaten": row.get("kode_kabupaten"),
        "kondisi_kode": row.get("kondisi_kode"),
        "kk": row.get("kk"),
        "populasi": row.get("populasi"),
        "profil_id": row.get("id"),
    }


def leftover_props(attrs: dict) -> dict:
    return {
        "name": (attrs.get("wadmkd") or "").strip() or "Desa",
        "kabupaten": (attrs.get("wadmkk") or "").strip() or None,
        "kecamatan": (attrs.get("wadmkc") or "").strip() or None,
        "level": "desa",
        "value": 0,
        "bucket": "rendah",
        "rumah_rr": 0,
        "rumah_rs": 0,
        "rumah_rb": 0,
        "kode_desa_kelurahan": None,
        "source": "geom:geoportal-aceh",
    }


def build_features(raw_features: list[dict], profil_by_kode: dict[str, dict], tol: float) -> tuple[list[dict], dict]:
    out = []
    matched = 0
    leftover = 0
    skipped_geom = 0
    geo_only_kode = 0
    seen_kode: set[str] = set()
    for feat in raw_features:
        attrs = feat.get("properties") or {}
        kode = kdepum_digits(attrs.get("kdepum"))
        geom = simplify_geometry(feat.get("geometry") or {}, tol, ndigits=5)
        if not geom:
            skipped_geom += 1
            continue
        row = profil_by_kode.get(kode) if kode else None
        if row:
            matched += 1
            seen_kode.add(kode)
            props = coded_props(row)
            fid = f"desa-{row['kode_desa_kelurahan']}"
        else:
            leftover += 1
            if kode:
                geo_only_kode += 1
            props = leftover_props(attrs)
            fid = leftover_id(attrs, attrs.get("fid") or attrs.get("objectid") or feat.get("id"))
        out.append({"type": "Feature", "id": fid, "properties": props, "geometry": geom})
    counts = {
        "raw": len(raw_features),
        "written": len(out),
        "matched_profil": matched,
        "leftover": leftover,
        "geo_only_coded_kdepum": geo_only_kode,
        "skipped_geom": skipped_geom,
        "profil_coded": len(profil_by_kode),
        "profil_coded_unmatched": len(set(profil_by_kode) - seen_kode),
        "simplify_tol": tol,
    }
    return out, counts


def write_geojson(features: list[dict], path: Path) -> int:
    fc = {"type": "FeatureCollection", "features": features}
    raw = json.dumps(fc, ensure_ascii=False, separators=(",", ":"))
    path.write_text(raw, encoding="utf-8")
    return len(raw.encode("utf-8"))


def parse_args(argv: list[str]) -> argparse.Namespace:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--profil", type=Path, default=DEFAULT_PROFIL)
    p.add_argument("--cache-dir", type=Path, default=DEFAULT_CACHE)
    p.add_argument("--out", type=Path, default=OUT_GEO)
    p.add_argument("--page-size", type=int, default=500)
    p.add_argument("--simplify", type=float, default=0.00025)
    p.add_argument("--max-bytes", type=int, default=11_000_000)
    return p.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    if not args.profil.exists():
        print(f"missing profil JSON: {args.profil}", file=sys.stderr)
        return 1
    profil_by_kode, null_kode = load_profil(args.profil)
    print(
        json.dumps(
            {
                "profil_coded": len(profil_by_kode),
                "profil_null_kode": [
                    {"id": r.get("id"), "nama": r.get("nama"), "kabupaten": r.get("kabupaten")}
                    for r in null_kode
                ],
            },
            ensure_ascii=False,
        ),
        flush=True,
    )
    raw = fetch_pages(args.cache_dir, args.page_size)
    if len(raw) != 6508:
        print(f"warn: expected 6508 geoportal polygons, got {len(raw)}", file=sys.stderr)

    tol = args.simplify
    features, counts = build_features(raw, profil_by_kode, tol)
    size = write_geojson(features, args.out)
    while size > args.max_bytes and tol < 0.002:
        tol *= 1.4
        print(f"oversize {size} bytes; retry simplify tol={tol:.5f}", flush=True)
        features, counts = build_features(raw, profil_by_kode, tol)
        size = write_geojson(features, args.out)

    counts["out_bytes"] = size
    counts["out"] = str(args.out)
    print(json.dumps(counts, ensure_ascii=False, indent=2))
    if counts["profil_coded_unmatched"]:
        print("ERROR: coded profil rows missing official geometry", file=sys.stderr)
        return 1
    if counts["written"] < 6500:
        print("ERROR: too few output features", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
