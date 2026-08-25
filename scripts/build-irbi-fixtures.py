#!/usr/bin/env python3
"""Join IRBI 2025 JSON onto kab polygons -> public/fixtures/areas/irbi2025.*"""
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC_DEFAULT = Path("/workspace/drive-aceh-data/risiko_bencana_aceh_irbi_2025.json")
GEO = ROOT / "public/fixtures/areas/r3pDistribution.geojson"
OUT_GEO = ROOT / "public/fixtures/areas/irbi2025.geojson"
OUT_LEGEND = ROOT / "public/fixtures/areas/irbi2025.legend.json"
OUT_RAW = ROOT / "public/fixtures/irbi-2025.json"

IR_FIELDS = [
    "ir_banjir", "ir_gempabumi", "ir_tsunami", "ir_letusan_gunung_api",
    "ir_banjir_bandang", "ir_gelombang_ekstrim_abrasi", "ir_kebakaran_hutan_lahan",
    "ir_tanah_longsor", "ir_kekeringan", "ir_likuefaksi", "ir_cuaca_ekstrem",
]
BUCKET_MAP = {"TINGGI": "tinggi", "SEDANG": "sedang", "RENDAH": "rendah"}


def main() -> int:
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else SRC_DEFAULT
    if not src.exists():
        print(f"missing IRBI source: {src}", file=sys.stderr)
        return 1
    irbi = json.loads(src.read_text(encoding="utf-8"))
    shutil.copy(src, OUT_RAW)
    by_name = {k["kabupaten_kota"]: k for k in irbi["kabupaten_kota"]}
    geo = json.loads(GEO.read_text(encoding="utf-8"))
    matched = 0
    unmatched = []
    features = []
    for feat in geo["features"]:
        name = feat["properties"]["name"]
        row = by_name.get(name)
        if not row:
            unmatched.append(name)
            continue
        matched += 1
        props = {
            "name": name,
            "irb_2025": row["irb_2025"],
            "kelas_risiko": row["kelas_risiko"],
            "bucket": BUCKET_MAP.get(row["kelas_risiko"], "sedang"),
            "ancaman_tertinggi": row["ancaman_tertinggi"],
            "skor_ancaman_tertinggi": row.get("skor_ancaman_tertinggi"),
            "kelas_ancaman_tertinggi": row.get("kelas_ancaman_tertinggi"),
            "latitude": row.get("latitude"),
            "longitude": row.get("longitude"),
            "value": row["irb_2025"],
        }
        for k in IR_FIELDS:
            props[k] = row.get(k)
        features.append({"type": "Feature", "geometry": feat["geometry"], "properties": props})
    OUT_GEO.write_text(json.dumps({"type": "FeatureCollection", "features": features, "metadata": {"source": "IRBI 2025 join onto r3pDistribution kab polygons", "matched": matched, "total_geo": len(geo["features"]), "total_irbi": len(by_name)}}, ensure_ascii=False), encoding="utf-8")
    OUT_LEGEND.write_text(json.dumps({"title": "IRBI 2025 — kelas risiko kab/kota", "items": [{"color": "#1F4C15", "label": "Rendah"}, {"color": "#C4A35A", "label": "Sedang"}, {"color": "#FF7722", "label": "Tinggi"}]}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"matched={matched}/23 unmatched={unmatched}")
    print(f"wrote {OUT_GEO}")
    print(f"wrote {OUT_LEGEND}")
    print(f"wrote {OUT_RAW}")
    return 0 if matched == 23 and not unmatched else 2


if __name__ == "__main__":
    raise SystemExit(main())
