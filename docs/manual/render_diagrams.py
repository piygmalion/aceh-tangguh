#!/usr/bin/env python3
"""Render technical architecture PNGs for the Aceh Tangguh manual."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parent / "figures" / "teknis"
W, H = 1680, 980
BG = (248, 250, 250)
INK = (28, 36, 40)
MUTED = (90, 100, 108)
TEAL = (31, 78, 95)
TEAL_LT = (226, 236, 239)
ORANGE = (176, 86, 36)
ORANGE_LT = (252, 234, 220)
GREEN = (39, 98, 74)
GREEN_LT = (220, 236, 228)
GOLD = (150, 116, 42)
GOLD_LT = (244, 235, 208)
SLATE = (72, 82, 90)
SLATE_LT = (232, 235, 238)
ROSE = (132, 52, 56)
ROSE_LT = (248, 230, 230)
WHITE = (255, 255, 255)

FONT_DIR = Path(r"C:\Windows\Fonts")


def _font(candidates: list[str], size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    for name in candidates:
        path = FONT_DIR / name
        if path.is_file():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


F_TITLE = _font(["segoeuib.ttf", "calibrib.ttf", "arialbd.ttf"], 28)
F_SUB = _font(["segoeui.ttf", "calibri.ttf", "arial.ttf"], 16)
F_H = _font(["segoeuib.ttf", "calibrib.ttf", "arialbd.ttf"], 15)
F_B = _font(["segoeui.ttf", "calibri.ttf", "arial.ttf"], 14)
F_S = _font(["segoeui.ttf", "calibri.ttf", "arial.ttf"], 12)


def canvas(title: str, subtitle: str = "") -> tuple[Image.Image, ImageDraw.ImageDraw]:
    im = Image.new("RGB", (W, H), BG)
    dr = ImageDraw.Draw(im)
    dr.rectangle((0, 0, W, 72), fill=TEAL)
    dr.text((36, 16), title, font=F_TITLE, fill=WHITE)
    if subtitle:
        dr.text((36, 48), subtitle, font=F_S, fill=TEAL_LT)
    return im, dr


def wrap(draw: ImageDraw.ImageDraw, text: str, font, max_w: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    cur = ""
    for word in words:
        trial = f"{cur} {word}".strip()
        if draw.textlength(trial, font=font) <= max_w:
            cur = trial
        else:
            if cur:
                lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines or [""]


def box(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int, int, int],
    title: str,
    lines: list[str] | None = None,
    fill: tuple[int, int, int] = TEAL_LT,
    outline: tuple[int, int, int] = TEAL,
    title_fill: tuple[int, int, int] | None = None,
) -> None:
    x0, y0, x1, y1 = xy
    draw.rounded_rectangle(xy, radius=10, fill=fill, outline=outline, width=2)
    tw = x1 - x0 - 20
    title_lines = wrap(draw, title, F_H, tw)
    y = y0 + 10
    tfill = title_fill or outline
    for tl in title_lines[:3]:
        draw.text((x0 + 10, y), tl, font=F_H, fill=tfill)
        y += 18
    if lines:
        y += 4
        for raw in lines:
            for wl in wrap(draw, raw, F_S, tw)[:4]:
                draw.text((x0 + 10, y), wl, font=F_S, fill=INK)
                y += 16


def arrow(draw: ImageDraw.ImageDraw, a: tuple[int, int], b: tuple[int, int], color=TEAL) -> None:
    draw.line((a, b), fill=color, width=3)
    x0, y0 = a
    x1, y1 = b
    import math

    ang = math.atan2(y1 - y0, x1 - x0)
    size = 10
    p1 = (x1 - size * math.cos(ang - 0.45), y1 - size * math.sin(ang - 0.45))
    p2 = (x1 - size * math.cos(ang + 0.45), y1 - size * math.sin(ang + 0.45))
    draw.polygon([b, p1, p2], fill=color)


def h_arrows(draw: ImageDraw.ImageDraw, boxes: list[tuple[int, int, int, int]], y: int | None = None) -> None:
    for i in range(len(boxes) - 1):
        a = boxes[i]
        b = boxes[i + 1]
        mid_y = y if y is not None else (a[1] + a[3]) // 2
        arrow(draw, (a[2] + 2, mid_y), (b[0] - 2, mid_y))


def v_arrow(draw: ImageDraw.ImageDraw, top: tuple[int, int, int, int], bottom: tuple[int, int, int, int]) -> None:
    arrow(draw, ((top[0] + top[2]) // 2, top[3] + 2), ((bottom[0] + bottom[2]) // 2, bottom[1] - 2))


def lane(draw: ImageDraw.ImageDraw, xy: tuple[int, int, int, int], label: str, fill: tuple[int, int, int]) -> None:
    draw.rounded_rectangle(xy, radius=14, fill=fill, outline=None)
    draw.text((xy[0] + 16, xy[1] + 10), label, font=F_H, fill=MUTED)


def save(im: Image.Image, name: str) -> Path:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    im.save(path, "PNG")
    return path


def fig_01() -> None:
    im, dr = canvas(
        "1. Arsitektur tingkat tinggi Aceh Tangguh",
        "Next.js + Supabase + cron  ·  jalur warga terpisah dari staf  ·  sumber resmi tidak diganti",
    )
    lane(dr, (28, 100, 1650, 250), "Sumber resmi (langganan, bukan saingan nasional)", TEAL_LT)
    srcs = [
        (48, 140, 280, 230, "BMKG", ["TEWS, cuaca, maritim"]),
        (300, 140, 532, 230, "MAGMA / Sipongi", ["Gempa vulkanik, hotspot"]),
        (552, 140, 784, 230, "Tatonas", ["Pos hidrologi Aceh", "DATA-4 tertahan"]),
        (804, 140, 1036, 230, "BNPB DIBI / InaRISK", ["GET/Superset; jangan POST nasional"]),
        (1056, 140, 1288, 230, "Sheet / Drive", ["Profil desa, marker"]),
        (1308, 140, 1628, 230, "Fixture disk", ["GeoJSON + PMTiles"]),
    ]
    for x0, y0, x1, y1, t, ls in srcs:
        box(dr, (x0, y0, x1, y1), t, ls, WHITE, TEAL)

    lane(dr, (28, 270, 820, 560), "Runtime Next.js (Vercel)", GREEN_LT)
    box(dr, (48, 310, 400, 430), "Publik /id/*", ["Beranda, peta, Destana,", "lapor, pelatihan, mitra"], WHITE, GREEN)
    box(dr, (420, 310, 800, 430), "Staf /id/admin/*", ["SIK, moderasi, SDB,", "staf 23 kab"], WHITE, GREEN)
    box(dr, (48, 450, 400, 540), "API rute", ["/api/overlay, /api/laporan,", "/api/sik, /api/weather"], WHITE, GREEN)
    box(dr, (420, 450, 800, 540), "Cron Bearer", ["POST overlay-live,", "cuaca, laporan WA"], WHITE, ORANGE, ORANGE)

    lane(dr, (850, 270, 1650, 560), "Data & identitas", GOLD_LT)
    box(dr, (870, 310, 1240, 430), "Supabase Postgres + RLS", ["Domain JSON, overlay_live,", "laporan, SIK, Destana"], WHITE, GOLD)
    box(dr, (1260, 310, 1630, 430), "Auth staf", ["admin_profiles,", "fail-closed kab"], WHITE, GOLD)
    box(dr, (870, 450, 1240, 540), "Upstash Redis", ["Rate limit POST publik"], WHITE, SLATE, SLATE)
    box(dr, (1260, 450, 1630, 540), "GitHub Actions", ["15 mnt overlay; cuaca; DIBI"], WHITE, SLATE, SLATE)

    box(dr, (28, 590, 820, 760), "Warga", ["Lapor kejadian/penanganan → Zod + rate limit → PII terenkripsi → moderasi kab → peta jika lolos"], GREEN_LT, GREEN)
    box(dr, (850, 590, 1650, 760), "Staf / operator", ["Konsol SIK scoped; cron menulis overlay; GET publik hanya baca. Jangan mengarang Tatonas/KRB/korban."], ORANGE_LT, ORANGE)
    arrow(dr, (434, 560), (434, 590))
    arrow(dr, (1250, 560), (1250, 590))
    dr.text((36, 800), "Kontrak: README.md, src/lib/data-sources.ts, docs/vercel.md, security/attack-surface.md", font=F_S, fill=MUTED)
    save(im, "01-arsitektur-tinggi.png")


def fig_02() -> None:
    im, dr = canvas(
        "2. Peta publik — alur layer",
        "Fixture statis vs overlay live  ·  GET /api/overlay/[key] hanya baca",
    )
    box(dr, (40, 120, 360, 280), "Fixture statis", ["public/fixtures/overlays/*", "GET /api/overlay/static/[key]", "Pelabuhan, perairan, patahan"], TEAL_LT, TEAL)
    box(dr, (40, 320, 360, 480), "Cron live", ["POST /api/cron/overlay-live", "Bearer OVERLAY_CRON_SECRET", "15 menit (Actions)"], ORANGE_LT, ORANGE)
    box(dr, (420, 220, 780, 400), "Supabase", ["overlay_live_features", "overlay_live_refresh", "maritime_forecast_cache"], GOLD_LT, GOLD)
    box(dr, (840, 160, 1220, 340), "GET /api/overlay/[key]", ["Kunci live: bmkgQuakes,", "magmaQuakes, magmaVolcanoes,", "sipongiHotspots, tatonasStations"], GREEN_LT, GREEN)
    box(dr, (840, 380, 1220, 540), "Hook peta", ["Tabel AN-19; bukan path live-only lama", "src/hooks + MapOverlays"], GREEN_LT, GREEN)
    box(dr, (1280, 220, 1640, 480), "Peta /id/peta", ["Marker + ringkasan", "/api/layers/markers", "Kosong sah ≠ 503"], TEAL_LT, TEAL)
    arrow(dr, (360, 200), (420, 300))
    arrow(dr, (360, 400), (420, 320))
    arrow(dr, (780, 310), (840, 250))
    arrow(dr, (780, 330), (840, 450))
    arrow(dr, (1220, 260), (1280, 320))
    arrow(dr, (1220, 460), (1280, 360))
    dr.text((40, 600), "Jika sumber gagal: 503, bukan FeatureCollection kosong. Kontrak BE-8 / AN-5. src/lib/overlay-live.ts, src/lib/overlay-layers.ts", font=F_S, fill=MUTED)
    save(im, "02-peta-overlay.png")


def fig_03() -> None:
    im, dr = canvas(
        "3. Sinyal → calon → kejadian operasi",
        "Overlay persist dapat menelurkan calon; staf menerima atau menolak",
    )
    steps = [
        (40, 200, 320, 420, "1. Overlay live", ["Refresh cron menulis", "fitur + ledger"], ORANGE_LT, ORANGE),
        (380, 200, 680, 420, "2. Sync calon", ["src/lib/overlay-calon.ts", "overlay_calon_kejadian", "Tanpa wilayah: kab tidak lihat"], GOLD_LT, GOLD),
        (740, 200, 1060, 420, "3. UI staf", ["/id/admin/sik/kejadian/calon", "Terima / tolak (FE-8)"], GREEN_LT, GREEN),
        (1120, 200, 1460, 420, "4. Kejadian operasi", ["kejadian_operasi + fase", "Bukan angka korban dikarang"], TEAL_LT, TEAL),
        (1500, 200, 1640, 420, "Tolak", ["Tetap tercatat", "tidak jadi ops"], ROSE_LT, ROSE),
    ]
    for x0, y0, x1, y1, t, ls, f, o in steps[:-1]:
        box(dr, (x0, y0, x1, y1), t, ls, f, o)
    box(dr, steps[-1][:4], steps[-1][4], steps[-1][5], steps[-1][6], steps[-1][7])
    h_arrows(dr, [s[:4] for s in steps[:4]])
    arrow(dr, (1060, 250), (1500, 250), ROSE)
    dr.text((40, 520), "Kontrak AN-4, AN-6, BE-6, FE-8. Jangan membuka calon overlay tanpa naskah. Kab fail-closed (AN-20).", font=F_S, fill=MUTED)
    save(im, "03-sinyal-calon-kejadian.png")


def fig_04() -> None:
    im, dr = canvas(
        "4. Laporan warga → moderasi → peta",
        "POST publik terbatasi  ·  PII terenkripsi  ·  saring per kabupaten",
    )
    boxes = [
        (40, 180, 300, 380, "Warga", ["POST /api/laporan/kejadian", "atau /penanganan", "Upload: EXIF dihapus"], GREEN_LT, GREEN),
        (340, 180, 640, 380, "Guard", ["Zod + guardPublicPost", "Upstash wajib di produksi", "tanpa Redis → 503"], SLATE_LT, SLATE),
        (680, 180, 1000, 380, "Tulis service role", ["laporan_* ; PII dienkripsi", "LAPORAN_PII_KEY", "bukan NEXT_PUBLIC"], GOLD_LT, GOLD),
        (1040, 180, 1340, 380, "Moderasi staf", ["GET/PATCH scoped kab", "Reports warisan 403 kab", "G17 / BE-18"], ORANGE_LT, ORANGE),
        (1380, 180, 1640, 380, "Peta", ["GET /api/laporan/peta", "hanya baris lolos", "tanpa pelapor"], TEAL_LT, TEAL),
    ]
    for x0, y0, x1, y1, t, ls, f, o in boxes:
        box(dr, (x0, y0, x1, y1), t, ls, f, o)
    h_arrows(dr, [b[:4] for b in boxes])
    dr.text((40, 460), "Kontrak: docs/laporan-production.md, src/lib/laporan/, src/lib/sik/laporan-scope.ts. Jangan menaruh service role di browser.", font=F_S, fill=MUTED)
    save(im, "04-laporan-moderasi.png")


def fig_05() -> None:
    im, dr = canvas(
        "5. Siklus SIK kejadian, fase, dan KIB",
        "Operasi staf  ·  dampak PII hanya is_ops()  ·  cetak KIB",
    )
    ring = [
        (200, 160, 520, 320, "Buat kejadian", ["/api/sik/kejadian", "/admin/sik/kejadian/baru"]),
        (620, 160, 980, 320, "Fase dinamis/statis", ["PATCH .../fase", "Juklak Lampiran I"]),
        (1080, 160, 1440, 320, "Dampak / korban", [".../dampak  ·  is_ops()", "bukan GRANT anon"]),
        (620, 420, 980, 600, "Validasi SDB + paket", [".../validasi  ·  sdb-paket"]),
        (200, 420, 520, 600, "Cetak KIB", ["/sik/kejadian/[id]/cetak", "header KIB + locale staf"]),
        (1080, 420, 1440, 600, "Peringatan dinamis", ["GET banner staf", "kunci statis + dinamis"]),
    ]
    for x0, y0, x1, y1, t, ls in ring:
        box(dr, (x0, y0, x1, y1), t, ls, TEAL_LT, TEAL)
    arrow(dr, (520, 240), (620, 240))
    arrow(dr, (980, 240), (1080, 240))
    arrow(dr, (1260, 320), (1260, 420))
    arrow(dr, (1080, 510), (980, 510))
    arrow(dr, (620, 510), (520, 510))
    arrow(dr, (360, 420), (360, 320))
    dr.text((40, 680), "Kontrak: src/app/api/sik/kejadian/**, FE-11, AN-10. Jangan meni18n-kan tanggal dengan toLocaleString tetap id-ID.", font=F_S, fill=MUTED)
    save(im, "05-siklus-sik-kib.png")


def fig_06() -> None:
    im, dr = canvas(
        "6. Matriks otorisasi staf (ringkas)",
        "Fail-closed kabupaten  ·  PII bukan hak default  ·  bukan org-chart nama orang",
    )
    headers = ["Peran", "SIK kejadian", "Laporan", "Destana", "SDB", "PII dampak"]
    rows = [
        ["admin_provinsi / super_admin", "Provinsi", "Semua", "Semua", "Semua", "Jika is_ops()"],
        ["admin_kabkota + profil", "Filter kab", "Filter kab", "Scoped", "Scoped", "Jika is_ops()"],
        ["admin_kabkota tanpa profil", "Ditolak", "Ditolak", "Ditolak", "Ditolak", "Ditolak"],
        ["admin_desa / penilai_pkd", "Terbatas", "Tidak", "Instrumen", "Tidak", "Tidak"],
        ["authenticated biasa", "Tidak", "Tidak", "Tidak", "Tidak", "Tidak"],
    ]
    cols = [280, 230, 220, 220, 200, 250]
    x0, y0 = 40, 140
    hrow = 48
    x = x0
    for i, h in enumerate(headers):
        box(dr, (x, y0, x + cols[i] - 8, y0 + hrow), h, None, TEAL, TEAL, WHITE)
        # title on teal needs white - box uses outline as title_fill if set
        x += cols[i]
    # redraw header with white text
    dr.rectangle((x0, y0, x0 + sum(cols) - 8, y0 + hrow), fill=TEAL)
    x = x0
    for i, h in enumerate(headers):
        dr.text((x + 10, y0 + 14), h, font=F_H, fill=WHITE)
        x += cols[i]
    for r, row in enumerate(rows):
        y = y0 + hrow + r * 70
        fill = ROSE_LT if "tanpa profil" in row[0] or row[0].startswith("authenticated") else WHITE
        x = x0
        for i, cell in enumerate(row):
            box(dr, (x, y, x + cols[i] - 8, y + 62), cell, None, fill, TEAL)
            x += cols[i]
    dr.text((40, 620), "Kontrak AN-20 / BE-17 / AN-21 / AN-22. Operator wajib mengisi profil kab sebelum deploy. Jangan merevoke is_staff / is_ops dari tiket ini.", font=F_S, fill=MUTED)
    save(im, "06-matriks-peran.png")


def fig_07() -> None:
    im, dr = canvas(
        "7. Gateway /api/sik/resource",
        "RESOURCE_SCOPE_MODE menyaring list/read/write  ·  satu pintu, banyak tabel",
    )
    box(dr, (40, 160, 400, 360), "Klien staf", ["AdminShell → fetch resource", "JWT sesi, bukan anon"], GREEN_LT, GREEN)
    box(dr, (460, 160, 980, 360), "GET/POST/PATCH /api/sik/resource", ["src/app/api/sik/resource/route.ts", "src/lib/sik/resource-scope.ts"], TEAL_LT, TEAL)
    modes = [
        (1040, 120, 1400, 230, "row_kab", ["Baris milik kabupaten pemanggil"]),
        (1440, 120, 1640, 230, "kejadian", ["Lewat kejadian_operasi"]),
        (1040, 250, 1400, 360, "provincial", ["Hanya peran provinsi"]),
        (1440, 250, 1640, 360, "via_rehab", ["Rantai rehab-rekon"]),
    ]
    for x0, y0, x1, y1, t, ls in modes:
        box(dr, (x0, y0, x1, y1), t, ls, GOLD_LT, GOLD)
    box(dr, (40, 420, 1640, 620), "Sumber contoh", ["instansi, pengungsian, korban, personil, nomorPenting, pelatihan, disabilitas, rehab — peta RESOURCES di route. Calon overlay tanpa wilayah tersembunyi dari kab (efek disengaja)."], SLATE_LT, SLATE)
    arrow(dr, (400, 260), (460, 260))
    arrow(dr, (980, 220), (1040, 180))
    arrow(dr, (980, 280), (1040, 300))
    save(im, "07-gateway-sik-resource.png")


def fig_08() -> None:
    im, dr = canvas(
        "8. SDB daerah — katalog, jadwal, paket",
        "Satu Data Bencana tingkat daerah  ·  bukan POST ke data.bnpb.go.id",
    )
    box(dr, (60, 180, 420, 400), "Tabel", ["sdb_katalog", "sdb_jadwal_kirim", "sdb_validasi"], GOLD_LT, GOLD)
    box(dr, (480, 180, 900, 400), "API", ["/api/sik/sdb/katalog", "/api/sik/sdb/jadwal", "kejadian .../sdb-paket"], TEAL_LT, TEAL)
    box(dr, (960, 180, 1360, 400), "UI staf", ["/id/admin/sik/sdb", "Banner + checklist kunci", "FE-9, BE-10"], GREEN_LT, GREEN)
    box(dr, (1420, 180, 1640, 400), "Batas", ["Jangan POST nasional", "Jangan buka P2 Juklak"], ROSE_LT, ROSE)
    h_arrows(dr, [(60, 180, 420, 400), (480, 180, 900, 400), (960, 180, 1360, 400), (1420, 180, 1640, 400)])
    dr.text((60, 480), "Kontrak G5: DATA-5, BE-9, BE-10, FE-9. src/lib/sik/sdb.ts. Paket ekspor per kejadian, bukan unggah nasional.", font=F_S, fill=MUTED)
    save(im, "08-sdb.png")


def fig_09() -> None:
    im, dr = canvas(
        "9. Destana — instrumen SI dan 17 aktivitas",
        "Rumus PKD tidak diubah di gelombang 9  ·  scoped desa",
    )
    box(dr, (50, 180, 400, 400), "Tabel", ["destana_si", "destana_aktivitas", "migrasi 20260918"], GOLD_LT, GOLD)
    box(dr, (450, 180, 860, 400), "API program", ["/api/sik/destana/program", "Helper AN-7", "Scoped, bukan tebakan skor"], TEAL_LT, TEAL)
    box(dr, (910, 160, 1280, 300), "Konsol staf", ["/id/admin/sik/destana", "Form 17 aktivitas"], GREEN_LT, GREEN)
    box(dr, (910, 320, 1280, 460), "Publik", ["/id/destana  ·  /en/destana", "i18n FE-14"], GREEN_LT, GREEN)
    box(dr, (1330, 180, 1640, 400), "Batas", ["Jangan ubah rumus PKD", "Jangan isi 4 baris null-kode"], ROSE_LT, ROSE)
    arrow(dr, (400, 290), (450, 290))
    arrow(dr, (860, 260), (910, 230))
    arrow(dr, (860, 320), (910, 380))
    arrow(dr, (1280, 290), (1330, 290))
    dr.text((50, 540), "Kontrak AN-7, DATA-6, BE-12, FE-13, AN-13. Join desa hanya kode_desa_kelurahan 10 digit.", font=F_S, fill=MUTED)
    save(im, "09-destana.png")


def fig_10() -> None:
    im, dr = canvas(
        "10. Cuaca resmi BMKG vs inovasi WeatherNext 3",
        "Dua jalur sejajar  ·  jangan digabung ke /api/weather",
    )
    box(dr, (40, 140, 820, 700), "Resmi — mesin operasional", None, GREEN_LT, GREEN)
    box(dr, (70, 200, 390, 360), "BMKG adm4", ["23 kab/kota", "src/lib/weather/bmkg.ts"], WHITE, GREEN)
    box(dr, (410, 200, 790, 360), "Open-Meteo", ["Fallback lat/lng", "bukan pengganti resmi di UI"], WHITE, GREEN)
    box(dr, (70, 400, 390, 560), "Cache + snapshot", ["weather_forecasts", "weather-snapshot.json"], WHITE, GREEN)
    box(dr, (410, 400, 790, 560), "GET /api/weather", ["/api/weather/[kab]", "Strip publik resmi"], WHITE, GREEN)
    box(dr, (860, 140, 1640, 700), "Inovasi — terpisah", None, ORANGE_LT, ORANGE)
    box(dr, (890, 200, 1270, 360), "Earth Engine WN3", ["DATA-13 ingest", "atau status unconfigured"], WHITE, ORANGE)
    box(dr, (1290, 200, 1610, 360), "Jangan", ["Jangan mengarang suhu", "Jangan reuse secret resmi"], WHITE, ROSE, ROSE)
    box(dr, (890, 400, 1270, 560), "weather_inovasi_snapshot", ["Fixture inovasi", "TTL terpisah"], WHITE, ORANGE)
    box(dr, (1290, 400, 1610, 560), "GET /api/weather/inovasi", ["Strip FE-19 terpisah", "AN-24 dikunci dulu"], WHITE, ORANGE)
    dr.text((50, 720), "Kontrak G19: AN-24, DATA-13, BE-20, FE-19, AN-25. Secret WEATHER_INOVASI_CRON_SECRET ≠ WEATHER_CRON_SECRET.", font=F_S, fill=MUTED)
    save(im, "10-cuaca-resmi-inovasi.png")


def fig_11() -> None:
    im, dr = canvas(
        "11. Cron overlay, TTL, dan purge",
        "Tulis hanya cron  ·  GET hanya baca  ·  baris expires_at < now() dihapus",
    )
    boxes = [
        (40, 200, 300, 400, "Actions 15 menit", ["overlay-live-refresh.yml", "OVERLAY_REFRESH_URL"]),
        (340, 200, 640, 400, "POST cron", ["/api/cron/overlay-live", "Bearer; 401/503"]),
        (680, 200, 1020, 400, "Persist", ["overlay_live_features", "expires_at diisi backend"]),
        (1060, 200, 1360, 400, "GET baca", ["/api/overlay/[key]", "loadOverlayLive"]),
        (1400, 200, 1640, 400, "Purge", ["purge_expired_overlay_rows()", "null expires_at tidak dihapus G1"]),
    ]
    fills = [SLATE_LT, ORANGE_LT, GOLD_LT, GREEN_LT, ROSE_LT]
    outs = [SLATE, ORANGE, GOLD, GREEN, ROSE]
    for i, (x0, y0, x1, y1, t, ls) in enumerate(boxes):
        box(dr, (x0, y0, x1, y1), t, ls, fills[i], outs[i])
    h_arrows(dr, [b[:4] for b in boxes])
    dr.text((40, 500), "Kontrak DATA-1, BE-4, BE-8, BE-14, AN-18. Jangan menulis nilai OVERLAY_CRON_SECRET. Jangan eksekusi purge sebagai anon (G11).", font=F_S, fill=MUTED)
    save(im, "11-cron-overlay-ttl.png")


def fig_12() -> None:
    im, dr = canvas(
        "12. Empat agen dan siklus tulis–baca ulang",
        "Satu tiket = satu jurnal  ·  wilayah berkas tidak bertabrakan  ·  max lima putaran",
    )
    agents = [
        (40, 140, 420, 320, "data", ["scripts/**, fixtures/**", "migrasi SQL baru"]),
        (440, 140, 820, 320, "backend", ["api/**, overlay-live,", "laporan, security, maritime"]),
        (840, 140, 1220, 320, "frontend", ["components, hooks,", "messages, [locale]"]),
        (1240, 140, 1640, 320, "analis", ["uji otorisasi, CI,", "naskah, STATUS.md"]),
    ]
    for x0, y0, x1, y1, t, ls in agents:
        box(dr, (x0, y0, x1, y1), t, ls, TEAL_LT, TEAL)
    steps = [
        "1. Tulis niat",
        "2. Baca ulang niat",
        "3. Kerjakan",
        "4. Tulis bukti",
        "5. Baca bukti vs kriteria",
        "6. Tutup + STATUS",
    ]
    x = 40
    for s in steps:
        box(dr, (x, 400, x + 250, 520), s, None, GOLD_LT, GOLD)
        x += 270
    for i in range(5):
        arrow(dr, (290 + i * 270, 460), (310 + i * 270, 460))
    dr.text((40, 580), "Jika gagal lima putaran: blocker di jurnal, berhenti. Koordinator membaca STATUS.md, bukan percakapan. Jangan commit kecuali diminta.", font=F_S, fill=MUTED)
    dr.text((40, 610), "docs/pengembangan/00-protokol.md  ·  jurnal/_template.md", font=F_S, fill=MUTED)
    save(im, "12-empat-agen-siklus.png")


def fig_13() -> None:
    im, dr = canvas(
        "13. Garis waktu gelombang 0–19 (proses)",
        "Bukan 19 tiket terpisah  ·  DATA-4 tetap menunggu naskah",
    )
    phases = [
        (40, 160, 280, 340, "G0", "Baseline review", "Filter Aceh, guard, i18n"),
        (300, 160, 560, 340, "G1", "Empat agen paralel", "TTL, 503, EXIF, uji otorisasi"),
        (580, 160, 860, 340, "G2–G4", "Overlay + calon", "Cron baca, UI terima/tolak"),
        (880, 160, 1140, 340, "G5–G8", "SDB + rapi", "Katalog, KIB, i18n detail"),
        (1160, 160, 1420, 340, "G9–G10", "Destana", "SI/17 aktivitas + i18n"),
        (1440, 160, 1640, 340, "G11–G13", "Kunci", "Staging, RPC, env"),
        (200, 400, 620, 580, "G14–G15", "Loop overlay produksi", "Cron di main + maritim"),
        (640, 400, 1060, 580, "G16–G18", "Kab + staf", "Fail-closed, moderasi, 23 slot"),
        (1080, 400, 1500, 580, "G19", "Cuaca inovasi", "WN3 terpisah dari BMKG"),
    ]
    for x0, y0, x1, y1, code, title, line in phases:
        box(dr, (x0, y0, x1, y1), f"{code}  {title}", [line], TEAL_LT, TEAL)
    box(dr, (40, 640, 1640, 760), "Tertahan", ["DATA-4 pemetaan loggerKind Tatonas = menunggu-naskah (AN-3 belum dijawab). Jangan menebak kode perangkat. Jangan POST nasional. Jangan membuka P2 Juklak."], ROSE_LT, ROSE)
    save(im, "13-gelombang-timeline.png")


def fig_14() -> None:
    im, dr = canvas(
        "14. ETL offline overlay (Ruang Kita → fixture)",
        "Discovery URL saja  ·  runtime peta tidak memanggil ruangkita.net",
    )
    boxes = [
        (40, 180, 300, 400, "Discovery", ["scrape-ruangkita-static.mjs", "URL JS hulu"]),
        (340, 180, 640, 400, "Unduh hulu", ["BMKG maritim, InaTEWS", "bukan tebakan geometri"]),
        (680, 180, 1020, 400, "Filter Aceh", ["ACEH_BBOX + istilah provinsi", "buang XB005 / non-Aceh"]),
        (1060, 180, 1360, 400, "Integritas", ["SHA-256 + featureCount", "gagal jika 0 atau drop >40%"]),
        (1400, 180, 1640, 400, "Tulis disk", ["overlays/*.geojson", "manifest.json"]),
    ]
    for x0, y0, x1, y1, t, ls in boxes:
        box(dr, (x0, y0, x1, y1), t, ls, TEAL_LT, TEAL)
    h_arrows(dr, [b[:4] for b in boxes])
    dr.text((40, 480), "scripts/lib/overlay-etl.mjs  ·  FORCE_OVERLAY_ETL=1 hanya jika dipaksa. Bbox bukan batas administrasi. docs/pengembangan/01-data.md DATA-2.", font=F_S, fill=MUTED)
    save(im, "14-etl-offline.png")


def fig_15() -> None:
    im, dr = canvas(
        "15. Refresh live (Actions → cache Supabase)",
        "Beberapa cron, secret berbeda  ·  nilai secret tidak ditulis",
    )
    box(dr, (40, 150, 360, 320), "overlay 15 menit", ["POST /api/cron/overlay-live", "plus maritim G15"], ORANGE_LT, ORANGE)
    box(dr, (40, 360, 360, 530), "cuaca ~3 jam", ["GET/POST weather refresh", "resmi ≠ inovasi"], GREEN_LT, GREEN)
    box(dr, (40, 560, 360, 720), "DIBI weekday", ["build:dibi → fixture", "Superset publik"], SLATE_LT, SLATE)
    box(dr, (460, 240, 900, 520), "Runtime Vercel", ["Validasi Bearer", "tulis cache/tabel", "bukan GitHub Pages"], TEAL_LT, TEAL)
    box(dr, (1000, 160, 1400, 360), "Tabel cache", ["overlay_live_features", "weather_forecasts", "maritime_forecast_cache"], GOLD_LT, GOLD)
    box(dr, (1000, 400, 1400, 600), "GET publik", ["Hanya baca", "503 jika tidak terkonfigurasi"], GREEN_LT, GREEN)
    box(dr, (1440, 240, 1640, 520), "Nama env", ["OVERLAY_CRON_SECRET", "WEATHER_*_SECRET", "tanpa nilai"], ROSE_LT, ROSE)
    arrow(dr, (360, 230), (460, 340))
    arrow(dr, (360, 440), (460, 380))
    arrow(dr, (360, 620), (460, 430))
    arrow(dr, (900, 340), (1000, 260))
    arrow(dr, (900, 420), (1000, 490))
    save(im, "15-refresh-live.png")


def fig_16() -> None:
    im, dr = canvas(
        "16. Keputusan baca data (live / cache / fixture / 503)",
        "trySupabaseThenFixture  ·  kosong sah bukan kegagalan hulu",
    )
    box(dr, (700, 120, 980, 200), "Permintaan GET", None, TEAL_LT, TEAL)
    box(dr, (700, 260, 980, 360), "Supabase isi?", ["Domain JSON"], GOLD_LT, GOLD)
    box(dr, (200, 420, 520, 560), "Pakai baris live/cache", ["Bukan tebakan"], GREEN_LT, GREEN)
    box(dr, (700, 420, 980, 560), "Fixture disk?", ["public/fixtures"], SLATE_LT, SLATE)
    box(dr, (200, 620, 520, 760), "Saji fixture", ["data-health: fallback"], SLATE_LT, SLATE)
    box(dr, (700, 620, 980, 760), "Preview / tanpa env", ["public-api fixture"], SLATE_LT, SLATE)
    box(dr, (1180, 420, 1580, 560), "Sumber wajib gagal?", ["Overlay live rusak"], ORANGE_LT, ORANGE)
    box(dr, (1180, 620, 1580, 760), "503", ["Bukan FC kosong", "kontrak BE-8 / AN-5"], ROSE_LT, ROSE)
    box(dr, (1180, 260, 1580, 360), "Lapisan live kosong sah", ["200 + koleksi kosong"], GREEN_LT, GREEN)
    v_arrow(dr, (700, 120, 980, 200), (700, 260, 980, 360))
    arrow(dr, (700, 310), (520, 480))
    arrow(dr, (980, 310), (1180, 310))
    v_arrow(dr, (700, 260, 980, 360), (700, 420, 980, 560))
    arrow(dr, (980, 490), (1180, 490))
    v_arrow(dr, (700, 420, 980, 560), (700, 620, 980, 760))
    arrow(dr, (700, 490), (520, 680))
    v_arrow(dr, (1180, 420, 1580, 560), (1180, 620, 1580, 760))
    dr.text((40, 800), "src/lib/supabase/fallback.ts  ·  src/lib/data-health.ts  ·  src/lib/preview/public-api.ts  ·  PRRPKA tetap fixture-only.", font=F_S, fill=MUTED)
    save(im, "16-keputusan-baca.png")


def main() -> None:
    for fn in (
        fig_01,
        fig_02,
        fig_03,
        fig_04,
        fig_05,
        fig_06,
        fig_07,
        fig_08,
        fig_09,
        fig_10,
        fig_11,
        fig_12,
        fig_13,
        fig_14,
        fig_15,
        fig_16,
    ):
        fn()
    print(f"OK {len(list(OUT.glob('*.png')))} PNG -> {OUT}")


if __name__ == "__main__":
    main()
