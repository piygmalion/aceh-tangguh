#!/usr/bin/env python3
"""Inspect sik_aceh.db and extract kejadian-like rows for the JS merge.

Usage:
  python3 scripts/import-sik-aceh.py
  python3 scripts/import-sik-aceh.py --db data/sik/sik_aceh.db
  python3 scripts/import-sik-aceh.py --write-fixtures
  python3 scripts/import-sik-aceh.py --write-fixtures --accept-gps-quarantine

Default is dry-run (print inspect + merge counts). --write-fixtures is
blocked when the merge reports GPS quarantines unless
--accept-gps-quarantine is set and existing GPS is kept.
"""
from __future__ import annotations

import argparse
import json
import sqlite3
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "data" / "sik" / "sik_aceh.db"
SCRATCH = ROOT / "scripts" / "_"
EXTRACTED = SCRATCH / "sik-extracted.json"
INSPECT = SCRATCH / "sik-inspect.json"
APPLY = ROOT / "scripts" / "lib" / "sik-apply.mjs"

SKIP_TABLES = {
    "users",
    "user",
    "session",
    "sessions",
    "login",
    "password",
    "passwords",
    "log",
    "logs",
    "audit",
    "audits",
    "token",
    "tokens",
    "cache",
    "android_metadata",
}

KEJADIAN_TABLES = (
    "kejadian",
    "kejadian_bencana",
    "t_kejadian",
    "bencana",
    "sik_kejadian",
    "disasters",
    "disaster",
    "events",
    "event",
)

COLUMN_ALIASES = {
    "sik_id": ["id", "id_kejadian", "kejadian_id", "kode", "kode_kejadian", "no"],
    "jenis_bencana": [
        "jenis_bencana",
        "jenis_bencana_teks",
        "jenis",
        "tipe_bencana",
        "nama_bencana",
        "bencana",
    ],
    "hari_tanggal": ["hari_tanggal", "tanggal", "tgl", "date", "waktu", "datetime"],
    "latitude": ["latitude", "lat", "y", "koordinat_y"],
    "longitude": ["longitude", "lon", "lng", "long", "x", "koordinat_x"],
    "kabupaten": ["kabupaten", "kab", "kabupaten_kota", "nama_kabupaten"],
    "kecamatan": ["kecamatan", "kec", "nama_kecamatan"],
    "desa": ["desa", "kelurahan", "gampong", "nama_desa"],
    "kode_desa_kelurahan": [
        "kode_desa_kelurahan",
        "kode_desa",
        "kode_bps",
        "kode_wilayah",
        "kd_desa",
    ],
    "jiwa_terdampak": ["jiwa_terdampak", "jiwa", "penduduk_terdampak"],
    "kk_terdampak": ["kk_terdampak", "kk"],
    "pengungsi": ["pengungsi", "mengungsi"],
    "meninggal": ["meninggal", "korban_meninggal", "mati"],
    "hilang": ["hilang", "korban_hilang"],
    "luka_berat": ["luka_berat"],
    "luka_ringan": ["luka_ringan"],
    "kronologi": ["kronologi", "uraian", "deskripsi", "keterangan"],
    "penyebab": ["penyebab", "sebab"],
    "status_proses": ["status_proses", "status", "status_penanganan"],
    "jam": ["jam", "waktu_kejadian"],
}


def rejected_table(name: str) -> bool:
    key = (name or "").strip().lower()
    return (not key) or key.startswith("sqlite_") or key in SKIP_TABLES


def pick(columns: list[str], aliases: list[str]) -> str | None:
    lower = {c.lower(): c for c in columns}
    for alias in aliases:
        if alias.lower() in lower:
            return lower[alias.lower()]
    return None


def resolve_columns(columns: list[str]) -> dict[str, str | None]:
    return {field: pick(columns, aliases) for field, aliases in COLUMN_ALIASES.items()}


def looks_like_kejadian(columns: list[str]) -> bool:
    mapping = resolve_columns(columns)
    if not mapping["jenis_bencana"]:
        return False
    return bool(mapping["hari_tanggal"] or (mapping["latitude"] and mapping["longitude"]))


def list_tables(con: sqlite3.Connection) -> list[str]:
    rows = con.execute(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).fetchall()
    return [r[0] for r in rows]


def table_columns(con: sqlite3.Connection, table: str) -> list[str]:
    rows = con.execute(f"PRAGMA table_info({quote_ident(table)})").fetchall()
    return [r[1] for r in rows]


def quote_ident(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def resolve_kejadian_table(tables: list[str], cols: dict[str, list[str]]) -> str | None:
    lower = {t.lower(): t for t in tables}
    for alias in KEJADIAN_TABLES:
        hit = lower.get(alias)
        if hit and not rejected_table(hit) and looks_like_kejadian(cols.get(hit, [])):
            return hit
    for table in tables:
        if rejected_table(table):
            continue
        if looks_like_kejadian(cols.get(table, [])):
            return table
    return None


def inspect_db(con: sqlite3.Connection) -> dict:
    tables = list_tables(con)
    cols = {t: table_columns(con, t) for t in tables}
    counts = {}
    for t in tables:
        try:
            counts[t] = con.execute(f"SELECT COUNT(*) FROM {quote_ident(t)}").fetchone()[0]
        except sqlite3.Error:
            counts[t] = None
    rejected = [t for t in tables if rejected_table(t)]
    kejadian_table = resolve_kejadian_table(tables, cols)
    mapping = resolve_columns(cols[kejadian_table]) if kejadian_table else {}
    return {
        "tables": tables,
        "rejected_tables": rejected,
        "columns": cols,
        "row_counts": counts,
        "kejadian_table": kejadian_table,
        "column_mapping": mapping,
    }


def extract_rows(con: sqlite3.Connection, inspect: dict) -> list[dict]:
    table = inspect.get("kejadian_table")
    mapping: dict[str, str | None] = inspect.get("column_mapping") or {}
    if not table:
        return []
    rows = con.execute(f"SELECT * FROM {quote_ident(table)}").fetchall()
    names = [d[0] for d in con.execute(f"SELECT * FROM {quote_ident(table)} LIMIT 0").description]
    out = []
    for raw in rows:
        record = dict(zip(names, raw))
        projected = {}
        for field, column in mapping.items():
            if not column:
                continue
            projected[field] = record.get(column)
        out.append(projected)
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Inspect and merge sik_aceh.db")
    parser.add_argument("--db", default=str(DEFAULT_DB), help="Path to sik_aceh.db")
    parser.add_argument("--write-fixtures", action="store_true")
    parser.add_argument(
        "--accept-gps-quarantine",
        action="store_true",
        help="Allow --write-fixtures when GPS conflicts keep existing coords (SIK decimal >100 m is not written).",
    )
    parser.add_argument("--kejadian", default=None)
    parser.add_argument("--markers", default=None)
    args = parser.parse_args()

    db_path = Path(args.db)
    if not db_path.is_file():
        print(
            json.dumps(
                {
                    "error": "sik_db_missing",
                    "path": str(db_path),
                    "hint": "Copy the local master to data/sik/sik_aceh.db (gitignored).",
                },
                indent=2,
            ),
            file=sys.stderr,
        )
        return 2

    con = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    try:
        inspect = inspect_db(con)
        rows = extract_rows(con, inspect)
    finally:
        con.close()

    inspect["extracted_rows"] = len(rows)
    SCRATCH.mkdir(parents=True, exist_ok=True)
    INSPECT.write_text(json.dumps(inspect, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    EXTRACTED.write_text(
        json.dumps({"inspected": inspect, "rows": rows}, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    print(
        json.dumps(
            {
                "db": str(db_path),
                "tables": inspect["tables"],
                "rejected_tables": inspect["rejected_tables"],
                "kejadian_table": inspect["kejadian_table"],
                "column_mapping": inspect["column_mapping"],
                "row_counts": inspect["row_counts"],
                "extracted_rows": len(rows),
                "inspect": str(INSPECT),
                "extracted": str(EXTRACTED),
            },
            indent=2,
            ensure_ascii=False,
        )
    )

    if not inspect["kejadian_table"]:
        print("No kejadian-like table found. Mapping documented in scripts/sik/SCHEMA.md.", file=sys.stderr)
        return 3

    cmd = ["node", str(APPLY), "--extracted", str(EXTRACTED)]
    if args.write_fixtures:
        cmd.append("--write-fixtures")
    if args.accept_gps_quarantine:
        cmd.append("--accept-gps-quarantine")
    if args.kejadian:
        cmd.extend(["--kejadian", args.kejadian])
    if args.markers:
        cmd.extend(["--markers", args.markers])
    result = subprocess.run(cmd, cwd=str(ROOT))
    return result.returncode


if __name__ == "__main__":
    raise SystemExit(main())
