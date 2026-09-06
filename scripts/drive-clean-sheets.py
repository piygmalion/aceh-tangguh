#!/usr/bin/env python3
"""Clean Drive working copies. Does not write to Supabase or coordinator files.

Reads `.data/drive-clean/_raw/*.xlsx` (local copies of Drive sheets) and
writes public CSVs under `data/drive-clean/` plus PII under `.data/drive-clean/`.

  python scripts/drive-clean-sheets.py
"""
from __future__ import annotations

import csv
import json
import math
import re
import unicodedata
from collections import Counter
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / ".data" / "drive-clean" / "_raw"
PUBLIC = ROOT / "data" / "drive-clean"
PRIVATE = ROOT / ".data" / "drive-clean"

ACEH_LAT = (2.0, 6.5)
ACEH_LNG = (94.5, 99.5)

PROFIL_DESA_NAMES = (
    "Aceh Selatan",
    "Aceh Tenggara",
    "Aceh Timur",
    "Aceh Tengah",
    "Aceh Barat",
    "Aceh Besar",
    "Pidie",
    "Aceh Utara",
    "Simeulue",
    "Aceh Singkil",
    "Bireuen",
    "Aceh Barat Daya",
    "Gayo Lues",
    "Aceh Jaya",
    "Nagan Raya",
    "Aceh Tamiang",
    "Bener Meriah",
    "Pidie Jaya",
    "Banda Aceh",
    "Sabang",
    "Lhokseumawe",
    "Langsa",
    "Subulussalam",
)

ADMIN_PREFIX = re.compile(
    r"^(kota(\s+administratif)?|kabupaten|kab\.?|kotamadya)\s+",
    re.I,
)

PII_HEADER = re.compile(
    r"(^|_)(hp|telepon|telpon|telp|phone|no_hp|nomor.?kontak|nama_pic|"
    r"nama_camat|camat|kepala.?desa|kades|penanggungjawab|pic_nama|pic_kontak)(_|$)",
    re.I,
)
PHONE_CELL = re.compile(r"(?<![.\d])(?:\+62|62|08)\d[\d\s-]{6,12}\d")

EN_KAB = {
    "central aceh": "Aceh Tengah",
    "southeast aceh": "Aceh Tenggara",
    "south aceh": "Aceh Selatan",
    "east aceh": "Aceh Timur",
    "west aceh": "Aceh Barat",
    "southwest aceh": "Aceh Barat Daya",
    "north aceh": "Aceh Utara",
    "great aceh": "Aceh Besar",
}


def cell_str(value) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and value == int(value) and abs(value) >= 1:
        return str(int(value))
    return str(value).strip()


def fold_key(raw: str) -> str:
    text = unicodedata.normalize("NFC", raw).strip().lower()
    text = re.sub(r"[_./-]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return ADMIN_PREFIX.sub("", text).strip()


KAB_BY_KEY = {fold_key(name): name for name in PROFIL_DESA_NAMES}
KAB_NAMES_LONGEST = tuple(sorted(PROFIL_DESA_NAMES, key=len, reverse=True))


def normalize_kab(raw: str | None) -> str:
    if not raw:
        return ""
    key = fold_key(str(raw))
    return KAB_BY_KEY.get(key, "")


def extract_kab(text: str | None) -> str:
    if not text:
        return ""
    direct = normalize_kab(text)
    if direct:
        return direct
    lowered = str(text).lower()
    for needle, name in EN_KAB.items():
        if needle in lowered:
            return name
    for name in KAB_NAMES_LONGEST:
        if name.lower() in lowered:
            return name
        if f"kabupaten {name.lower()}" in lowered:
            return name
        if f"kota {name.lower()}" in lowered:
            return name
    return ""


def parse_float(value):
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
            return None
        return float(value)
    text = str(value).strip().rstrip(",").replace(" ", "")
    if not text:
        return None
    text = text.replace(",", ".")
    try:
        return float(text)
    except ValueError:
        return None


def looks_truncated(value) -> bool:
    if value is None or value == "":
        return False
    if isinstance(value, bool):
        return False
    if isinstance(value, int):
        return abs(value) > 180
    if isinstance(value, float):
        return value.is_integer() and abs(value) > 180
    text = str(value).strip().rstrip(",")
    if re.fullmatch(r"-?\d+", text):
        return abs(int(text)) > 180
    return False


def classify_coord(lat_raw, lng_raw) -> tuple[float | None, float | None, str]:
    if (lat_raw is None or cell_str(lat_raw) == "") and (
        lng_raw is None or cell_str(lng_raw) == ""
    ):
        return None, None, "missing"
    if looks_truncated(lat_raw) or looks_truncated(lng_raw):
        return None, None, "truncated_integer"
    lat = parse_float(lat_raw)
    lng = parse_float(lng_raw)
    if lat is None or lng is None:
        return None, None, "unparseable"
    if ACEH_LNG[0] <= lat <= ACEH_LNG[1] and ACEH_LAT[0] <= lng <= ACEH_LAT[1]:
        lat, lng = lng, lat
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return lat, lng, "unparseable"
    if ACEH_LAT[0] <= lat <= ACEH_LAT[1] and ACEH_LNG[0] <= lng <= ACEH_LNG[1]:
        return lat, lng, "ok"
    return lat, lng, "out_of_bbox"


def parse_bool_verified(value) -> str:
    text = cell_str(value).lower()
    if text in {"true", "1", "yes", "ya", "sudah", "diverifikasi"}:
        return "true"
    if text in {"false", "0", "no", "tidak", "belum"}:
        return "false"
    return "false"


def parse_status_aktif(value) -> str:
    text = cell_str(value).lower()
    if text in {"masih ada", "masih aktif", "aktif", "ya", "true", "1"}:
        return "aktif"
    if text in {"tidak aktif", "sudah tutup", "tutup", "false", "0", "tidak"}:
        return "tidak_aktif"
    return text


def parse_date(value) -> str:
    if value is None or value == "":
        return ""
    if hasattr(value, "date"):
        try:
            return value.date().isoformat()
        except Exception:
            pass
    text = cell_str(value)
    return text[:10] if len(text) >= 10 and text[4] == "-" else text


def sheet_rows(path: Path, sheet: str) -> tuple[list[str], list[tuple]]:
    wb = load_workbook(path, read_only=True, data_only=True)
    ws = wb[sheet]
    rows = list(ws.iter_rows(values_only=True))
    wb.close()
    if not rows:
        return [], []
    headers = [cell_str(h) or f"col_{i}" for i, h in enumerate(rows[0], 1)]
    return headers, rows[1:]


def row_dict(headers: list[str], row: tuple) -> dict[str, object]:
    out: dict[str, object] = {}
    for i, header in enumerate(headers):
        out[header] = row[i] if i < len(row) else None
    return out


def nonempty(row: tuple, *idxs: int) -> bool:
    for i in idxs:
        if i < len(row) and cell_str(row[i]):
            return True
    return False


def write_csv(path: Path, fieldnames: list[str], rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row.get(key, "") for key in fieldnames})


def fmt_coord(value) -> str:
    if value is None or value == "":
        return ""
    return f"{float(value):.8f}".rstrip("0").rstrip(".")


def dedup_points(rows: list[dict], name_key: str) -> tuple[list[dict], list[dict]]:
    kept: list[dict] = []
    dropped: list[dict] = []
    seen: dict[str, int] = {}
    ranked = sorted(
        rows,
        key=lambda r: (
            0 if r.get("verified") == "true" else 1,
            0 if r.get("coord_quality") == "ok" else 1,
            str(r.get("source_row") or ""),
        ),
    )
    for row in ranked:
        lat = parse_float(row.get("latitude"))
        lng = parse_float(row.get("longitude"))
        if lat is None or lng is None:
            kept.append(row)
            continue
        key = f"{round(lat, 5)}|{round(lng, 5)}|{fold_key(str(row.get(name_key) or ''))}"
        if key in seen:
            dropped.append({**row, "dedup_of": kept[seen[key]].get("source_row", "")})
            continue
        seen[key] = len(kept)
        kept.append(row)
    return kept, dropped


def public_pii_hits(path: Path) -> list[str]:
    hits: list[str] = []
    with path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for header in reader.fieldnames or []:
            if PII_HEADER.search(header.replace(" ", "_")):
                hits.append(f"{path.name}: header {header}")
        skip = {"latitude", "longitude", "media_url"}
        for i, row in enumerate(reader, 2):
            for header, value in row.items():
                if header in skip or not value:
                    continue
                if PHONE_CELL.search(str(value)):
                    hits.append(f"{path.name}:{i}:{header}")
                    break
    return hits


def comma_coord_hits(path: Path) -> list[str]:
    hits: list[str] = []
    with path.open(encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for i, row in enumerate(reader, 2):
            for key in ("latitude", "longitude"):
                value = str(row.get(key) or "")
                if "," in value:
                    hits.append(f"{path.name}:{i}:{key}={value}")
    return hits


def gate_stats(rows: list[dict], require_verified: bool) -> dict:
    point_rows = [
        row
        for row in rows
        if parse_float(row.get("latitude")) is not None
        and parse_float(row.get("longitude")) is not None
    ]
    in_bbox = sum(1 for row in rows if row.get("coord_quality") == "ok")
    kabs = [str(row.get("kabupaten") or "") for row in rows]
    unknown = [kab for kab in kabs if kab and kab not in PROFIL_DESA_NAMES]
    empty_kab = sum(1 for kab in kabs if not kab)
    empty_verified = 0
    if require_verified:
        empty_verified = sum(1 for row in rows if cell_str(row.get("verified")) == "")
    denom = len(rows) or 1
    return {
        "rows": len(rows),
        "point_rows": len(point_rows),
        "in_bbox": in_bbox,
        "bbox_pct": 100.0 * in_bbox / denom,
        "unknown_kab": unknown,
        "empty_kab": empty_kab,
        "empty_verified": empty_verified,
        "kab_ok": empty_kab == 0 and not unknown,
    }


def clean_pengungsian() -> dict:
    headers, body = sheet_rows(RAW / "pengungsian.xlsx", "Dataset titik pengungsian")
    titik: list[dict] = []
    kaji: list[dict] = []
    kontak: list[dict] = []
    for row in body:
        if not nonempty(row, 1, 2, 3, 4):
            continue
        rec = row_dict(headers, row)
        lat, lng, quality = classify_coord(rec.get("latitude"), rec.get("longitude"))
        kab = normalize_kab(cell_str(rec.get("Kabupaten"))) or extract_kab(
            cell_str(rec.get("alamat_peta"))
        )
        source_row = cell_str(rec.get("No"))
        alamat = cell_str(rec.get("alamat_peta"))
        desa = cell_str(rec.get("Desa"))
        titik.append(
            {
                "source_row": source_row,
                "nama": desa or alamat,
                "latitude": fmt_coord(lat),
                "longitude": fmt_coord(lng),
                "alamat": alamat,
                "kabupaten": kab,
                "kecamatan": cell_str(rec.get("Kecamatan")),
                "desa": desa,
                "kode_desa": "",
                "bentuk": cell_str(rec.get("Bentuk Pengungsian")),
                "status_aktif": "",
                "verified": parse_bool_verified(
                    rec.get(
                        "Pengungsian diverifikasi (faktualisasi) keberadaannya?"
                    )
                ),
                "sumber": "diskominfo_titik_pengungsian",
                "tanggal_update": parse_date(
                    rec.get("Update Data (lihat di dokumen Diskominsa)")
                ),
                "coord_quality": quality,
                "approx": "true" if quality != "ok" else "false",
            }
        )
        if any(
            cell_str(rec.get(col))
            for col in (
                "Total Jumlah KK Pengungsi",
                "Total Jumlah Jiwa Pengungsi",
                "Jumlah pengungsi laki-laki",
                "Jumlah pengungsi perempuan",
            )
        ):
            kaji.append(
                {
                    "source_row": source_row,
                    "kabupaten": kab,
                    "desa": desa,
                    "jumlah_kk": cell_str(rec.get("Total Jumlah KK Pengungsi")),
                    "jiwa_total": cell_str(rec.get("Total Jumlah Jiwa Pengungsi")),
                    "laki_laki": cell_str(rec.get("Jumlah pengungsi laki-laki")),
                    "perempuan": cell_str(rec.get("Jumlah pengungsi perempuan")),
                    "ibu_hamil": cell_str(rec.get("Jumlah pengungsi ibu hamil")),
                    "menyusui": cell_str(rec.get("Jumlah pengungsi menyusui")),
                    "anak": cell_str(
                        rec.get("Jumlah pengungsi anak-anak (di bawah 12 tahun)")
                    ),
                    "lansia": cell_str(
                        rec.get("Jumlah pengungsi lansia (di atas 60 tahun)")
                    ),
                    "asal_desa_pengungsi": cell_str(rec.get("Asal Desa Pengungsi")),
                    "kebutuhan": cell_str(rec.get("Kebutuhan Pengungsian")),
                    "air": cell_str(rec.get("Akses Air Minum & Air Bersih")),
                    "pangan": cell_str(rec.get("Akses Pangan & Makanan")),
                    "sanitasi": cell_str(rec.get("Kondisi Sanitasi & Kamar Mandi")),
                    "listrik": cell_str(rec.get("Akses Listrik")),
                    "sinyal": cell_str(rec.get("Akses Sinyal Telekomunikasi")),
                    "tanggal_update": parse_date(
                        rec.get("Update Data (lihat di dokumen Diskominsa)")
                    ),
                }
            )
        for role, name_key, phone_key in (
            (
                "camat",
                "Nama Pak Camat setempat",
                "Nomor kontak Pak Camat / Operator Kecamatan",
            ),
            (
                "kades",
                "Nama Kepala Desa setempat",
                "Nomor kontak Kepala Desa / Operator Desa",
            ),
            (
                "pic_pengungsian",
                "Nama Penanggungjawab Pengungsian",
                "Nomor Penanggungjawab Pengungsian",
            ),
        ):
            nama = cell_str(rec.get(name_key))
            telepon = cell_str(rec.get(phone_key))
            if nama or telepon:
                kontak.append(
                    {
                        "dataset": "pengungsian_diskominfo",
                        "source_row": source_row,
                        "role": role,
                        "nama": nama,
                        "telepon": telepon,
                        "kabupaten": kab,
                        "desa": desa,
                    }
                )

    haifa_headers, haifa_body = sheet_rows(RAW / "pengungsian.xlsx", "Data Tanggapi")
    haifa_titik: list[dict] = []
    haifa_kaji: list[dict] = []
    for row in haifa_body:
        if not nonempty(row, 1, 2, 3):
            continue
        rec = row_dict(haifa_headers, row)
        lat, lng, quality = classify_coord(rec.get("latitude"), rec.get("longitude"))
        alamat = cell_str(rec.get("alamat_peta"))
        kab = extract_kab(alamat) or normalize_kab(cell_str(rec.get("col_9")))
        source_row = cell_str(rec.get("No"))
        desa = cell_str(rec.get("desa_asal"))
        haifa_titik.append(
            {
                "source_row": source_row,
                "nama": desa or alamat,
                "latitude": fmt_coord(lat),
                "longitude": fmt_coord(lng),
                "alamat": alamat,
                "kabupaten": kab,
                "kecamatan": "",
                "desa": desa,
                "kode_desa": "",
                "bentuk": "",
                "status_aktif": parse_status_aktif(rec.get("Masih aktif")),
                "verified": "false",
                "sumber": "haifa",
                "tanggal_update": "",
                "coord_quality": quality,
                "approx": "true" if quality != "ok" else "false",
            }
        )
        if any(
            cell_str(rec.get(col))
            for col in (
                "jumlah_anak",
                "jumlah_laki_laki",
                "jumlah_perempuan",
                "total_orang",
            )
        ):
            haifa_kaji.append(
                {
                    "source_row": source_row,
                    "kabupaten": kab,
                    "desa": desa,
                    "jumlah_kk": "",
                    "jiwa_total": cell_str(rec.get("total_orang")),
                    "laki_laki": cell_str(rec.get("jumlah_laki_laki")),
                    "perempuan": cell_str(rec.get("jumlah_perempuan")),
                    "anak": cell_str(rec.get("jumlah_anak")),
                    "tanggal_update": "",
                }
            )
        for role, nama, telepon in (
            ("pic", cell_str(rec.get("nama_pic")), cell_str(rec.get("no_hp"))),
            (
                "haifa_contact",
                cell_str(rec.get("Data Haifa")),
                cell_str(rec.get("col_7")),
            ),
        ):
            if nama or telepon:
                kontak.append(
                    {
                        "dataset": "pengungsian_haifa",
                        "source_row": source_row,
                        "role": role,
                        "nama": nama,
                        "telepon": telepon,
                        "kabupaten": kab,
                        "desa": desa,
                    }
                )

    titik, dropped = dedup_points(titik, "nama")
    haifa_titik, haifa_dropped = dedup_points(haifa_titik, "nama")

    overlap: list[dict] = []
    haifa_keys = {
        f"{round(parse_float(r['latitude']) or 0, 5)}|{round(parse_float(r['longitude']) or 0, 5)}"
        for r in haifa_titik
        if r["latitude"] and r["longitude"]
    }
    for row in titik:
        if not row["latitude"] or not row["longitude"]:
            continue
        key = f"{round(float(row['latitude']), 5)}|{round(float(row['longitude']), 5)}"
        if key in haifa_keys:
            overlap.append(
                {
                    "latitude": row["latitude"],
                    "longitude": row["longitude"],
                    "alamat": row["alamat"],
                    "kabupaten": row["kabupaten"],
                    "diskominfo_source_row": row["source_row"],
                }
            )

    titik_fields = [
        "source_row",
        "nama",
        "latitude",
        "longitude",
        "alamat",
        "kabupaten",
        "kecamatan",
        "desa",
        "kode_desa",
        "bentuk",
        "status_aktif",
        "verified",
        "sumber",
        "tanggal_update",
        "coord_quality",
        "approx",
    ]
    write_csv(PUBLIC / "pengungsian" / "titik.csv", titik_fields, titik)
    write_csv(
        PUBLIC / "pengungsian" / "kaji_agregat.csv",
        [
            "source_row",
            "kabupaten",
            "desa",
            "jumlah_kk",
            "jiwa_total",
            "laki_laki",
            "perempuan",
            "ibu_hamil",
            "menyusui",
            "anak",
            "lansia",
            "asal_desa_pengungsi",
            "kebutuhan",
            "air",
            "pangan",
            "sanitasi",
            "listrik",
            "sinyal",
            "tanggal_update",
        ],
        kaji,
    )
    write_csv(PUBLIC / "pengungsian" / "haifa_titik.csv", titik_fields, haifa_titik)
    write_csv(
        PUBLIC / "pengungsian" / "haifa_kaji_agregat.csv",
        [
            "source_row",
            "kabupaten",
            "desa",
            "jumlah_kk",
            "jiwa_total",
            "laki_laki",
            "perempuan",
            "anak",
            "tanggal_update",
        ],
        haifa_kaji,
    )
    write_csv(
        PUBLIC / "pengungsian" / "dedup-log.csv",
        titik_fields + ["dedup_of"],
        dropped + haifa_dropped,
    )
    write_csv(
        PUBLIC / "pengungsian" / "overlap_diskominfo_haifa.csv",
        [
            "latitude",
            "longitude",
            "alamat",
            "kabupaten",
            "diskominfo_source_row",
        ],
        overlap,
    )
    write_csv(
        PRIVATE / "pengungsian" / "kontak_internal.csv",
        ["dataset", "source_row", "role", "nama", "telepon", "kabupaten", "desa"],
        kontak,
    )
    return {
        "titik": titik,
        "haifa": haifa_titik,
        "kaji": kaji,
        "kontak": len(kontak),
        "dedup_dropped": len(dropped),
        "haifa_dedup_dropped": len(haifa_dropped),
        "overlap": len(overlap),
    }


def clean_tilikan() -> dict:
    headers, body = sheet_rows(RAW / "tilikan.xlsx", "Titik Pengungsian")
    padal: list[dict] = []
    padal_kaji: list[dict] = []
    kontak: list[dict] = []
    for row in body:
        if not nonempty(row, 0, 11, 12):
            continue
        rec = row_dict(headers, row)
        lat, lng, quality = classify_coord(rec.get("latitude"), rec.get("longitude"))
        alamat = cell_str(rec.get("alamat_peta"))
        kab = extract_kab(alamat)
        source_row = cell_str(rec.get("No"))
        desa = cell_str(rec.get("desa_asal"))
        padal.append(
            {
                "source_row": source_row,
                "nama": desa or alamat,
                "latitude": fmt_coord(lat),
                "longitude": fmt_coord(lng),
                "alamat": alamat,
                "kabupaten": kab,
                "kecamatan": "",
                "desa": desa,
                "kode_desa": "",
                "bentuk": cell_str(rec.get("tipe_posko")),
                "status_aktif": "",
                "verified": "false",
                "sumber": "tilikan_padal",
                "tanggal_update": "",
                "coord_quality": quality,
                "approx": "true" if quality != "ok" else "false",
            }
        )
        if any(
            cell_str(rec.get(col))
            for col in (
                "jumlah_anak",
                "jumlah_laki_laki",
                "jumlah_perempuan",
                "total_orang",
            )
        ):
            padal_kaji.append(
                {
                    "source_row": source_row,
                    "kabupaten": kab,
                    "desa": desa,
                    "jumlah_kk": "",
                    "jiwa_total": cell_str(rec.get("total_orang")),
                    "laki_laki": cell_str(rec.get("jumlah_laki_laki")),
                    "perempuan": cell_str(rec.get("jumlah_perempuan")),
                    "anak": cell_str(rec.get("jumlah_anak")),
                }
            )
        nama = cell_str(rec.get("nama_pic"))
        telepon = cell_str(rec.get("no_hp"))
        if nama or telepon:
            kontak.append(
                {
                    "dataset": "tilikan_padal",
                    "source_row": source_row,
                    "role": "pic",
                    "nama": nama,
                    "telepon": telepon,
                    "kabupaten": kab,
                    "desa": desa,
                }
            )

    padal, padal_dropped = dedup_points(padal, "nama")

    def clean_asset(sheet: str, sumber: str) -> list[dict]:
        h, body_rows = sheet_rows(RAW / "tilikan.xlsx", sheet)
        out: list[dict] = []
        for row in body_rows:
            if not nonempty(row, 2, 6, 7, 9):
                continue
            rec = row_dict(h, row)
            lat, lng, quality = classify_coord(rec.get("Latitude"), rec.get("Longitude"))
            kab = normalize_kab(cell_str(rec.get("Kabupaten/Kota"))) or extract_kab(
                cell_str(rec.get("Alamat"))
            )
            nama = (
                cell_str(rec.get("Nama Lokasi"))
                or cell_str(rec.get("Desa/Gampong"))
                or cell_str(rec.get("Alamat"))
            )
            out.append(
                {
                    "nama": nama,
                    "jenis": cell_str(rec.get("Jenis Fasilitas Publik")),
                    "latitude": fmt_coord(lat),
                    "longitude": fmt_coord(lng),
                    "alamat": cell_str(rec.get("Alamat")),
                    "kabupaten": kab,
                    "kecamatan": cell_str(rec.get("Kecamatan")),
                    "desa": cell_str(rec.get("Desa/Gampong")),
                    "kode_desa": "",
                    "sumber": sumber,
                    "media_url": cell_str(rec.get("Media")),
                    "coord_quality": quality,
                    "approx": "true" if quality != "ok" else "false",
                }
            )
        kept, _dropped = dedup_points(
            [{**r, "verified": "false", "source_row": r["nama"]} for r in out],
            "nama",
        )
        return [
            {k: v for k, v in row.items() if k not in {"verified", "source_row"}}
            for row in kept
        ]

    jalan = clean_asset("Jalanan Rusak", "tilikan_jalan")
    jembatan = clean_asset("Jembatan Rusak", "tilikan_jembatan")

    pol_h, pol_body = sheet_rows(RAW / "tilikan.xlsx", "Polri")
    polsek: list[dict] = []
    for row in pol_body:
        if not nonempty(row, 0):
            continue
        rec = row_dict(pol_h, row)
        lat, lng, quality = classify_coord(rec.get("latitude"), rec.get("longitude"))
        kab = normalize_kab(cell_str(rec.get("kabupaten")))
        nama = cell_str(rec.get("nama"))
        polsek.append(
            {
                "nama": nama,
                "latitude": fmt_coord(lat),
                "longitude": fmt_coord(lng),
                "alamat": cell_str(rec.get("alamat")),
                "kabupaten": kab,
                "kecamatan": cell_str(rec.get("kecamatan")),
                "desa": cell_str(rec.get("kelurahan")),
                "jenis_kantor": cell_str(rec.get("jenis_kantor")),
                "skala_kerusakan": cell_str(rec.get("skala_kerusakan")),
                "status_operasional": cell_str(rec.get("status_operasional")),
                "sumber": "tilikan_polri",
                "coord_quality": quality,
                "approx": "true" if quality != "ok" else "false",
            }
        )
        telepon = cell_str(rec.get("nomor_telepon"))
        if telepon and telepon not in {"62", "0"}:
            kontak.append(
                {
                    "dataset": "tilikan_polri",
                    "source_row": nama,
                    "role": "polsek",
                    "nama": nama,
                    "telepon": telepon,
                    "kabupaten": kab,
                    "desa": cell_str(rec.get("kelurahan")),
                }
            )

    titik_fields = [
        "source_row",
        "nama",
        "latitude",
        "longitude",
        "alamat",
        "kabupaten",
        "kecamatan",
        "desa",
        "kode_desa",
        "bentuk",
        "status_aktif",
        "verified",
        "sumber",
        "tanggal_update",
        "coord_quality",
        "approx",
    ]
    asset_fields = [
        "nama",
        "jenis",
        "latitude",
        "longitude",
        "alamat",
        "kabupaten",
        "kecamatan",
        "desa",
        "kode_desa",
        "sumber",
        "media_url",
        "coord_quality",
        "approx",
    ]
    write_csv(PUBLIC / "tilikan" / "pengungsian_padal.csv", titik_fields, padal)
    write_csv(
        PUBLIC / "tilikan" / "pengungsian_padal_kaji.csv",
        [
            "source_row",
            "kabupaten",
            "desa",
            "jumlah_kk",
            "jiwa_total",
            "laki_laki",
            "perempuan",
            "anak",
        ],
        padal_kaji,
    )
    write_csv(PUBLIC / "tilikan" / "jalan_rusak.csv", asset_fields, jalan)
    write_csv(PUBLIC / "tilikan" / "jembatan.csv", asset_fields, jembatan)
    write_csv(
        PUBLIC / "tilikan" / "polsek.csv",
        [
            "nama",
            "latitude",
            "longitude",
            "alamat",
            "kabupaten",
            "kecamatan",
            "desa",
            "jenis_kantor",
            "skala_kerusakan",
            "status_operasional",
            "sumber",
            "coord_quality",
            "approx",
        ],
        polsek,
    )
    write_csv(
        PUBLIC / "tilikan" / "dedup-log.csv",
        titik_fields + ["dedup_of"],
        padal_dropped,
    )
    write_csv(
        PRIVATE / "tilikan" / "kontak_internal.csv",
        ["dataset", "source_row", "role", "nama", "telepon", "kabupaten", "desa"],
        kontak,
    )
    return {
        "padal": padal,
        "jalan": jalan,
        "jembatan": jembatan,
        "polsek": polsek,
        "kontak": len(kontak),
        "dedup_dropped": len(padal_dropped),
    }


def fasum_quarantine_stats() -> dict:
    def coord_hist(path: Path, sheet: str, lat_key: str, lng_key: str) -> dict:
        headers, body = sheet_rows(path, sheet)
        qualities = Counter()
        kabs = Counter()
        nonempty_n = 0
        for row in body:
            rec = row_dict(headers, row)
            name = cell_str(
                rec.get("Nama Fasilitas") or rec.get("Nama Fasilitas Kesehatan")
            )
            if not name and not cell_str(rec.get(lat_key)) and not cell_str(rec.get(lng_key)):
                continue
            nonempty_n += 1
            _lat, _lng, quality = classify_coord(rec.get(lat_key), rec.get(lng_key))
            qualities[quality] += 1
            kab = normalize_kab(cell_str(rec.get("Kabupaten/Kota")))
            kabs[kab or "(unmapped)"] += 1
        return {
            "rows": nonempty_n,
            "quality": dict(qualities),
            "kabupaten": dict(kabs),
            "kab_count": len([k for k in kabs if k != "(unmapped)"]),
        }

    return {
        "kantor": coord_hist(RAW / "kantor-pemerintah.xlsx", "Sheet1", "Latitude", "Longitude"),
        "faskes_curated": coord_hist(RAW / "faskes.xlsx", "05032026", "Latitude", "Longitude"),
        "faskes_raw": coord_hist(RAW / "faskes.xlsx", "RAW", "Latitude", "Longitude"),
    }


def write_quarantine(stats: dict) -> None:
    kantor = stats["kantor"]
    curated = stats["faskes_curated"]
    raw = stats["faskes_raw"]
    text = f"""# Quarantine — dirty fasum sheets

**Do not ingest. Do not overwrite `facGov` / `facHealth`.**

These workbooks stay in `.data/drive-clean/_raw/` for audit only.

## Kantor pemerintah

- Original: `1goz7f3Oez5bN5rd2avaNEiYmbpOHgVMLn9kqu-OByiY`
- Working copy: `1riRCwB-JGFL07OajkhA-w59jZv4cc96gTfjc5gJJxtw`
- Rows with a name or coordinate: {kantor['rows']}
- Coord quality: `{kantor['quality']}`
- Distinct mapped kabupaten: {kantor['kab_count']} (DB `facGov` already has 273 points / 7 kab and is cleaner)
- Typical failure: longitude stored as a truncated integer (`968811072`), not a decimal degree

A missing-decimal guess would invent GPS. Repo policy (`flag-truncated-coords.js`) is to flag, not invent. If the 16 missing kab need coverage, collect new GPS that already passes the quality gate.

## Faskes

- Original: `1aKKoxhsrSil2K9dq2ioIfzD5o44f8nFGBLJjJsFX3w8` (no extra Drive copy)
- Tab `05032026` (curated label): {curated['rows']} nonempty, quality `{curated['quality']}`, {curated['kab_count']} kab
- Tab `RAW`: {raw['rows']} nonempty, quality `{raw['quality']}`
- Live `facHealth` already has 255 points, all with lat/lng

`RAW` and the integer-latitude cells are not repairable without another coordinate source. The curated tab is still **not** a replace source for `facHealth`.

## Also unused from the tilikan workbook

Starlink, helipad, posko, rumah ibadah, and the two kantor pemerintah tabs stay unused. `tendPoints`, `poskos`, helipad, and Starlink stay retired.
"""
    path = PUBLIC / "fasum" / "QUARANTINE.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def write_quality_report(peng: dict, til: dict, fasum: dict, pii_hits: list[str], comma_hits: list[str]) -> dict:
    tables = {
        "pengungsian_titik": gate_stats(peng["titik"], True),
        "pengungsian_haifa": gate_stats(peng["haifa"], True),
        "tilikan_padal": gate_stats(til["padal"], True),
        "tilikan_jalan": gate_stats(til["jalan"], False),
        "tilikan_jembatan": gate_stats(til["jembatan"], False),
        "tilikan_polsek": gate_stats(til["polsek"], False),
    }
    primary = tables["pengungsian_titik"]
    assets_ok = all(
        tables[key]["bbox_pct"] >= 95 and tables[key]["kab_ok"]
        for key in ("tilikan_jalan", "tilikan_jembatan")
    )
    peng_ok = (
        primary["bbox_pct"] >= 95
        and primary["kab_ok"]
        and primary["empty_verified"] == 0
        and not pii_hits
        and not comma_hits
    )
    report = {
        "tables": tables,
        "pii_hits": pii_hits,
        "comma_hits": comma_hits,
        "pengungsian_pass": peng_ok,
        "tilikan_assets_pass": assets_ok,
        "fase2_ready": peng_ok and assets_ok and not pii_hits and not comma_hits,
        "notes": {
            "dedup_dropped_diskominfo": peng["dedup_dropped"],
            "dedup_dropped_haifa": peng["haifa_dedup_dropped"],
            "overlap_diskominfo_haifa": peng["overlap"],
            "haifa_not_merged": True,
            "polsek_not_ingestible": tables["tilikan_polsek"]["bbox_pct"] < 95
            or tables["tilikan_polsek"]["point_rows"]
            < 0.95 * tables["tilikan_polsek"]["rows"],
            "fasum_quarantined": True,
        },
    }

    def line(name: str, stats: dict, verified: bool) -> str:
        extra = (
            f", verified empty {stats['empty_verified']}"
            if verified
            else ""
        )
        unknown = ", ".join(sorted(set(stats["unknown_kab"]))) or "—"
        return (
            f"| `{name}` | {stats['rows']} | {stats['point_rows']} | "
            f"{stats['in_bbox']} | {stats['bbox_pct']:.1f}% | "
            f"{'yes' if stats['kab_ok'] else 'no'} "
            f"(empty {stats['empty_kab']}, unknown {unknown}){extra} |"
        )

    md = f"""# Quality gate — Drive clean

Generated by `scripts/drive-clean-sheets.py`. No database writes.

## Gates

1. ≥95% of parsed point rows inside Aceh bbox (lng 94.5–99.5, lat 2.0–6.5)
2. 0 phone / personal-name columns in public CSVs
3. 0 comma-formatted lon/lat in public CSVs
4. Kabupaten 100% in the 23 `profil_desa` names
5. Pengungsian `verified` filled (`true` or `false`, never empty)

Out-of-bbox rows are kept with `coord_quality=out_of_bbox`. Truncated integers are kept as rows with empty lat/lng and `coord_quality=truncated_integer` (decimals are not invented).

## Results

| Table | rows | parsed points | in bbox | bbox % | kabupaten |
|---|---:|---:|---:|---:|---|
{line("pengungsian/titik.csv", tables["pengungsian_titik"], True)}
{line("pengungsian/haifa_titik.csv", tables["pengungsian_haifa"], True)}
{line("tilikan/pengungsian_padal.csv", tables["tilikan_padal"], True)}
{line("tilikan/jalan_rusak.csv", tables["tilikan_jalan"], False)}
{line("tilikan/jembatan.csv", tables["tilikan_jembatan"], False)}
{line("tilikan/polsek.csv", tables["tilikan_polsek"], False)}

- Public PII hits: {len(pii_hits)}{" — " + "; ".join(pii_hits[:8]) if pii_hits else ""}
- Comma lon/lat hits: {len(comma_hits)}
- Diskominfo dedup dropped: {peng["dedup_dropped"]}
- Haifa dedup dropped: {peng["haifa_dedup_dropped"]} (Haifa was **not** merged into `titik.csv`)
- Coordinate overlap Diskominfo ∩ Haifa: {peng["overlap"]}
- Private contact rows: pengungsian {peng["kontak"]}, tilikan {til["kontak"]}

**Diskominfo pengungsian + tilikan jalan/jembatan:** {"PASS" if peng_ok and assets_ok else "FAIL"} for a later SIK dry-run.

**Not ready:** Haifa (unverified operational dump, merge only after a coordinator review of `overlap_diskominfo_haifa.csv`); tilikan polsek ({tables["tilikan_polsek"]["in_bbox"]}/{tables["tilikan_polsek"]["rows"]} rows in bbox — most coordinates are truncated integers); all fasum sheets in `fasum/QUARANTINE.md`.

## Fase 2 ingest design (not implemented)

Do this only after the Diskominfo `titik.csv` gate stays green and a coordinator reviews the files.

1. Dry-run parser, same shape as [`scripts/lib/profil-sheet.mjs`](../../scripts/lib/profil-sheet.mjs) / [`scripts/update-profil-from-sheet.mjs`](../../scripts/update-profil-from-sheet.mjs): read `data/drive-clean/pengungsian/titik.csv`, refuse any row whose `coord_quality` is not `ok`, refuse name-only desa joins, join `kode_desa` only when it is already 10 digits (this export leaves it empty).
2. Map `titik.csv` → `tempat_pengungsian` (SIK master): `nama`, `alamat`, `kabupaten`, `kecamatan`, `desa`, `latitude`, `longitude`, `jenis_pos` from `bentuk` when it is `terkonsentrasi` / `tidak_terkonsentrasi`. Staff-only. **Do not** upsert `marker_features`. **Do not** re-enable the retired `tendPoints` toolbar layer (`20260922_retire_tend_points.sql`). `loadPengungsianFeatures` still labels overlays `tendPoints` — leave that product decision alone.
3. Map `kaji_agregat.csv` → `pengungsian_kaji` only after a real `kejadian_operasi` id exists (`unique (kejadian_id, tempat_pengungsian_id, tanggal)`). `jiwa` / `rentan` JSON from the count columns. No personal names.
4. `kontak_internal.csv` may later fill `pic_nama` / `pic_kontak` on the staff table. Never copy those fields into `marker_features.properties` or a public GeoJSON.
5. Refresh `profil_desa` only with `node scripts/update-profil-from-sheet.mjs` (dry-run), then `--apply` after coordinator review. Not part of pengungsian ingest.
6. Schema tweaks: `execute_sql` first, `supabase db pull` only if DDL landed, RLS on every new table.
7. Still quarantined: kantor pemerintah, faskes RAW, tilikan polsek, Form Tanggapi (CRM spec), R3P per-kab PDF.

Fasum quarantine snapshot: kantor `{fasum["kantor"]["quality"]}`; faskes curated `{fasum["faskes_curated"]["quality"]}`; faskes RAW `{fasum["faskes_raw"]["quality"]}`.
"""
    (PUBLIC / "quality-gate-report.md").write_text(md, encoding="utf-8")
    (PUBLIC / "quality-gate.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return report


def main() -> None:
    if not (RAW / "pengungsian.xlsx").exists():
        raise SystemExit(f"Missing raw copies in {RAW}")
    PUBLIC.mkdir(parents=True, exist_ok=True)
    PRIVATE.mkdir(parents=True, exist_ok=True)
    peng = clean_pengungsian()
    til = clean_tilikan()
    fasum = fasum_quarantine_stats()
    write_quarantine(fasum)
    public_csvs = [
        PUBLIC / "pengungsian" / "titik.csv",
        PUBLIC / "pengungsian" / "kaji_agregat.csv",
        PUBLIC / "pengungsian" / "haifa_titik.csv",
        PUBLIC / "pengungsian" / "haifa_kaji_agregat.csv",
        PUBLIC / "tilikan" / "pengungsian_padal.csv",
        PUBLIC / "tilikan" / "pengungsian_padal_kaji.csv",
        PUBLIC / "tilikan" / "jalan_rusak.csv",
        PUBLIC / "tilikan" / "jembatan.csv",
        PUBLIC / "tilikan" / "polsek.csv",
    ]
    pii_hits: list[str] = []
    comma_hits: list[str] = []
    for path in public_csvs:
        pii_hits.extend(public_pii_hits(path))
        comma_hits.extend(comma_coord_hits(path))
    report = write_quality_report(peng, til, fasum, pii_hits, comma_hits)
    print("Wrote", PUBLIC)
    print("PII hits", len(pii_hits), "comma hits", len(comma_hits))
    print(
        "fase2_ready",
        report["fase2_ready"],
        "pengungsian_pass",
        report["pengungsian_pass"],
    )
    for name, stats in report["tables"].items():
        print(
            f"  {name}: rows={stats['rows']} points={stats['point_rows']} "
            f"bbox={stats['bbox_pct']:.1f}% kab_ok={stats['kab_ok']}"
        )


if __name__ == "__main__":
    main()
