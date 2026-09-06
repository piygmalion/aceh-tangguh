#!/usr/bin/env python3
"""Capture public page screenshots for the design chapter."""

from __future__ import annotations

from pathlib import Path

from playwright.sync_api import sync_playwright

OUT = Path(__file__).resolve().parent / "figures" / "tangkapan"
BASE = "http://localhost:3130"
PAGES = [
    ("beranda-desktop", "/id", 1280, 800),
    ("beranda-mobile", "/id", 390, 844),
    ("peta", "/id/peta", 1280, 800),
    ("destana", "/id/destana", 1280, 800),
    ("lapor", "/id/lapor", 1280, 800),
    ("lapor-kejadian", "/id/lapor/kejadian", 1280, 800),
    ("data-bencana", "/id/data-bencana", 1280, 800),
    ("nomor-penting", "/id/nomor-penting", 1280, 800),
    ("pelatihan", "/id/pelatihan", 1280, 800),
    ("mitra", "/id/mitra", 1280, 800),
    ("publikasi", "/id/publikasi", 1280, 800),
    ("admin-login", "/id/admin/login", 1280, 800),
]


def capture(page, name: str, path: str, w: int, h: int) -> None:
    page.set_viewport_size({"width": w, "height": h})
    url = BASE + path
    try:
        page.goto(url, wait_until="commit", timeout=45000)
        page.wait_for_timeout(3500)
    except Exception as exc:
        print("WARN nav", name, exc)
        page.wait_for_timeout(1500)
    dest = OUT / f"{name}.png"
    try:
        page.screenshot(path=str(dest), full_page=False, timeout=8000, animations="disabled")
        print("OK", dest.name, dest.stat().st_size)
    except Exception as exc:
        print("SKIP screenshot", name, exc)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    skip_hang = {"destana"}
    remaining = [
        item
        for item in PAGES
        if not (OUT / f"{item[0]}.png").is_file() and item[0] not in skip_hang
    ]
    if not remaining:
        print("Semua cuplikan sudah ada")
        return
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        page = browser.new_page(device_scale_factor=1)
        for name, path, w, h in remaining:
            capture(page, name, path, w, h)
        browser.close()


if __name__ == "__main__":
    main()
