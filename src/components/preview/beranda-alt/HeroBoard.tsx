"use client";

import { motion, useReducedMotion } from "motion/react";
import { AlertTriangle, Map } from "lucide-react";
import { Link } from "@/i18n/routing";
import { SITE_MEDIA } from "@/lib/media";
import type { PeringatanTone } from "@/lib/peringatan-dini-types";
import {
  TYPE_FLOOR_CLASS,
  TYPE_HERO_DISPLAY_CLASS,
  TYPE_KICKER_CLASS,
} from "@/lib/type-floor";
import { MediaBackdrop } from "@/components/ui/MediaBackdrop";
import { cn } from "@/lib/utils";
import { useIrbi, usePeringatan } from "./data";
import { desimal, kapitalAwal, rapikanTanda, TONE_CHIP, TONE_DOT, TONE_LABEL } from "./format";

type Feed = {
  key: string;
  bahaya: string;
  lembaga: string;
  detail: string;
  tone: PeringatanTone;
};

const HARI_INI = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/**
 * Photographic situation board. Production hides four of five feeds behind a
 * carousel. This board shows every official feed at once, on the same Aceh aerials.
 */
function BarisStatus({ feed }: { feed: Feed }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn("h-2 w-2 shrink-0 rounded-full", TONE_DOT[feed.tone])}
          aria-hidden
        />
        <div className="min-w-0">
          <p className="truncate text-[0.9375rem] font-medium leading-tight text-[var(--hero-fg)]">
            {feed.bahaya}
          </p>
          <p className={cn("truncate text-white/65", TYPE_FLOOR_CLASS)}>
            {feed.lembaga} <span aria-hidden>·</span> {rapikanTanda(feed.detail)}
          </p>
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-1 font-semibold",
          TYPE_FLOOR_CLASS,
          TONE_CHIP[feed.tone],
        )}
      >
        {TONE_LABEL[feed.tone]}
      </span>
    </li>
  );
}

export function HeroBoard() {
  const reduced = useReducedMotion();
  const { data: pd, isLoading, isError } = usePeringatan();
  const { data: irbi } = useIrbi();

  const feeds: Feed[] = pd
    ? [
        {
          key: "cuaca",
          bahaya: "Cuaca ekstrem",
          lembaga: "BMKG",
          detail: pd.cuaca?.empty
            ? "Tidak ada peringatan"
            : (pd.cuaca?.highlights?.[0]?.kabupaten ?? "Aceh"),
          tone: pd.cuaca?.tone ?? "neutral",
        },
        {
          key: "magma",
          bahaya: "Gempa bumi",
          lembaga: "MAGMA ESDM",
          detail: pd.magma?.empty
            ? "Tidak ada kejadian"
            : (pd.magma?.event?.wilayah ?? "Wilayah Aceh"),
          tone: pd.magma?.tone ?? "neutral",
        },
        {
          key: "sipongi",
          bahaya: "Kebakaran hutan dan lahan",
          lembaga: "SIPONGI",
          detail: pd.sipongi?.empty
            ? "Tidak ada titik panas"
            : (pd.sipongi?.points?.[0]?.kabkota ?? "Aceh"),
          tone: pd.sipongi?.tone ?? "neutral",
        },
        {
          key: "tatonas",
          bahaya: "Tinggi muka air",
          lembaga: "Tatonas",
          detail: pd.tatonas?.empty
            ? "Semua pos normal"
            : (pd.tatonas?.highlights?.[0]?.pos_name ?? "Pos pantau"),
          tone: pd.tatonas?.tone ?? "neutral",
        },
        ...(pd.maritim
          ? [
              {
                key: "maritim",
                bahaya: "Gelombang laut",
                lembaga: "BMKG Maritim",
                detail: pd.maritim.empty
                  ? "Perairan aman"
                  : (pd.maritim.highlights?.[0]?.nama ?? "Perairan Aceh"),
                tone: pd.maritim.tone,
              } satisfies Feed,
            ]
          : []),
      ]
    : [];

  const perluPerhatian = feeds.filter((f) => f.tone !== "neutral").length;
  const masuk = reduced
    ? { initial: false as const, animate: { opacity: 1 } }
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
      };

  return (
    <section
      id="beranda"
      className="relative flex min-h-[100dvh] flex-col justify-end overflow-hidden px-4 pb-28 pt-24 text-[var(--hero-fg)] sm:pt-28"
    >
      <MediaBackdrop
        imageSrc={SITE_MEDIA.heroPoster.src}
        imageAlt={SITE_MEDIA.heroPoster.alt}
        imageSrcs={SITE_MEDIA.heroSlides.map((slide) => slide.src)}
        imageAlts={SITE_MEDIA.heroSlides.map((slide) => slide.alt)}
        priority
        overlayClassName="hero-gradient"
      />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-12 lg:items-end lg:gap-12">
        <motion.div
          className="lg:col-span-7"
          initial={masuk.initial}
          animate={masuk.animate}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className={cn("flex items-center gap-2.5 text-[var(--accent-soft)]", TYPE_KICKER_CLASS)}>
            <span className="relative flex h-2 w-2" aria-hidden title="Data diperbarui otomatis">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent)] opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent)]" />
            </span>
            Aceh hari ini
          </p>

          <h1 className={cn("mt-5 max-w-[16ch]", TYPE_HERO_DISPLAY_CLASS)}>
            Bahaya hari ini dan risiko jangka panjang
          </h1>

          <p className="mt-5 max-w-xl text-[1.0625rem] leading-relaxed text-[var(--hero-muted)]">
            Lima sumber resmi, 23 kabupaten/kota, dan jejak anggaran penanganan dalam satu papan.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/peta"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 text-sm font-semibold text-[var(--primary-fg)] transition hover:bg-[var(--primary-hover)] active:scale-[0.98]"
            >
              Buka peta
              <Map size={17} aria-hidden />
            </Link>
            <Link
              href="/lapor/kejadian"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 text-sm font-semibold text-[var(--accent-fg)] transition hover:bg-[var(--accent-hover)] active:scale-[0.98]"
            >
              Laporkan kejadian
              <AlertTriangle size={17} aria-hidden />
            </Link>
          </div>
        </motion.div>

        <motion.aside
          className="overflow-hidden rounded-2xl border border-white/12 bg-[rgba(26,26,23,0.78)] text-[var(--hero-fg)] shadow-[var(--shadow-elevated)] backdrop-blur-xl [backdrop-filter:blur(20px)_saturate(1.6)] lg:col-span-5 [@media(prefers-reduced-transparency:reduce)]:bg-[#1A1A17] [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none"
          aria-labelledby="papan-status"
          initial={masuk.initial}
          animate={masuk.animate}
          transition={{ duration: 0.55, delay: reduced ? 0 : 0.08, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-end justify-between gap-3 border-b border-white/10 px-4 py-3.5">
            <h2 id="papan-status" className="text-[1.0625rem] font-semibold leading-tight">
              Status Aceh hari ini
            </h2>
            <span className={cn("shrink-0 text-white/60", TYPE_FLOOR_CLASS)}>
              {HARI_INI.format(new Date())}
            </span>
          </div>

          <div className="px-4 py-1">
            {isLoading ? (
              <ul className="divide-y divide-white/10">
                {Array.from({ length: 4 }).map((_, i) => (
                  <li key={i} className="flex items-center gap-3 py-3.5" aria-hidden>
                    <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-white/20" />
                    <span className="h-3.5 flex-1 animate-pulse rounded bg-white/15" />
                  </li>
                ))}
              </ul>
            ) : null}

            {isError ? (
              <p className={cn("py-6 text-center text-white/70", TYPE_FLOOR_CLASS)}>
                Data peringatan belum bisa dimuat. Coba muat ulang halaman.
              </p>
            ) : null}

            {feeds.length > 0 ? (
              <ul className="divide-y divide-white/10">
                {feeds.map((feed) => (
                  <BarisStatus key={feed.key} feed={feed} />
                ))}
              </ul>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-white/10 bg-black/20 px-4 py-3">
            <div className="min-w-0">
              <p className={cn("text-white/60", TYPE_FLOOR_CLASS)}>
                Indeks risiko bencana provinsi
              </p>
              <p className="mt-0.5 flex items-baseline gap-2">
                {irbi ? (
                  <span className="text-[1.375rem] font-semibold tabular-nums leading-none tracking-[-0.03em]">
                    {desimal(irbi.nilai_irb_provinsi, 2)}
                  </span>
                ) : (
                  <span
                    className="inline-block h-[1.1rem] w-16 animate-pulse rounded bg-white/15 motion-reduce:animate-none"
                    aria-hidden
                  />
                )}
                {irbi ? (
                  <span className={cn("font-semibold text-[var(--accent)]", TYPE_FLOOR_CLASS)}>
                    Kelas {kapitalAwal(irbi.kelas_risiko_provinsi)}
                  </span>
                ) : null}
              </p>
            </div>
            <a
              href="#risiko"
              className={cn(
                "shrink-0 rounded-full border border-white/18 bg-white/8 px-3 py-1.5 font-semibold text-[var(--hero-fg)] transition-colors hover:border-white/40",
                TYPE_FLOOR_CLASS,
              )}
            >
              {perluPerhatian > 0 ? `${perluPerhatian} perlu perhatian` : "Rincian risiko"}
            </a>
          </div>
        </motion.aside>
      </div>
    </section>
  );
}
