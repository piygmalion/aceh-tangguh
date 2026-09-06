"""Naskah Bagian I — Desain frontend, ikon, dan visual."""

from __future__ import annotations

DESAIN = "docs/manual/figures/desain"
TANGKAP = "docs/manual/figures/tangkapan"

FIGURES = [
    (
        f"{DESAIN}/palet-token.png",
        "Palet terkunci",
        "Hue dari src/app/globals.css. Oranye hanya Lapor dan mark hero. Status hanya aman / waspada / siaga / awas.",
        "src/app/globals.css",
    ),
    (
        f"{DESAIN}/skala-tipografi.png",
        "Skala tipografi",
        "Plus Jakarta Sans via next/font (--font-sans). Lantai chrome 13px. Wordmark adalah teks Aceh Tangguh.",
        "src/app/[locale]/layout.tsx; src/lib/type-floor.ts",
    ),
    (
        f"{DESAIN}/komponen-ui.png",
        "Komponen UI",
        "Tombol pil, chip status, kaca nav, shimmer hanya di CTA hero.",
        "src/components/ui/",
    ),
    (
        f"{DESAIN}/ikon-lucide.png",
        "Ikon Lucide yang terpakai",
        "Hanya ikon yang diimpor komponen, bukan katalog Lucide utuh.",
        "import lucide-react di src/components/**",
    ),
    (
        f"{DESAIN}/ikon-peta.png",
        "Ikon peta datar",
        "Glyph public/icons/flat, dipetakan di layer-icons.ts. Overlay memakai ulang file yang sama.",
        "src/lib/layer-icons.ts; public/icons/flat/",
    ),
    (
        f"{DESAIN}/media-kredit.png",
        "Media hero dan teaser",
        "Slide DJI 01–04 plus foto Unsplash warisan. Kredit lengkap di CREDITS.md.",
        "public/media/CREDITS.md",
    ),
    (
        f"{TANGKAP}/beranda-desktop.png",
        "Beranda desktop",
        "Nav kaca, hero foto, mark oranye pada Aceh Tangguh, CTA hutan/oranye, widget Tanggapi. Default data-theme=dark.",
        "/id  ·  1280×800",
    ),
    (
        f"{TANGKAP}/beranda-mobile.png",
        "Beranda mobile",
        "Lebar 390. Menu hamburger Lucide; Lapor tetap pil oranye.",
        "/id  ·  390×844",
    ),
    (
        f"{TANGKAP}/peta.png",
        "Peta workspace",
        "Kanvas penuh, panel layer + ikon datar, FAB plus hijau, tombol Laporkan oranye.",
        "/id/peta",
    ),
    (
        f"{TANGKAP}/destana.png",
        "Destana publik",
        "Jika cuplikan live hang, kartu ini mencatat rute dan komponen. Judul i18n destanaPublic.",
        "/id/destana  ·  DestanaPublicList",
    ),
    (
        f"{TANGKAP}/lapor.png",
        "Hub lapor",
        "ReportChoiceHub: dua kartu kejadian / penanganan, ikon AlertTriangle dan ClipboardCheck.",
        "/id/lapor",
    ),
    (
        f"{TANGKAP}/lapor-kejadian.png",
        "Form laporkan kejadian",
        "Formulir warga, GPS MapPin/Navigation, kirim oranye. PII tidak ditampilkan di cuplikan.",
        "/id/lapor/kejadian",
    ),
    (
        f"{TANGKAP}/data-bencana.png",
        "Data bencana",
        "Katalog kejadian / DIBI. Chrome sama: nav kaca, lantai 13px.",
        "/id/data-bencana",
    ),
    (
        f"{TANGKAP}/nomor-penting.png",
        "Nomor penting",
        "Daftar layanan. EN: /en/emergency-contacts.",
        "/id/nomor-penting",
    ),
    (
        f"{TANGKAP}/pelatihan.png",
        "Pelatihan",
        "Katalog pelatihan publik. EN: /en/training.",
        "/id/pelatihan",
    ),
    (
        f"{TANGKAP}/mitra.png",
        "Mitra",
        "Mitra kebencanaan. EN: /en/partners.",
        "/id/mitra",
    ),
    (
        f"{TANGKAP}/publikasi.png",
        "Publikasi",
        "Katalog + slideshow kegiatan. Ikon Calendar, Clock, User.",
        "/id/publikasi",
    ),
    (
        f"{TANGKAP}/admin-login.png",
        "Login staf",
        "Hanya /id/admin/login. Konsol di balik sesi tidak dicuplik (hindari PII).",
        "LoginForm  ·  pt-28 max-w-lg",
    ),
]


def chapter_blocks() -> list[dict]:
    return [
        {
            "type": "p",
            "text": (
                "Bagian ini mendokumentasikan desain yang sudah jalan di kode, bukan spek Superdesign semata. "
                "Sumber: globals.css, type-floor, komponen ui/, Lucide yang diimpor, layer-icons, dan public/media. "
                "Spek evolusi Superdesign tetap di Bagian F. "
                "Selisih yang sudah tertutup: Plus Jakarta Sans sudah dipasang lewat next/font; html default data-theme=dark."
            ),
        },
        {
            "type": "h2",
            "text": "Prinsip visual",
        },
        {
            "type": "ul",
            "items": [
                "Nada sipil dan operasional, bukan landing SaaS.",
                "Wordmark teks “Aceh Tangguh” — jangan mengarang logo.",
                "Hutan untuk navigasi dan aksi institusi; oranye hanya Lapor dan highlight hero.",
                "Chip status hanya aman / waspada / siaga / awas.",
                "Pil rounded-full; kartu rounded-2xl atau kaca.",
                "Lebar konten publik max-w-6xl; nav mengambang; bagian pertama pt-24/pt-28.",
                "Peta /peta adalah ruang kerja viewport penuh.",
            ],
        },
        {"type": "figure", "rel": f"{DESAIN}/palet-token.png"},
        {
            "type": "h2",
            "text": "Token warna",
        },
        {
            "type": "table",
            "headers": ["Token", "Light", "Dark", "Pakai untuk"],
            "rows": [
                ["--forest / --primary", "#1F4C15", "sage #8A9A5B sebagai primary", "Nav, tombol institusi"],
                ["--accent", "#FF7722", "#FF7722", "Lapor, mark hero"],
                ["--accent-hover / pressed", "#FF8F42 / #C7460C", "sama", "Hover dan pressed Lapor"],
                ["--status-*", "hutan / emas / oranye / #B42318", "sama", "Chip status"],
                ["--paper / --bg / --ink", "#F7F7F4 / #F4F5F0 / #1A1A17", "bg #1A1A17, teks #F7F7F4", "Permukaan dan tinta"],
                ["--chart-1…5", "hutan sage emas oranye teal", "hex sama", "Bagan DIBI / R3P"],
            ],
        },
        {"type": "figure", "rel": f"{DESAIN}/skala-tipografi.png"},
        {
            "type": "h2",
            "text": "Tipografi",
        },
        {
            "type": "p",
            "text": (
                "Plus_Jakarta_Sans weight 400–700, variable --font-sans, className di body. "
                "Cadangan system-ui. Lantai chrome 13px / 0.8125rem (TYPE_FLOOR_CLASS). "
                "Kicker huruf besar, tracking 0.06em, warna sage --accent-soft, bukan oranye. "
                "Angka statistik tabular, weight 600."
            ),
        },
        {"type": "figure", "rel": f"{DESAIN}/komponen-ui.png"},
        {
            "type": "h2",
            "text": "Komponen",
        },
        {
            "type": "table",
            "headers": ["Berkas", "Varian / aturan"],
            "rows": [
                ["Button.tsx", "primary hutan, accent Lapor, ghost, outline, danger; tinggi md 44px"],
                ["Chip.tsx / StatusChip.tsx", "tone ok/warn/danger/info/glass; status-vocab"],
                ["GlassPanel.tsx / MediaBackdrop.tsx", "Kartu kaca dan latar foto"],
                ["shimmer-button.tsx", "Hanya CTA hero; halaman dalam tanpa sparkle"],
                ["blur-fade, border-beam, number-ticker, animated-shiny-text", "Motion 21st.dev; hormati reduced-motion"],
                ["SiteNav / SiteFooter", "Nav kaca max-w-6xl; footer 3 kolom, kredit 13px"],
                ["ReportFAB / ReportLaporDropdown", "Oranye; Plus + ChevronDown"],
                ["TanggapiAvatar", "SVG sendiri (bukan Lucide), token hutan/kertas"],
            ],
        },
        {"type": "figure", "rel": f"{DESAIN}/ikon-lucide.png"},
        {"type": "figure", "rel": f"{DESAIN}/ikon-peta.png"},
        {
            "type": "h2",
            "text": "Ikon",
        },
        {
            "type": "p",
            "text": (
                "UI memakai lucide-react stroke 2, sekitar 18px. "
                "Peta memakai PNG datar di public/icons/flat (kejadian, fasilitas, overlay). "
                "layer-icons.ts memetakan ulang glyph yang sama untuk overlay — jangan menambah seni baru. "
                "Tanggapi memakai SVG khusus di TanggapiAvatar."
            ),
        },
        {"type": "figure", "rel": f"{DESAIN}/media-kredit.png"},
        {
            "type": "h2",
            "text": "Media",
        },
        {
            "type": "p",
            "text": (
                "Hero slideshow: public/media/hero-slides/01.jpg–04.jpg (foto aerial DJI). "
                "Warisan Unsplash: teaser-aerial, forest-mist, hills-indo, community, hero-coast. "
                "hero-loop.mp4 ada di disk tetapi tidak dipakai di belakang hero. "
                "Jangan mengunggah foto korban. Kredit: public/media/CREDITS.md (Bagian Kredit media)."
            ),
        },
        {
            "type": "h2",
            "text": "Cuplikan layar halaman yang ada",
        },
        {
            "type": "p",
            "text": (
                "Diambil dari http://localhost:3130 pada 5 September 2026. "
                "Beranda dan peta adalah tangkapan viewport sungguhan. "
                "Halaman yang hang di server dev (MISSING_MESSAGE panduan atau compile lama) "
                "ditandai kartu keterangan — bukan dasbor staf fiktif. "
                "Konsol /id/admin/* selain login tidak dicuplik."
            ),
        },
        {"type": "figure", "rel": f"{TANGKAP}/beranda-desktop.png"},
        {"type": "figure", "rel": f"{TANGKAP}/beranda-mobile.png"},
        {"type": "figure", "rel": f"{TANGKAP}/peta.png"},
        {"type": "figure", "rel": f"{TANGKAP}/destana.png"},
        {"type": "figure", "rel": f"{TANGKAP}/lapor.png"},
        {"type": "figure", "rel": f"{TANGKAP}/lapor-kejadian.png"},
        {"type": "figure", "rel": f"{TANGKAP}/data-bencana.png"},
        {"type": "figure", "rel": f"{TANGKAP}/nomor-penting.png"},
        {"type": "figure", "rel": f"{TANGKAP}/pelatihan.png"},
        {"type": "figure", "rel": f"{TANGKAP}/mitra.png"},
        {"type": "figure", "rel": f"{TANGKAP}/publikasi.png"},
        {"type": "figure", "rel": f"{TANGKAP}/admin-login.png"},
        {
            "type": "h2",
            "text": "Gerak dan akses",
        },
        {
            "type": "ul",
            "items": [
                "Reveal 0.7s, 18px naik; hormati prefers-reduced-motion.",
                "Hero slideshow 5 detik; jeda saat hover.",
                "Carousel 8px gap, tombol 32px.",
                "Fokus --ring oranye.",
                "Jangan screenshot kolom PII laporan.",
            ],
        },
    ]
