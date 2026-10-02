/** Local free media (Unsplash License / Coverr-style stock) plus DJI hero slides. */
const HERO_SLIDE_CREDIT = "Foto aerial DJI — dokumentasi Aceh Tangguh";

/**
 * Statistics-hero aerial. A source constant, not an env var.
 * False keeps the contour hero so this can merge before the photo is approved.
 * lokasi/waktu: konfirmasi pemilik, 2 Okt 2026; kabupaten dan bulan tidak diketahui. Jangan dilengkapi dari kenampakan foto.
 */
export const HERO_PHOTO_ENABLED = false;

export const SITE_MEDIA = {
  heroPoster: {
    src: "/media/hero-slides/01.jpg",
    alt: "Foto aerial DJI — tenda tanggap darurat di pemukiman tepi sungai",
    credit: HERO_SLIDE_CREDIT,
  },
  heroSlides: [
    {
      src: "/media/hero-slides/01.jpg",
      alt: "Foto aerial DJI — tenda tanggap darurat di pemukiman tepi sungai",
    },
    {
      src: "/media/hero-slides/02.jpg",
      alt: "Foto aerial DJI — desa di tepi sungai setelah banjir",
    },
    {
      src: "/media/hero-slides/03.jpg",
      alt: "Foto aerial DJI — permukiman, sungai, dan perbukitan Aceh",
    },
    {
      src: "/media/hero-slides/04.jpg",
      alt: "Foto aerial DJI — jembatan rusak dan sungai keruh pasca banjir",
    },
  ],
  heroVideo: {
    src: "/media/hero-loop.mp4",
    credit: "Video: Coverr / Pexels (free stock)",
  },
  teaser: {
    src: "/media/teaser-aerial.jpg",
    alt: "Pemandangan udara pulau dan laut Indonesia",
    credit: "Foto: Unsplash — Raja Ampat",
    href: "https://unsplash.com/photos/TMsAA2N1lMc",
  },
  forest: {
    src: "/media/forest-mist.jpg",
    alt: "Hutan tropis berkabut",
    credit: "Foto: Unsplash",
    href: "https://unsplash.com/photos/cVFjQGaU9DI",
  },
  community: {
    src: "/media/community.jpg",
    alt: "Kerja gotong royong komunitas",
    credit: "Foto: Unsplash",
    href: "https://unsplash.com/photos/photo-1559027615-cd4628902d4a",
  },
  hills: {
    src: "/media/hills-indo.jpg",
    alt: "Hijau pegunungan Indonesia",
    credit: "Foto: Unsplash — Tumpak Sewu",
    href: "https://unsplash.com/photos/cVFjQGaU9DI",
  },
} as const;

export const UI_CREDITS = [
  {
    name: "Shimmer Button, Blur Fade, Number Ticker, Border Beam, Magic Card",
    source: "Magic UI / 21st.dev community",
    href: "https://21st.dev/",
  },
  {
    name: "Glass Video Hero pattern",
    source: "21st.dev — Rahil Vahora (adapted)",
    href: "https://21st.dev/@rahil1202/components/glass-video-hero",
  },
] as const;
