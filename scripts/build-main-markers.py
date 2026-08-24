#!/usr/bin/env python3
"""Rebuild public/fixtures/markers.geojson Data Utama layers.

Inputs (expected under /workspace/drive-aceh-data/):
  - kejadian_bencana_aceh_lengkap.json
      → layer disasterEvents (GPS from arah_di_peta; out-of-bbox kept with
        coord_quality=offshore_or_out_of_bbox, e.g. ACEH-2023-0005)
  - fasilitas_kesehatan_aceh.json (preferred) or health.xlsx fallback
      → layer facHealth (lat/lng from lokasi; centroid approx if missing)
  - edu-sheet-1thAoB7.xlsx Minggu 2 (preferred; sheet 1thAoB7... with Latitude/Longitude)
      or sarana_pendidikan_aceh.json / edu.xlsx fallback → layer facEducation
      Real GPS when present; otherwise jittered kab centroids (approx=true).

Preserves non-main layers already present in markers.geojson
(policeOffices, facGov, facReligious, infraRoadBridge). Do not seed
laporanKejadian / laporanPenanganan / citizenReports fixture points —
those layers are live overlays from moderated laporan_* rows.

Usage:
  python3 scripts/build-main-markers.py
  python3 scripts/build-main-markers.py --write   # overwrite fixtures/markers.geojson

Without --write, prints layer counts only (dry-run merge in memory).

After rebuilding disasterEvents:
  1. Run scripts/snap-offshore-disaster-markers.py to pull onshore-but-outside-polygon
     points back onto land (skips coord_quality=offshore_or_out_of_bbox).
  2. Run `node scripts/flag-truncated-coords.js` to (re)flag integer lon/lat.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import random
import re
from collections import Counter
from pathlib import Path

try:
    import openpyxl
except ImportError as e:  # pragma: no cover
    raise SystemExit("openpyxl required: pip install openpyxl") from e

DRIVE = Path("/workspace/drive-aceh-data")
ROOT = Path(__file__).resolve().parents[1]
FIXTURES = ROOT / "public" / "fixtures"
MARKERS_PATH = FIXTURES / "markers.geojson"
BOUNDARIES_PATH = FIXTURES / "boundaries-aceh-kab.geojson"

KEJADIAN_JSON = DRIVE / "kejadian_bencana_aceh_lengkap.json"
HEALTH_JSON = DRIVE / "fasilitas_kesehatan_aceh.json"
HEALTH_XLSX = DRIVE / "health.xlsx"
EDU_SHEET_XLSX = DRIVE / "edu-sheet-1thAoB7.xlsx"
EDU_JSON = DRIVE / "sarana_pendidikan_aceh.json"
EDU_XLSX = DRIVE / "edu.xlsx"

# Preferred onshore window. Points with GPS outside this box (e.g. ACEH-2023-0005
# Singkil epicentre ~1.91°N) are kept with coord_quality=offshore_or_out_of_bbox
# — the map does not clamp an Aceh bbox, so they remain visible.
ACEH_LAT = (2.0, 6.5)
ACEH_LNG = (94.5, 99.5)

MAIN_LAYERS = {"disasterEvents", "facHealth", "facEducation"}

KAB_ALIASES = {
    "kab. aceh utara": "Aceh Utara",
    "kabupaten aceh utara": "Aceh Utara",
    "kab. aceh timur": "Aceh Timur",
    "kab. aceh tamiang": "Aceh Tamiang",
    "kab. pidie": "Pidie",
    "kab. pidie jaya": "Pidie Jaya",
    "kab. bireuen": "Bireuen",
    "kota langsa": "Langsa",
    "kab. aceh barat": "Aceh Barat",
    "kota lhokseumawe": "Lhokseumawe",
    "kab. bener meriah": "Bener Meriah",
    "kab. aceh singkil": "Aceh Singkil",
    "kab. gayo lues": "Gayo Lues",
    "kab. aceh tengah": "Aceh Tengah",
    "kab. aceh selatan": "Aceh Selatan",
    "kab. aceh tenggara": "Aceh Tenggara",
    "kab. nagan raya": "Nagan Raya",
    "kab. simeulue": "Simeulue",
    "kota subulussalam": "Subulussalam",
    "kota banda aceh": "Banda Aceh",
    "kota sabang": "Sabang",
    "kab. aceh besar": "Aceh Besar",
    "kab. aceh jaya": "Aceh Jaya",
    "kab. aceh barat daya": "Aceh Barat Daya",
}


def to_float(v):
    if v is None or v == "":
        return None
    if isinstance(v, (int, float)) and not isinstance(v, bool):
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            return None
        return float(v)
    s = str(v).strip().replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def valid_coord(lat, lng) -> bool:
    if lat is None or lng is None:
        return False
    return ACEH_LAT[0] <= lat <= ACEH_LAT[1] and ACEH_LNG[0] <= lng <= ACEH_LNG[1]


def make_feature(fid, lat, lng, props):
    return {
        "type": "Feature",
        "id": fid,
        "geometry": {"type": "Point", "coordinates": [lng, lat]},
        "properties": props,
    }


def parse_latlng_cell(cell):
    """Parse '5.235128, 96.244983' or ID-locale '5,041519, 97,322296' → (lat, lng)."""
    if cell is None:
        return None, None
    s = str(cell).strip()
    # normalize dash / semicolon separators between lat and lng
    s = re.sub(r"\s*[-–—;]\s*", ", ", s)
    # Indonesian decimals: "5,041519, 97,322296" → dots before final split
    parts = re.split(r"\s*,\s*", s)
    if len(parts) == 2:
        a, b = parts
    elif len(parts) == 4:
        # lat with comma decimal + lng with comma decimal
        a, b = parts[0] + "." + parts[1], parts[2] + "." + parts[3]
    elif len(parts) == 3:
        # ambiguous: try first as int lat degrees? uncommon — bail
        return None, None
    else:
        return None, None
    try:
        return float(a), float(b)
    except ValueError:
        return None, None


def kab_centroid_map() -> dict[str, tuple[float, float]]:
    fc = json.loads(BOUNDARIES_PATH.read_text(encoding="utf-8"))
    out: dict[str, tuple[float, float]] = {}

    def centroid(geom):
        if geom["type"] == "Polygon":
            rings = [geom["coordinates"][0]]
        else:
            rings = [p[0] for p in geom["coordinates"]]
        xs, ys = [], []
        for ring in rings:
            for x, y, *_ in ring:
                xs.append(x)
                ys.append(y)
        return sum(xs) / len(xs), sum(ys) / len(ys)

    for f in fc["features"]:
        name = f["properties"]["name"]
        lon, lat = centroid(f["geometry"])
        out[name.lower()] = (lon, lat)
        out[name] = (lon, lat)
    return out


def normalize_kab(raw: str | None, centroids: dict) -> str | None:
    if not raw:
        return None
    s = str(raw).strip()
    key = re.sub(r"\s+", " ", s.lower())
    if key in KAB_ALIASES:
        return KAB_ALIASES[key]
    # strip Kab./Kota prefixes
    key2 = re.sub(r"^(kab\.?|kabupaten|kota)\s+", "", key).strip()
    for name in list(centroids.keys()):
        if isinstance(name, str) and name.lower() == key2:
            # prefer canonical Title Case from boundaries
            for k in centroids:
                if k.lower() == key2 and k[0].isupper():
                    return k
            return key2.title()
    return s


def build_disaster_events():
    data = json.loads(KEJADIAN_JSON.read_text(encoding="utf-8"))
    features = []
    skipped = 0
    for ev in data.get("kejadian", []):
        jenis_raw = ev.get("jenis_bencana") or ""
        # Skip annual recapitulation rows (not point events)
        if str(jenis_raw).strip() == "Rekapitulasi Tahunan" or "rekapitulasi tahunan" in str(jenis_raw).lower():
            skipped += 1
            continue
        arah = ev.get("arah_di_peta") or {}
        lat = to_float(arah.get("latitude"))
        lng = to_float(arah.get("longitude"))
        if lat is None or lng is None:
            skipped += 1
            continue
        offshore = not valid_coord(lat, lng)
        lokasi = ev.get("lokasi") or {}
        kab = lokasi.get("kabupaten") or lokasi.get("kabupaten_kota")
        pen = ev.get("penanganan") or {}
        status = pen.get("status_proses") or None
        jenis = jenis_raw or "Bencana"
        title = f"{jenis} — {kab}" if kab else str(jenis)
        kron = ev.get("kronologi") or ""
        if isinstance(kron, str) and len(kron) > 280:
            kron = kron[:277] + "..."
        props = {
            "layer": "disasterEvents",
            "title": title,
            "status": status,
            "kabupaten": kab,
            "jenis_bencana": jenis,
            "hari_tanggal": ev.get("hari_tanggal"),
            "jiwa_terdampak": ev.get("jiwa_terdampak"),
            "kk_terdampak": ev.get("kk_terdampak"),
            "pengungsi": ev.get("pengungsi"),
            "meninggal": (ev.get("jumlah_korban") or {}).get("meninggal")
            if isinstance(ev.get("jumlah_korban"), dict)
            else None,
            "kronologi": kron or None,
            "source": "kejadian_bencana_aceh_lengkap.json",
        }
        if offshore:
            props["approx"] = True
            props["coord_quality"] = "offshore_or_out_of_bbox"
        features.append(make_feature(ev.get("id") or f"de-{len(features)+1}", lat, lng, props))
    return features, skipped


def build_fac_health(centroids: dict | None = None):
    """Prefer fasilitas_kesehatan_aceh.json; fall back to health.xlsx."""
    features = []
    skipped = 0

    def resolve_centroid(kab_raw):
        if not centroids:
            return None, None
        kab_canon = normalize_kab(str(kab_raw) if kab_raw else None, centroids)
        c = None
        if kab_canon:
            c = centroids.get(kab_canon) or centroids.get(kab_canon.lower())
        if c is None and kab_raw:
            key = re.sub(r"^(kab\.?|kabupaten|kota)\s+", "", str(kab_raw).strip(), flags=re.I)
            c = centroids.get(key) or centroids.get(key.lower())
        return kab_canon, c

    if HEALTH_JSON.exists():
        data = json.loads(HEALTH_JSON.read_text(encoding="utf-8"))
        for f in data.get("fasilitas") or []:
            nama = f.get("nama")
            if not nama:
                skipped += 1
                continue
            lok = f.get("lokasi") or {}
            lat = lok.get("latitude")
            lng = lok.get("longitude")
            try:
                lat = float(lat) if lat is not None else None
                lng = float(lng) if lng is not None else None
            except (TypeError, ValueError):
                lat = lng = None
            kab_obj = f.get("kabupaten_kota") or {}
            kab_raw = kab_obj.get("nama") or kab_obj.get("nama_normalisasi")
            approx = False
            if lat is None or lng is None or not valid_coord(lat, lng):
                kab_canon, c = resolve_centroid(kab_raw)
                if c is None:
                    skipped += 1
                    continue
                lon0, lat0 = c
                seed = hashlib.md5(f"{f.get('id')}|{nama}".encode()).hexdigest()
                rng = random.Random(seed)
                lat = lat0 + (rng.random() - 0.5) * 0.08
                lng = lon0 + (rng.random() - 0.5) * 0.08
                approx = True
            jenis = f.get("jenis_fasilitas") or {}
            kond = f.get("kondisi") or {}
            ops = f.get("operasional") or {}
            props = {
                "layer": "facHealth",
                "title": str(nama).strip(),
                "status": ops.get("status_operasional_normalisasi")
                or ops.get("status_operasional"),
                "kabupaten": kab_raw,
                "kabupaten_normalisasi": kab_obj.get("nama_normalisasi"),
                "kecamatan": lok.get("kecamatan"),
                "desa": lok.get("desa"),
                "alamat": lok.get("alamat"),
                "jenis": jenis.get("nama") or jenis.get("kode"),
                "skala_kerusakan": kond.get("skala_kerusakan_normalisasi")
                or kond.get("skala_kerusakan"),
                "approx": approx,
                "source": "fasilitas_kesehatan_aceh.json",
            }
            fid = f.get("id") or f"fh-{len(features)+1}"
            features.append(make_feature(fid, lat, lng, props))
        return features, skipped

    # Fallback xlsx
    wb = openpyxl.load_workbook(HEALTH_XLSX, read_only=True, data_only=True)
    ws = wb["191 Faskes Rusak"]
    for row in ws.iter_rows(values_only=True, min_row=9):
        name = row[2] if len(row) > 2 else None
        jenis = row[3] if len(row) > 3 else None
        kab = row[4] if len(row) > 4 else None
        coord = row[12] if len(row) > 12 else None
        if name is None:
            continue
        title = str(name).strip()
        if not title or title.lower() in ("total", "rs dan puskesmas"):
            continue
        if re.match(r"^[A-Z]\.", title) or (":" in title and "Unit" in title):
            continue
        lat, lng = parse_latlng_cell(coord)
        if lat is None or not valid_coord(lat, lng):
            skipped += 1
            continue
        props = {
            "layer": "facHealth",
            "title": title,
            "status": None,
            "kabupaten": str(kab).strip() if kab else None,
            "jenis": str(jenis).strip() if jenis else None,
            "approx": False,
            "source": "fasyankes sheet xlsx fallback",
        }
        features.append(make_feature(f"fh-{len(features)+1}", lat, lng, props))
    wb.close()
    return features, skipped


def build_fac_education(centroids: dict):
    """Prefer edu-sheet Minggu 2 (GPS); then sarana JSON; then edu.xlsx."""
    features = []
    skipped = 0

    def resolve_centroid(kab_raw):
        kab_canon = normalize_kab(str(kab_raw) if kab_raw else None, centroids)
        c = None
        if kab_canon:
            c = centroids.get(kab_canon) or centroids.get(kab_canon.lower())
        if c is None and kab_raw:
            key = re.sub(r"^(kab\.?|kabupaten|kota)\s+", "", str(kab_raw).strip(), flags=re.I)
            c = centroids.get(key) or centroids.get(key.lower())
        return kab_canon, c

    def _num(v):
        if v is None:
            return 0.0
        if isinstance(v, (int, float)):
            return float(v)
        s = str(v).strip().replace(",", ".")
        if s == "" or s.lower() in ("tidak ada", "-", "n/a", "na", "none"):
            return 0.0
        try:
            return float(s)
        except ValueError:
            return 0.0

    def _coord(v):
        if v is None:
            return None
        if isinstance(v, (int, float)):
            return float(v)
        s = str(v).strip().replace(",", ".")
        if not s or s.lower() in ("tidak ada", "-", "n/a", "na", "none"):
            return None
        try:
            return float(s)
        except ValueError:
            return None

    if EDU_SHEET_XLSX.exists():
        wb = openpyxl.load_workbook(EDU_SHEET_XLSX, read_only=True, data_only=True)
        sheet_name = "Minggu 2" if "Minggu 2" in wb.sheetnames else wb.sheetnames[-1]
        ws = wb[sheet_name]
        rows = ws.iter_rows(values_only=True)
        next(rows)
        next(rows)
        for row in rows:
            nama = row[3] if len(row) > 3 else None
            if not nama or str(nama).strip() in ("", "Nama Fasilitas Pendidikan"):
                continue
            nama = str(nama).strip()
            npsn = row[1]
            if isinstance(npsn, (int, float)):
                npsn = str(int(npsn))
            elif npsn:
                npsn = str(npsn).strip()
            else:
                npsn = None
            kab_raw = str(row[6]).strip() if row[6] else None
            lat = _coord(row[9] if len(row) > 9 else None)
            lng = _coord(row[10] if len(row) > 10 else None)
            approx = False
            if lat is None or lng is None or not valid_coord(lat, lng):
                kab_canon, c = resolve_centroid(kab_raw)
                if c is None:
                    skipped += 1
                    continue
                lon0, lat0 = c
                seed = hashlib.md5(f"{npsn}|{nama}".encode()).hexdigest()
                rng = random.Random(seed)
                lat = lat0 + (rng.random() - 0.5) * 0.08
                lng = lon0 + (rng.random() - 0.5) * 0.08
                approx = True
            rusak = int(sum(_num(row[i]) for i in (14, 15, 16, 17) if len(row) > i))
            fid = f"fe-{npsn}" if npsn else f"fe-{len(features)+1}"
            props = {
                "layer": "facEducation",
                "title": nama,
                "status": str(row[36]).strip() if len(row) > 36 and row[36] else None,
                "kabupaten": kab_raw,
                "kecamatan": str(row[7]).strip() if row[7] else None,
                "desa": str(row[8]).strip() if row[8] else None,
                "npsn": npsn,
                "jenjang": str(row[12]).strip() if len(row) > 12 and row[12] else None,
                "alamat": str(row[11]).strip() if len(row) > 11 and row[11] else None,
                "ruang_kelas_rusak": rusak,
                "siswa_meninggal": int(_num(row[34]) if len(row) > 34 else 0),
                "guru_meninggal": int(_num(row[35]) if len(row) > 35 else 0),
                "approx": approx,
                "source": "sheet 1thAoB7jLBRuq9BWLFbuZ6u0mB6szRMF-SFCRtPwgVGM Minggu 2",
            }
            features.append(make_feature(fid, lat, lng, props))
        wb.close()
        return features, skipped

    if EDU_JSON.exists():
        data = json.loads(EDU_JSON.read_text(encoding="utf-8"))
        for s in data.get("sekolah") or []:
            nama = s.get("nama")
            if not nama:
                skipped += 1
                continue
            kab_obj = s.get("kabupaten_kota") or {}
            kab_raw = kab_obj.get("nama") or kab_obj.get("nama_normalisasi")
            kab_canon, c = resolve_centroid(kab_raw)
            if c is None:
                skipped += 1
                continue
            lon0, lat0 = c
            npsn = s.get("npsn")
            seed = hashlib.md5(f"{npsn}|{nama}".encode()).hexdigest()
            rng = random.Random(seed)
            lat = lat0 + (rng.random() - 0.5) * 0.08
            lng = lon0 + (rng.random() - 0.5) * 0.08
            jenjang_obj = s.get("jenjang") or {}
            jenjang = jenjang_obj.get("nama") or jenjang_obj.get("kode")
            ops = s.get("operasional") or {}
            ruang = ((s.get("kondisi_sarana") or {}).get("ruang_kelas")) or {}
            rusak = (
                (ruang.get("rusak_berat") or 0)
                + (ruang.get("rusak_sedang") or 0)
                + (ruang.get("rusak_ringan") or 0)
                + (ruang.get("rusak_total") or 0)
            )
            fid = s.get("id") or (f"fe-{npsn}" if npsn else f"fe-{len(features)+1}")
            props = {
                "layer": "facEducation",
                "title": str(nama).strip(),
                "status": ops.get("kondisi_pbm_normalisasi")
                or ops.get("kondisi_proses_belajar_mengajar"),
                "kabupaten": str(kab_raw).strip() if kab_raw else kab_canon,
                "kabupaten_normalisasi": kab_obj.get("nama_normalisasi"),
                "npsn": str(npsn).strip() if npsn not in (None, "", " ") else None,
                "jenjang": str(jenjang).strip() if jenjang else None,
                "ruang_kelas_rusak": rusak,
                "siswa_meninggal": (s.get("korban") or {}).get("siswa_meninggal"),
                "guru_meninggal": (s.get("korban") or {}).get("guru_meninggal"),
                "approx": True,
                "source": "sarana_pendidikan_aceh.json",
            }
            features.append(make_feature(fid, lat, lng, props))
        return features, skipped

    # Fallback: XLSX rekap_all
    wb = openpyxl.load_workbook(EDU_XLSX, read_only=True, data_only=True)
    ws = wb["rekap_all"]
    rows = ws.iter_rows(values_only=True)
    next(rows)
    next(rows)
    for row in rows:
        npsn = row[1] if len(row) > 1 else None
        nama = row[2] if len(row) > 2 else None
        kab_raw = row[3] if len(row) > 3 else None
        jenjang = row[4] if len(row) > 4 else None
        if not nama or str(nama).strip() in ("", "Nama Sekolah"):
            continue
        kab_canon, c = resolve_centroid(kab_raw)
        if c is None:
            skipped += 1
            continue
        lon0, lat0 = c
        seed = hashlib.md5(f"{npsn}|{nama}".encode()).hexdigest()
        rng = random.Random(seed)
        lat = lat0 + (rng.random() - 0.5) * 0.08
        lng = lon0 + (rng.random() - 0.5) * 0.08
        fid = f"fe-{npsn}" if npsn not in (None, "", " ") else f"fe-{len(features)+1}"
        props = {
            "layer": "facEducation",
            "title": str(nama).strip(),
            "status": None,
            "kabupaten": str(kab_raw).strip() if kab_raw else kab_canon,
            "npsn": str(npsn).strip() if npsn not in (None, "", " ") else None,
            "jenjang": str(jenjang).strip() if jenjang else None,
            "approx": True,
            "source": "rekap fasilitas pendidikan xlsx fallback",
        }
        features.append(make_feature(fid, lat, lng, props))
    wb.close()
    return features, skipped


def merge(existing: dict, new_main: list) -> dict:
    kept = [
        f
        for f in existing.get("features", [])
        if (f.get("properties") or {}).get("layer") not in MAIN_LAYERS
    ]
    return {"type": "FeatureCollection", "features": new_main + kept}


def counts(fc):
    return Counter((f.get("properties") or {}).get("layer") for f in fc["features"])


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--write", action="store_true", help="Overwrite markers.geojson")
    args = ap.parse_args()

    required = [KEJADIAN_JSON, BOUNDARIES_PATH, MARKERS_PATH]
    if not HEALTH_JSON.exists() and not HEALTH_XLSX.exists():
        raise SystemExit(f"Missing health input: {HEALTH_JSON} or {HEALTH_XLSX}")
    if not EDU_SHEET_XLSX.exists() and not EDU_JSON.exists() and not EDU_XLSX.exists():
        raise SystemExit(
            f"Missing education input: {EDU_SHEET_XLSX} or {EDU_JSON} or {EDU_XLSX}"
        )
    for path in required:
        if not path.exists():
            raise SystemExit(f"Missing input: {path}")

    centroids = kab_centroid_map()
    de, de_skip = build_disaster_events()
    fh, fh_skip = build_fac_health(centroids)
    fe, fe_skip = build_fac_education(centroids)
    print(
        f"built disasterEvents={len(de)} (skip {de_skip}), "
        f"facHealth={len(fh)} (skip {fh_skip}), "
        f"facEducation={len(fe)} (skip {fe_skip})"
    )

    existing = json.loads(MARKERS_PATH.read_text(encoding="utf-8"))
    merged = merge(existing, de + fh + fe)
    c = counts(merged)
    print("merged layer counts:")
    for k, v in sorted(c.items(), key=lambda x: (-x[1], str(x[0]))):
        print(f"  {k}: {v}")
    print(f"  TOTAL: {len(merged['features'])}")

    if args.write:
        MARKERS_PATH.write_text(
            json.dumps(merged, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )
        print(f"wrote {MARKERS_PATH}")
    else:
        print("dry-run only (pass --write to overwrite fixtures/markers.geojson)")


if __name__ == "__main__":
    main()
