#!/usr/bin/env python3
"""Render design catalog boards (palette, type, Lucide, map icons, media)."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = Path(__file__).resolve().parent / "figures" / "desain"
ICONS = ROOT / "public" / "icons" / "flat"
MEDIA = ROOT / "public" / "media"
FONT_DIR = Path(r"C:\Windows\Fonts")

W = 1680
BG = (247, 247, 244)
INK = (26, 26, 23)
MUTED = (82, 82, 75)
TEAL_BAR = (31, 76, 21)


def font(candidates: list[str], size: int):
    for name in candidates:
        path = FONT_DIR / name
        if path.is_file():
            return ImageFont.truetype(str(path), size)
    return ImageFont.load_default()


F_TITLE = font(["segoeuib.ttf", "calibrib.ttf"], 28)
F_H = font(["segoeuib.ttf", "calibrib.ttf"], 16)
F_B = font(["segoeui.ttf", "calibri.ttf"], 14)
F_S = font(["segoeui.ttf", "calibri.ttf"], 12)


def canvas(title: str, subtitle: str, height: int = 980) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    im = Image.new("RGB", (W, height), BG)
    dr = ImageDraw.Draw(im)
    dr.rectangle((0, 0, W, 72), fill=TEAL_BAR)
    dr.text((36, 16), title, font=F_TITLE, fill=(247, 247, 244))
    dr.text((36, 48), subtitle, font=F_S, fill=(197, 210, 184))
    return im, dr


def hex_rgb(value: str) -> tuple[int, int, int]:
    h = value.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def swatch(dr: ImageDraw.ImageDraw, xy, fill: str, name: str, token: str) -> None:
    x0, y0, x1, y1 = xy
    rgb = hex_rgb(fill)
    dr.rounded_rectangle(xy, radius=10, fill=rgb, outline=(224, 224, 217), width=1)
    luma = 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]
    fg = (247, 247, 244) if luma < 140 else INK
    dr.text((x0 + 10, y0 + 10), name, font=F_H, fill=fg)
    dr.text((x0 + 10, y1 - 36), fill.upper(), font=F_B, fill=fg)
    dr.text((x0 + 10, y1 - 18), token, font=F_S, fill=fg)


def board_palette() -> None:
    im, dr = canvas(
        "Palet terkunci — src/app/globals.css",
        "Jangan menambah hue. Oranye hanya Lapor dan mark hero. Status hanya aman / waspada / siaga / awas.",
        1100,
    )
    locked = [
        ("Hutan / primary light", "#1F4C15", "--forest / --primary"),
        ("Sage / primary dark", "#8A9A5B", "--sage / --accent-soft"),
        ("Oranye Lapor", "#FF7722", "--accent"),
        ("Hover Lapor", "#FF8F42", "--accent-hover"),
        ("Pressed / danger", "#C7460C", "--accent-pressed"),
        ("Emas waspada", "#C4A35A", "--warn / --gold"),
        ("Teal info", "#2F6B66", "--info / --teal"),
        ("Awas", "#B42318", "--awas"),
        ("Kertas", "#F7F7F4", "--paper"),
        ("Latar light", "#F4F5F0", "--bg light"),
        ("Latar dark", "#1A1A17", "--bg dark"),
        ("Ink", "#1A1A17", "--ink / --text light"),
    ]
    for i, (name, hx, token) in enumerate(locked):
        col, row = i % 4, i // 4
        x0 = 36 + col * 410
        y0 = 100 + row * 170
        swatch(dr, (x0, y0, x0 + 390, y0 + 150), hx, name, token)
    status = [
        ("Aman", "#1F4C15", "--status-aman"),
        ("Waspada", "#C4A35A", "--status-waspada"),
        ("Siaga", "#FF7722", "--status-siaga"),
        ("Awas", "#B42318", "--status-awas"),
    ]
    dr.text((36, 640), "Chip status (jangan menambah warna status)", font=F_H, fill=INK)
    for i, (name, hx, token) in enumerate(status):
        x0 = 36 + i * 410
        swatch(dr, (x0, 680, x0 + 390, 820), hx, name, token)
    charts = ["#1F4C15", "#8A9A5B", "#C4A35A", "#FF7722", "#2F6B66"]
    dr.text((36, 860), "Seri bagan --chart-1 … --chart-5", font=F_H, fill=INK)
    for i, hx in enumerate(charts):
        x0 = 36 + i * 320
        dr.rectangle((x0, 900, x0 + 300, 980), fill=hex_rgb(hx))
        fg = (247, 247, 244) if i in {0, 4} else INK
        dr.text((x0 + 12, 932), f"{hx}  chart-{i+1}", font=F_S, fill=fg)
    dr.text((36, 1040), "Light vs dark: hue merek sama; --primary light = hutan, --primary dark = sage. html default data-theme=dark.", font=F_S, fill=MUTED)
    im.save(OUT / "palet-token.png")


def board_type() -> None:
    im, dr = canvas(
        "Tipografi yang berjalan — Plus Jakarta Sans",
        "next/font Plus_Jakarta_Sans → --font-sans. Lantai chrome 13px. Wordmark adalah teks, bukan logo.",
        900,
    )
    samples = [
        (13, 600, "KICKER / TOOLBAR  13px / 600 / 0.06em", "TYPE_KICKER_CLASS"),
        (13, 500, "Caption / stamp  13px / 500  tabular", "TYPE_STAMP_CLASS"),
        (16, 400, "Body 16px / 400 / leading 1.65 — Observatorium kebencanaan Aceh.", "body"),
        (18, 400, "Body large / card title 18px / 600", "card title"),
        (14, 600, "Label tombol 14px / 600  tinggi 44px", "Button md"),
        (32, 600, "Page H1 32–40px / 600", "page title"),
        (28, 600, "Section H2 28–36px / 600", "section"),
        (40, 650, "Aceh Tangguh", "wordmark + hero display"),
    ]
    y = 100
    for size, _w, text, note in samples:
        f = font(["segoeuib.ttf", "segoeui.ttf"], size)
        dr.text((40, y), text, font=f, fill=INK)
        dr.text((40, y + size + 8), note, font=F_S, fill=MUTED)
        y += size + 36
    mark = font(["segoeuib.ttf"], 40)
    dr.text((40, 780), "Aceh Tangguh", font=mark, fill=hex_rgb("#1F4C15"))
    # orange mark on Tangguh
    bbox = dr.textbbox((40, 780), "Aceh ", font=mark)
    dr.text((bbox[2], 780), "Tangguh", font=mark, fill=hex_rgb("#FF7722"))
    dr.text((40, 840), "Highlight oranye hanya pada frasa merek di hero, bukan seluruh judul.", font=F_S, fill=MUTED)
    im.save(OUT / "skala-tipografi.png")


def board_components() -> None:
    im, dr = canvas(
        "Komponen UI yang sudah ada — src/components/ui",
        "Pil rounded-full. Kartu rounded-2xl / glass. Shimmer hanya CTA hero.",
        720,
    )
    # buttons
    def pill(xy, fill, label, fg):
        dr.rounded_rectangle(xy, radius=22, fill=hex_rgb(fill))
        x0, y0, x1, y1 = xy
        dr.text((x0 + 22, y0 + 12), label, font=F_H, fill=hex_rgb(fg))

    pill((40, 120, 260, 164), "#1F4C15", "Primary  hutan", "#FFFFFF")
    pill((280, 120, 500, 164), "#FF7722", "Accent  Lapor", "#FFFFFF")
    dr.rounded_rectangle((520, 120, 760, 164), radius=22, outline=hex_rgb("#1F4C15"), width=2)
    dr.text((542, 132), "Outline / ghost", font=F_H, fill=INK)
    pill((780, 120, 1000, 164), "#C7460C", "Danger", "#FFFFFF")
    tones = [
        (40, "#1F4C15", "Aman / ok"),
        (220, "#C4A35A", "Waspada"),
        (400, "#FF7722", "Siaga"),
        (580, "#B42318", "Awas"),
        (760, "#2F6B66", "Info"),
        (940, "#E0E0D9", "Netral"),
    ]
    dr.text((40, 200), "Chip / StatusChip", font=F_H, fill=INK)
    for x, hx, lab in tones:
        fill = hex_rgb(hx) if hx != "#E0E0D9" else (246, 247, 240)
        fg = (247, 247, 244) if hx not in {"#C4A35A", "#E0E0D9"} else INK
        dr.rounded_rectangle((x, 240, x + 160, 280), radius=16, fill=fill)
        dr.text((x + 14, 250), lab, font=F_S, fill=fg)
    dr.rounded_rectangle((40, 340, 800, 500), radius=24, fill=(255, 255, 255), outline=(224, 224, 217), width=1)
    dr.text((60, 360), "GlassPanel / kartu raised", font=F_H, fill=INK)
    dr.text((60, 390), "Latar kaca 72% + blur 20px pada nav mengambang (max-w-6xl).", font=F_B, fill=MUTED)
    dr.text((60, 420), "FAB Lapor di peta: oranye, Plus + ChevronDown.", font=F_B, fill=MUTED)
    dr.text((60, 450), "Nav: wordmark teks, item aktif pil sage, Lapor tetap pil oranye.", font=F_B, fill=MUTED)
    dr.rounded_rectangle((840, 340, 1640, 500), radius=24, fill=hex_rgb("#1A1A17"))
    dr.text((860, 360), "Tema gelap (default html)", font=F_H, fill=hex_rgb("#F7F7F4"))
    dr.text((860, 390), "--bg #1A1A17  ·  --primary sage #8A9A5B", font=F_B, fill=hex_rgb("#9A9A8E"))
    dr.text((860, 420), "Kartu --bg-raised #242420", font=F_B, fill=hex_rgb("#9A9A8E"))
    files = [
        "Button.tsx — primary | accent | ghost | outline | danger",
        "Chip.tsx — neutral ok warn danger info glass",
        "StatusChip.tsx — status-vocab aman/waspada/siaga/awas",
        "GlassPanel.tsx · MediaBackdrop.tsx · shimmer-button.tsx (hero saja)",
        "blur-fade · border-beam · number-ticker · animated-shiny-text",
    ]
    y = 530
    for line in files:
        dr.text((40, y), line, font=F_B, fill=INK)
        y += 24
    im.save(OUT / "komponen-ui.png")


def board_map_icons() -> None:
    files = sorted(
        p for p in ICONS.glob("icon-*.png") if p.is_file()
    )
    cols = 6
    rows = (len(files) + cols - 1) // cols
    height = 120 + rows * 160 + 40
    im, dr = canvas(
        "Ikon peta datar — public/icons/flat",
        "src/lib/layer-icons.ts. Glyph yang sama dipakai ulang untuk overlay; jangan menambah seni baru.",
        max(height, 400),
    )
    for i, path in enumerate(files):
        col, row = i % cols, i // cols
        x = 40 + col * 270
        y = 100 + row * 160
        try:
            icon = Image.open(path).convert("RGBA")
            icon.thumbnail((72, 72))
            im.paste(icon, (x + 12, y + 12), icon)
        except OSError:
            dr.rectangle((x + 12, y + 12, x + 84, y + 84), outline=INK)
        dr.text((x + 100, y + 28), path.stem.replace("icon-", ""), font=F_S, fill=INK)
        dr.text((x + 100, y + 48), path.name, font=F_S, fill=MUTED)
    im.save(OUT / "ikon-peta.png")


def board_lucide() -> None:
    items = [
        ("Menu / X", "SiteNav, GuideBot"),
        ("AlertTriangle", "Hero, hub lapor"),
        ("Home / Map", "Hero, IRBI/KRB, area profil"),
        ("CloudRain Droplets Flame Mountain", "Peringatan dini"),
        ("Sun Cloud* Lightning", "WeatherIcon + ThemeToggle"),
        ("Chevron / Play Pause", "Carousel cuaca & R3P"),
        ("Layers Settings2", "Toolbar peta"),
        ("Plus ChevronDown", "FAB Lapor"),
        ("MapPin Navigation", "GPS laporan"),
        ("ClipboardCheck ArrowRight Send", "Form lapor"),
        ("Database Link2 Scale", "Transparansi"),
        ("LayoutDashboard LogIn UserRound", "AuthMenu"),
        ("TreePine Siren ShieldCheck Users", "AdminShell SIK"),
        ("Phone BookOpen Boxes Building2", "AdminShell master"),
        ("Calendar Clock User Search", "Publikasi / tabel"),
        ("Download ExternalLink", "DIBI, kejadian, R3P"),
    ]
    im, dr = canvas(
        "Ikon Lucide yang terpakai di komponen",
        "Hanya ikon yang diimpor. Bukan set Lucide utuh. Stroke 2, ukuran UI 18px.",
        920,
    )
    for i, (name, used) in enumerate(items):
        col, row = i % 2, i // 2
        x = 40 + col * 820
        y = 100 + row * 90
        dr.rounded_rectangle((x, y, x + 790, y + 78), radius=12, fill=(255, 255, 255), outline=(224, 224, 217))
        dr.ellipse((x + 16, y + 18, x + 56, y + 58), outline=hex_rgb("#1F4C15"), width=3)
        dr.text((x + 72, y + 14), name, font=F_H, fill=INK)
        dr.text((x + 72, y + 40), used, font=F_S, fill=MUTED)
    im.save(OUT / "ikon-lucide.png")


def board_media() -> None:
    slides = list((MEDIA / "hero-slides").glob("*.jpg"))
    extras = [
        MEDIA / "teaser-aerial.jpg",
        MEDIA / "forest-mist.jpg",
        MEDIA / "hills-indo.jpg",
        MEDIA / "community.jpg",
        MEDIA / "hero-coast.jpg",
    ]
    pics = [p for p in slides + extras if p.is_file()]
    im, dr = canvas(
        "Media hero dan teaser — public/media",
        "Kredit: public/media/CREDITS.md. Hero slideshow memakai hero-slides/01–04.jpg (DJI).",
        980,
    )
    for i, path in enumerate(pics[:9]):
        col, row = i % 3, i // 3
        x = 40 + col * 540
        y = 100 + row * 270
        try:
            raw = Image.open(path).convert("RGB")
            raw.thumbnail((520, 200))
            im.paste(raw, (x, y))
            dr.text((x, y + 208), path.name, font=F_S, fill=INK)
        except OSError:
            dr.rectangle((x, y, x + 520, y + 200), outline=INK)
            dr.text((x, y + 208), f"(gagal baca) {path.name}", font=F_S, fill=MUTED)
    im.save(OUT / "media-kredit.png")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    board_palette()
    board_type()
    board_components()
    board_map_icons()
    board_lucide()
    board_media()
    print(f"OK {len(list(OUT.glob('*.png')))} papan -> {OUT}")


if __name__ == "__main__":
    main()
