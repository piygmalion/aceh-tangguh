#!/usr/bin/env python3
"""Compile every project Markdown file into Manual-Aceh-Tangguh.docx."""

from __future__ import annotations

import hashlib
import os
import re
import sys
from pathlib import Path

from docx import Document
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Mm, Pt, RGBColor
from docx.enum.style import WD_STYLE_TYPE

sys.path.insert(0, str(Path(__file__).resolve().parent))
from bab_data_interop import VISUAL_ILUSTRASI, VISUAL_TEKNIS, chapter_blocks
from bab_desain import FIGURES as DESIGN_FIGURES
from bab_desain import chapter_blocks as design_chapter_blocks

ROOT = Path(__file__).resolve().parents[2]
OUT_PATH = Path(__file__).resolve().parent / "Manual-Aceh-Tangguh.docx"
SKIP_DIRS = {"node_modules", ".next", ".git"}
DATE_LABEL = "5 September 2026"
FIGURE_INDEX = {
    rel: (title, caption, source)
    for rel, title, caption, source in (*VISUAL_TEKNIS, *VISUAL_ILUSTRASI, *DESIGN_FIGURES)
}

HEADING_RE = re.compile(r"^(#{1,6})\s+(.*)$")
HR_RE = re.compile(r"^(-{3,}|\*{3,}|_{3,})\s*$")
UL_RE = re.compile(r"^(\s*)([-*+])\s+(.*)$")
OL_RE = re.compile(r"^(\s*)(\d{1,9})[.)]\s+(.*)$")
FENCE_RE = re.compile(r"^```(.*)$")
TABLE_ROW_RE = re.compile(r"^\s*\|.*\|\s*$")
TABLE_SEP_RE = re.compile(r"^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$")

INLINE_TOKEN = re.compile(
    r"(!\[([^\]]*)\]\(([^)]+)\))"
    r"|(\[([^\]]+)\]\(([^)]+)\))"
    r"|(`([^`]+)`)"
    r"|(\*\*(.+?)\*\*)"
    r"|(__(.+?)__)"
    r"|(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)"
    r"|(?<!_)_([^_]+)_(?!_)"
    r"|(~~(.+?)~~)"
)


def walk_markdown() -> list[str]:
    found: list[str] = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for name in filenames:
            if name.lower().endswith(".md"):
                rel = (Path(dirpath) / name).relative_to(ROOT).as_posix()
                if rel.startswith("docs/manual/"):
                    continue
                found.append(rel)
    return sorted(set(found))


def first_h1(text: str) -> str:
    for line in text.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return "(tanpa judul H1)"


def jurnal_sort_key(rel: str) -> tuple[int, int, str]:
    stem = Path(rel).stem
    if stem == "_template":
        return (0, 0, stem)
    m = re.fullmatch(r"(DATA|BE|FE|AN)-(\d+)", stem)
    if m:
        order = {"DATA": 1, "BE": 2, "FE": 3, "AN": 4}
        return (order[m.group(1)], int(m.group(2)), stem)
    m = re.fullmatch(r"KOORD-G(\d+)", stem)
    if m:
        return (5, int(m.group(1)), stem)
    reviews = {
        "KOORD-REVIEW": (6, 0),
        "KOORD-REVIEW-20260905": (6, 1),
        "KOORD-REVIEW-20260905-g14": (6, 2),
    }
    if stem in reviews:
        group, idx = reviews[stem]
        return (group, idx, stem)
    return (9, 0, stem)


def classify(rel: str) -> str:
    if rel == "README.md":
        return "A"
    if rel == "SECURITY.md" or rel.startswith("docs/security/") or rel.startswith("security/"):
        return "B"
    if rel in {
        "docs/pengembangan/00-protokol.md",
        "docs/pengembangan/01-data.md",
        "docs/pengembangan/02-backend.md",
        "docs/pengembangan/03-frontend.md",
        "docs/pengembangan/04-analis.md",
    }:
        return "C"
    if rel == "docs/pengembangan/STATUS.md":
        return "D"
    if rel.startswith("docs/pengembangan/jurnal/"):
        return "E"
    if rel.startswith(".superdesign/"):
        return "F"
    if rel.startswith(".cursor/skills/"):
        return "G"
    if rel == "public/media/CREDITS.md":
        return "CREDITS"
    if rel.startswith("docs/") and not rel.startswith("docs/pengembangan/"):
        return "A"
    return "OTHER"


def sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:12]


def set_run_font(run, name: str = "Calibri", size_pt: float | None = None, mono: bool = False) -> None:
    run.font.name = "Consolas" if mono else name
    rpr = run._element.get_or_add_rPr()
    rfonts = rpr.get_or_add_rFonts()
    face = "Consolas" if mono else name
    rfonts.set(qn("w:ascii"), face)
    rfonts.set(qn("w:hAnsi"), face)
    rfonts.set(qn("w:eastAsia"), face)
    if size_pt is not None:
        run.font.size = Pt(size_pt)


def shade_paragraph(paragraph, fill: str = "F4F4F4") -> None:
    p_pr = paragraph._p.get_or_add_pPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), fill)
    p_pr.append(shd)


def add_page_number_field(paragraph) -> None:
    run = paragraph.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = " PAGE "
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.append(begin)
    run._r.append(instr)
    run._r.append(end)


def add_toc_field(paragraph) -> None:
    run = paragraph.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = ' TOC \\o "1-2" \\h \\z \\u '
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    placeholder = OxmlElement("w:t")
    placeholder.text = "(Perbarui daftar isi di Word: klik kanan → Update Field)"
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    run._r.append(begin)
    run._r.append(instr)
    run._r.append(separate)
    text_run = paragraph.add_run()
    text_run._r.append(placeholder)
    run2 = paragraph.add_run()
    run2._r.append(end)


def enable_update_fields(doc: Document) -> None:
    settings = doc.settings.element
    update = OxmlElement("w:updateFields")
    update.set(qn("w:val"), "true")
    settings.append(update)


def add_bottom_border(paragraph) -> None:
    p_pr = paragraph._p.get_or_add_pPr()
    p_bdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "6")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), "1F4E5F")
    p_bdr.append(bottom)
    p_pr.append(p_bdr)


def configure_styles(doc: Document) -> None:
    styles = doc.styles
    normal = styles["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(11)
    normal.font.color.rgb = RGBColor(0x22, 0x22, 0x22)
    normal.paragraph_format.space_after = Pt(8)
    normal.paragraph_format.space_before = Pt(0)
    normal.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE

    heading_sizes = {1: 18, 2: 14, 3: 13, 4: 12, 5: 11, 6: 11}
    for level, size in heading_sizes.items():
        style = styles[f"Heading {level}"]
        style.font.name = "Calibri"
        style.font.size = Pt(size)
        style.font.bold = True
        style.font.color.rgb = RGBColor(0x1F, 0x4E, 0x5F)
        style.paragraph_format.space_before = Pt(14 if level <= 2 else 10)
        style.paragraph_format.space_after = Pt(8)

    if "Code Block" not in [s.name for s in styles]:
        code_style = styles.add_style("Code Block", WD_STYLE_TYPE.PARAGRAPH)
        code_style.font.name = "Consolas"
        code_style.font.size = Pt(9)
        code_style.paragraph_format.space_after = Pt(2)
        code_style.paragraph_format.space_before = Pt(0)
        code_style.paragraph_format.left_indent = Cm(0.3)


def setup_page(doc: Document) -> None:
    section = doc.sections[0]
    section.page_width = Mm(210)
    section.page_height = Mm(297)
    section.left_margin = Cm(2.4)
    section.right_margin = Cm(2.4)
    section.top_margin = Cm(2.2)
    section.bottom_margin = Cm(2.2)

    header = section.header
    header.is_linked_to_previous = False
    hp = header.paragraphs[0]
    hp.text = "Manual Aceh Tangguh"
    hp.alignment = WD_ALIGN_PARAGRAPH.LEFT
    set_run_font(hp.runs[0], size_pt=9)
    hp.runs[0].font.color.rgb = RGBColor(0x1F, 0x4E, 0x5F)
    add_bottom_border(hp)

    footer = section.footer
    footer.is_linked_to_previous = False
    fp = footer.paragraphs[0]
    fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = fp.add_run("Kompilasi Markdown workspace  ·  halaman ")
    set_run_font(run, size_pt=9)
    add_page_number_field(fp)


def add_inline(paragraph, text: str, *, mono: bool = False) -> None:
    if mono:
        run = paragraph.add_run(text)
        set_run_font(run, mono=True, size_pt=9)
        return

    pos = 0
    for match in INLINE_TOKEN.finditer(text):
        if match.start() > pos:
            run = paragraph.add_run(text[pos : match.start()])
            set_run_font(run)
        if match.group(1):
            alt, src = match.group(2), match.group(3)
            run = paragraph.add_run(f"[gambar: {alt or src}]")
            set_run_font(run)
            run.italic = True
        elif match.group(4):
            label, url = match.group(5), match.group(6)
            run = paragraph.add_run(f"{label} ({url})")
            set_run_font(run)
            run.font.color.rgb = RGBColor(0x1F, 0x4E, 0x5F)
        elif match.group(7):
            run = paragraph.add_run(match.group(8))
            set_run_font(run, mono=True, size_pt=10)
        elif match.group(9) or match.group(11):
            run = paragraph.add_run(match.group(10) or match.group(12))
            set_run_font(run)
            run.bold = True
        elif match.group(13) or match.group(14):
            run = paragraph.add_run(match.group(13) or match.group(14))
            set_run_font(run)
            run.italic = True
        elif match.group(15):
            run = paragraph.add_run(match.group(16))
            set_run_font(run)
            run.font.strike = True
        pos = match.end()
    if pos < len(text):
        run = paragraph.add_run(text[pos:])
        set_run_font(run)


def split_table_row(line: str) -> list[str]:
    body = line.strip()
    if body.startswith("|"):
        body = body[1:]
    if body.endswith("|"):
        body = body[:-1]
    return [cell.strip() for cell in body.split("|")]


def is_table_block(lines: list[str], index: int) -> bool:
    if index + 1 >= len(lines):
        return False
    return bool(TABLE_ROW_RE.match(lines[index])) and bool(TABLE_SEP_RE.match(lines[index + 1]))


def add_code_block(doc: Document, code: str, info: str = "") -> None:
    label = info.strip()
    if label:
        p = doc.add_paragraph()
        run = p.add_run(f"Blok kode ({label})")
        set_run_font(run, size_pt=9)
        run.italic = True
        p.paragraph_format.space_after = Pt(2)
    text = code.replace("\t", "    ")
    if not text.endswith("\n"):
        text += "\n"
    for raw in text.splitlines():
        p = doc.add_paragraph(style="Code Block")
        run = p.add_run(raw if raw else " ")
        set_run_font(run, mono=True, size_pt=8.5)
        shade_paragraph(p, "F3F3F3")


def try_add_image(doc: Document, source_rel: str, image_ref: str, alt: str) -> bool:
    raw = image_ref.split()[0].strip().strip("<>")
    if raw.startswith("http://") or raw.startswith("https://"):
        return False
    candidate = (ROOT / source_rel).parent / raw
    if not candidate.is_file():
        candidate = ROOT / raw.lstrip("./")
    if not candidate.is_file():
        return False
    try:
        doc.add_picture(str(candidate), width=Cm(14))
        cap = doc.add_paragraph()
        run = cap.add_run(alt or candidate.as_posix())
        set_run_font(run, size_pt=9)
        run.italic = True
        return True
    except Exception:
        return False


def add_heading_safe(doc: Document, text: str, level: int):
    level = max(1, min(9, level))
    heading = doc.add_heading(text, level=level)
    for run in heading.runs:
        set_run_font(run)
    return heading


def render_markdown(doc: Document, text: str, source_rel: str, heading_shift: int) -> None:
    lines = text.splitlines()
    i = 0
    n = len(lines)

    if n >= 2 and lines[0].strip() == "---":
        end = None
        for j in range(1, n):
            if lines[j].strip() == "---":
                end = j
                break
        if end is not None:
            add_code_block(doc, "\n".join(lines[1:end]), "frontmatter YAML")
            i = end + 1

    para_buf: list[str] = []
    quote_buf: list[str] = []

    def emit_text_line(raw: str) -> None:
        joined = raw.strip()
        if not joined:
            return
        img = re.fullmatch(r"!\[([^\]]*)\]\(([^)]+)\)", joined)
        if img and try_add_image(doc, source_rel, img.group(2), img.group(1)):
            return
        p = doc.add_paragraph()
        add_inline(p, joined)

    def flush_paragraph() -> None:
        nonlocal para_buf
        lines_out = para_buf
        para_buf = []
        for raw in lines_out:
            emit_text_line(raw)

    def flush_quote() -> None:
        nonlocal quote_buf
        if not quote_buf:
            return
        joined = " ".join(part.strip() for part in quote_buf if part.strip())
        quote_buf = []
        if not joined:
            return
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Cm(1)
        run_prefix = p.add_run("“ ")
        set_run_font(run_prefix)
        run_prefix.italic = True
        add_inline(p, joined)
        for run in p.runs:
            run.italic = True

    while i < n:
        line = lines[i]
        stripped = line.strip()

        fence = FENCE_RE.match(stripped)
        if fence:
            flush_paragraph()
            flush_quote()
            info = fence.group(1)
            i += 1
            block: list[str] = []
            while i < n and not lines[i].strip().startswith("```"):
                block.append(lines[i])
                i += 1
            if i < n:
                i += 1
            add_code_block(doc, "\n".join(block), info)
            continue

        if is_table_block(lines, i):
            flush_paragraph()
            flush_quote()
            rows: list[list[str]] = [split_table_row(lines[i])]
            i += 2
            while i < n and TABLE_ROW_RE.match(lines[i]):
                rows.append(split_table_row(lines[i]))
                i += 1
            cols = max(len(r) for r in rows)
            table = doc.add_table(rows=len(rows), cols=cols)
            table.style = "Table Grid"
            table.autofit = True
            for r_idx, row in enumerate(rows):
                for c_idx in range(cols):
                    cell = table.cell(r_idx, c_idx)
                    cell.text = ""
                    p = cell.paragraphs[0]
                    add_inline(p, row[c_idx] if c_idx < len(row) else "")
                    if r_idx == 0:
                        for run in p.runs:
                            run.bold = True
                        shade = OxmlElement("w:shd")
                        shade.set(qn("w:fill"), "E6EEF0")
                        shade.set(qn("w:val"), "clear")
                        tc_pr = cell._tc.get_or_add_tcPr()
                        tc_pr.append(shade)
            doc.add_paragraph()
            continue

        heading = HEADING_RE.match(line)
        if heading:
            flush_paragraph()
            flush_quote()
            level = len(heading.group(1)) + heading_shift
            add_heading_safe(doc, heading.group(2).strip(), level)
            i += 1
            continue

        if HR_RE.match(stripped) and not stripped.startswith("#"):
            flush_paragraph()
            flush_quote()
            p = doc.add_paragraph()
            add_bottom_border(p)
            i += 1
            continue

        ul = UL_RE.match(line)
        ol = OL_RE.match(line)
        if ul or ol:
            flush_paragraph()
            flush_quote()
            match = ul or ol
            indent = len(match.group(1).replace("\t", "    "))
            level = indent // 2
            item_text = match.group(3)
            p = doc.add_paragraph(style="List Number" if ol else "List Bullet")
            p.paragraph_format.left_indent = Cm(0.75 + 0.6 * level)
            add_inline(p, item_text)
            i += 1
            continue

        if stripped.startswith(">"):
            flush_paragraph()
            quote_buf.append(re.sub(r"^>\s?", "", stripped))
            i += 1
            if i >= n or not lines[i].strip().startswith(">"):
                flush_quote()
            continue

        if stripped == "":
            flush_paragraph()
            flush_quote()
            i += 1
            continue

        para_buf.append(line)
        i += 1

    flush_paragraph()
    flush_quote()


def add_cover(doc: Document, count: int) -> None:
    for _ in range(3):
        doc.add_paragraph()
    title = doc.add_paragraph()
    title.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = title.add_run("MANUAL ACEH TANGGUH")
    set_run_font(run, size_pt=28)
    run.bold = True
    run.font.color.rgb = RGBColor(0x1F, 0x4E, 0x5F)

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = sub.add_run("Kompilasi verbatim seluruh dokumen Markdown workspace")
    set_run_font(run, size_pt=14)
    run.italic = True

    meta = doc.add_paragraph()
    meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = meta.add_run(
        f"{DATE_LABEL}\n{count} berkas .md unik\nDikecualikan hanya node_modules, .next, dan .git"
    )
    set_run_font(run, size_pt=11)

    note = doc.add_paragraph()
    note.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = note.add_run(
        "Dokumen ini bukan ringkasan baru. Setiap berkas sumber disalin utuh: "
        "judul, paragraf, daftar, tabel, blok kode, dan tautan. "
        "Setelah inventaris, panduan alur menyisipkan diagram teknis dan ilustrasi. "
        "Bagian H menjelaskan data dan interoperabilitas (ETL, live, fixture) tanpa mengubah naskah sumber."
    )
    set_run_font(run, size_pt=11)
    doc.add_page_break()


def add_static_toc(doc: Document, groups: dict[str, list[str]]) -> None:
    add_heading_safe(doc, "Daftar isi", 1)
    p = doc.add_paragraph()
    add_inline(
        p,
        "Daftar di bawah merujuk bagian kerangka. Bidang TOC Word (Heading 1–2) "
        "diperbarui otomatis saat dokumen dibuka.",
    )
    labels = [
        ("0", "Inventaris jalur sumber"),
        ("VISUAL", "Panduan alur modul dan pengembangan"),
        ("A", "Arsitektur dan modul operasional"),
        ("H", "Data dan interoperabilitas"),
        ("I", "Desain frontend, ikon, dan visual"),
        ("B", "Keamanan"),
        ("C", "Protokol dan brief agen"),
        ("D", "Status gelombang"),
        ("E", "Jurnal tiket"),
        ("F", "Superdesign"),
        ("G", "Skill Cursor"),
        ("CREDITS", "Kredit media"),
        ("OTHER", "Berkas lain"),
        ("LAMPIRAN", "Bukti kelengkapan"),
    ]
    authored = {"0", "VISUAL", "H", "I", "LAMPIRAN"}
    for key, title in labels:
        if key in authored or groups.get(key):
            item = doc.add_paragraph(style="List Number")
            count = len(groups.get(key, [])) if key not in authored else ""
            suffix = f" — {count} berkas" if count != "" else ""
            add_inline(item, f"Bagian {key}. {title}{suffix}")
    toc_p = doc.add_paragraph()
    add_toc_field(toc_p)
    doc.add_page_break()


def add_inventory(doc: Document, records: list[tuple[str, str, str, int, str]]) -> None:
    add_heading_safe(doc, "Bab 0 — Inventaris jalur sumber", 1)
    p = doc.add_paragraph()
    add_inline(
        p,
        f"Tabel ini adalah bukti walk filesystem: {len(records)} berkas .md unik. "
        "Setiap baris wajib muncul sebagai salinan utuh di bagian yang sesuai.",
    )
    table = doc.add_table(rows=1, cols=5)
    table.style = "Table Grid"
    headers = ["No", "Jalur", "Judul H1", "Baris", "SHA-256"]
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = header
        for run in cell.paragraphs[0].runs:
            run.bold = True
        shade = OxmlElement("w:shd")
        shade.set(qn("w:fill"), "1F4E5F")
        shade.set(qn("w:val"), "clear")
        cell._tc.get_or_add_tcPr().append(shade)
        for run in cell.paragraphs[0].runs:
            run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
            set_run_font(run, size_pt=9)
    for idx, (rel, h1, _group, lines, digest) in enumerate(records, start=1):
        row = table.add_row().cells
        values = [str(idx), rel, h1, str(lines), digest]
        for i, value in enumerate(values):
            row[i].text = ""
            para = row[i].paragraphs[0]
            run = para.add_run(value)
            set_run_font(run, size_pt=8)
    doc.add_page_break()


def add_source_file(
    doc: Document,
    rel: str,
    text: str,
    *,
    heading_level: int = 2,
) -> None:
    add_heading_safe(doc, rel, heading_level)
    meta = doc.add_paragraph()
    run = meta.add_run(
        f"Sumber: {rel}  ·  {len(text.splitlines())} baris  ·  {len(text)} karakter  ·  {sha256_text(text)}"
    )
    set_run_font(run, size_pt=9)
    run.italic = True
    render_markdown(doc, text, rel, heading_shift=heading_level)


def section_intro(doc: Document, title: str, body: str) -> None:
    add_heading_safe(doc, title, 1)
    p = doc.add_paragraph()
    add_inline(p, body)


def insert_figure(doc: Document, rel: str) -> None:
    path = ROOT / rel
    if not path.is_file():
        raise SystemExit(f"Gambar hilang: {rel}")
    meta = FIGURE_INDEX.get(rel)
    if meta:
        title, caption, source = meta
        add_heading_safe(doc, title, 3)
    pic = doc.add_paragraph()
    pic.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = pic.add_run()
    run.add_picture(str(path), width=Cm(15.8))
    if not meta:
        return
    cap = doc.add_paragraph()
    cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = cap.add_run(caption)
    set_run_font(run, size_pt=10)
    run.italic = True
    src = doc.add_paragraph()
    src.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = src.add_run(f"Sumber kontrak: {source}")
    set_run_font(run, size_pt=9)


def add_simple_table(doc: Document, headers: list[str], rows: list[list[str]]) -> None:
    table = doc.add_table(rows=1, cols=len(headers))
    table.style = "Table Grid"
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        cell.text = ""
        para = cell.paragraphs[0]
        run = para.add_run(header)
        run.bold = True
        set_run_font(run, size_pt=9)
        shade = OxmlElement("w:shd")
        shade.set(qn("w:fill"), "E6EEF0")
        shade.set(qn("w:val"), "clear")
        cell._tc.get_or_add_tcPr().append(shade)
    for row_data in rows:
        cells = table.add_row().cells
        for i, value in enumerate(row_data):
            cells[i].text = ""
            para = cells[i].paragraphs[0]
            add_inline(para, value)
            for run in para.runs:
                set_run_font(run, size_pt=9)
    doc.add_paragraph()


def add_visual_guide(doc: Document) -> None:
    add_heading_safe(doc, "Panduan alur modul dan pengembangan", 1)
    p = doc.add_paragraph()
    add_inline(
        p,
        "Bagian ini membantu pembaca melihat alur sebelum masuk salinan Markdown. "
        "Diagram teknis memakai label rute dan berkas dari repo. "
        "Ilustrasi AI hanya menjelaskan konsep, bukan spek atau angka.",
    )
    add_heading_safe(doc, "Diagram teknis", 2)
    for rel, _title, _caption, _source in VISUAL_TEKNIS:
        insert_figure(doc, rel)
    add_heading_safe(doc, "Ilustrasi konsep", 2)
    for rel, _title, _caption, _source in VISUAL_ILUSTRASI:
        insert_figure(doc, rel)


def add_data_chapter(doc: Document) -> None:
    section_intro(
        doc,
        "Bagian H — Data dan interoperabilitas",
        "ETL offline, refresh live, keputusan baca (Supabase / cache / fixture / 503), "
        "dan batasan interop. Diagram 2, 11, 14, 15, dan 16 diulang di sini.",
    )
    for block in chapter_blocks():
        kind = block["type"]
        if kind == "h2":
            add_heading_safe(doc, block["text"], 2)
        elif kind == "h3":
            add_heading_safe(doc, block["text"], 3)
        elif kind == "p":
            para = doc.add_paragraph()
            add_inline(para, block["text"])
        elif kind == "ul":
            for item in block["items"]:
                para = doc.add_paragraph(style="List Bullet")
                add_inline(para, item)
        elif kind == "table":
            add_simple_table(doc, block["headers"], block["rows"])
        elif kind == "figure":
            insert_figure(doc, block["rel"])
        else:
            raise SystemExit(f"Blok Bagian H tidak dikenal: {kind}")


def add_design_chapter(doc: Document) -> None:
    section_intro(
        doc,
        "Bagian I — Desain frontend, ikon, dan visual",
        "Token, komponen, ikon Lucide dan peta, media hero, serta cuplikan halaman publik. "
        "Konsol staf selain login tidak dicuplik.",
    )
    for block in design_chapter_blocks():
        kind = block["type"]
        if kind == "h2":
            add_heading_safe(doc, block["text"], 2)
        elif kind == "h3":
            add_heading_safe(doc, block["text"], 3)
        elif kind == "p":
            para = doc.add_paragraph()
            add_inline(para, block["text"])
        elif kind == "ul":
            for item in block["items"]:
                para = doc.add_paragraph(style="List Bullet")
                add_inline(para, item)
        elif kind == "table":
            add_simple_table(doc, block["headers"], block["rows"])
        elif kind == "figure":
            insert_figure(doc, block["rel"])
        else:
            raise SystemExit(f"Blok Bagian I tidak dikenal: {kind}")


def load_text(rel: str) -> str:
    path = ROOT / rel
    return path.read_text(encoding="utf-8-sig")


def build() -> None:
    rels = walk_markdown()
    if not rels:
        raise SystemExit("Tidak ada berkas Markdown.")

    texts: dict[str, str] = {}
    records: list[tuple[str, str, str, int, str]] = []
    groups: dict[str, list[str]] = {
        "A": [],
        "B": [],
        "C": [],
        "D": [],
        "E": [],
        "F": [],
        "G": [],
        "CREDITS": [],
        "OTHER": [],
    }
    for rel in rels:
        text = load_text(rel)
        texts[rel] = text
        group = classify(rel)
        groups.setdefault(group, []).append(rel)
        records.append((rel, first_h1(text), group, len(text.splitlines()), sha256_text(text)))

    groups["A"].sort(key=lambda r: (0 if r == "README.md" else 1, r.lower()))
    groups["B"].sort(key=lambda r: (0 if r == "SECURITY.md" else 1, r.lower()))
    groups["C"].sort()
    groups["E"].sort(key=jurnal_sort_key)
    groups["F"].sort()
    groups["G"].sort()
    groups["OTHER"].sort()

    included: list[str] = []
    for key in ("A", "B", "C", "D", "E", "F", "G", "CREDITS", "OTHER"):
        included.extend(groups[key])

    missing = sorted(set(rels) - set(included))
    extra = sorted(set(included) - set(rels))
    if missing or extra:
        raise SystemExit(f"Klasifikasi tidak lengkap. Hilang={missing} ekstra={extra}")

    doc = Document()
    configure_styles(doc)
    setup_page(doc)
    enable_update_fields(doc)
    doc.core_properties.title = "Manual Aceh Tangguh"
    doc.core_properties.subject = "Kompilasi Markdown workspace"
    doc.core_properties.author = "Aceh Tangguh"

    add_cover(doc, len(rels))
    add_static_toc(doc, groups)
    add_inventory(doc, records)
    add_visual_guide(doc)

    section_intro(
        doc,
        "Bagian A — Arsitektur dan modul operasional",
        "README dan dokumen operasional di docs/ di luar protokol pengembangan: "
        "admin, peta dasar, laporan produksi, mutu Open Data, playbook analisis, dan Vercel.",
    )
    insert_figure(doc, "docs/manual/figures/teknis/01-arsitektur-tinggi.png")
    insert_figure(doc, "docs/manual/figures/ilustrasi/sik-observatorium.png")
    insert_figure(doc, "docs/manual/figures/desain/palet-token.png")
    insert_figure(doc, "docs/manual/figures/tangkapan/beranda-desktop.png")
    for rel in groups["A"]:
        add_source_file(doc, rel, texts[rel])

    add_data_chapter(doc)
    add_design_chapter(doc)

    section_intro(
        doc,
        "Bagian B — Keamanan",
        "Kebijakan keamanan repositori, runbook Strix, baseline, instruksi engagement, dan inventaris attack-surface.",
    )
    for rel in groups["B"]:
        add_source_file(doc, rel, texts[rel])

    section_intro(
        doc,
        "Bagian C — Protokol dan brief agen",
        "Protokol tulis–baca ulang dan brief empat agen: data, backend, frontend, analis.",
    )
    insert_figure(doc, "docs/manual/figures/teknis/12-empat-agen-siklus.png")
    for rel in groups["C"]:
        add_source_file(doc, rel, texts[rel])

    section_intro(
        doc,
        "Bagian D — Status gelombang",
        "STATUS.md disalin utuh. Status tiket, termasuk DATA-4 menunggu-naskah, tidak diubah.",
    )
    insert_figure(doc, "docs/manual/figures/teknis/13-gelombang-timeline.png")
    for rel in groups["D"]:
        add_source_file(doc, rel, texts[rel])

    section_intro(
        doc,
        "Bagian E — Jurnal tiket",
        "Seluruh jurnal diurutkan DATA, BE, FE, AN, lalu KOORD. Template disertakan. Isi tidak diringkas.",
    )
    for rel in groups["E"]:
        add_source_file(doc, rel, texts[rel])

    section_intro(
        doc,
        "Bagian F — Superdesign",
        "Catatan sistem desain dan inisialisasi Superdesign.",
    )
    for rel in groups["F"]:
        add_source_file(doc, rel, texts[rel])

    section_intro(
        doc,
        "Bagian G — Skill Cursor",
        "Skill agen di .cursor/skills/, termasuk YAML frontmatter, disalin utuh.",
    )
    for rel in groups["G"]:
        add_source_file(doc, rel, texts[rel])

    if groups["CREDITS"]:
        section_intro(doc, "Kredit media", "Kredit aset media publik.")
        for rel in groups["CREDITS"]:
            add_source_file(doc, rel, texts[rel])

    if groups["OTHER"]:
        section_intro(
            doc,
            "Berkas lain",
            "Berkas Markdown yang tidak masuk klasifikasi A–G tetap disalin agar tidak ada yang terlewat.",
        )
        for rel in groups["OTHER"]:
            add_source_file(doc, rel, texts[rel])

    add_heading_safe(doc, "Lampiran — Bukti kelengkapan", 1)
    proof = doc.add_paragraph()
    add_inline(
        proof,
        f"Walk filesystem menemukan {len(rels)} berkas. "
        f"Dokumen ini menyalin {len(included)} berkas. "
        "Selisih wajib nol.",
    )
    proof_table = doc.add_table(rows=1, cols=3)
    proof_table.style = "Table Grid"
    for i, header in enumerate(["Jalur", "Bagian", "Disalin"]):
        cell = proof_table.rows[0].cells[i]
        cell.text = header
        for run in cell.paragraphs[0].runs:
            run.bold = True
    group_of = {rel: classify(rel) for rel in rels}
    for rel in rels:
        row = proof_table.add_row().cells
        row[0].text = rel
        row[1].text = group_of[rel]
        row[2].text = "ya" if rel in included else "TIDAK"
        for cell in row:
            for run in cell.paragraphs[0].runs:
                set_run_font(run, size_pt=8)

    if set(rels) != set(included):
        raise SystemExit("Bukti kelengkapan gagal sebelum simpan.")

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    doc.save(str(OUT_PATH))
    print(f"OK {len(rels)} berkas -> {OUT_PATH}")
    print("BAGIAN " + " ".join(f"{k}={len(v)}" for k, v in groups.items() if v))


if __name__ == "__main__":
    try:
        build()
    except Exception as exc:
        print(f"GAGAL: {exc}", file=sys.stderr)
        raise
