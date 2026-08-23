"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_INTERVAL_MS = 7000;

type Props = {
  imageSrc: string;
  imageAlt?: string;
  /** When set, crossfades through these images instead of a single still. */
  imageSrcs?: readonly string[];
  imageAlts?: readonly string[];
  videoSrc?: string;
  className?: string;
  overlayClassName?: string;
  priority?: boolean;
  intervalMs?: number;
  /** Pause autoplay (e.g. while the hero is hovered). */
  paused?: boolean;
  showDots?: boolean;
};

/** Full-bleed photo/video backdrop with readability overlay (Glass Video Hero vibe). */
export function MediaBackdrop({
  imageSrc,
  imageAlt = "",
  imageSrcs,
  imageAlts,
  videoSrc,
  className,
  overlayClassName,
  priority = false,
  intervalMs = DEFAULT_INTERVAL_MS,
  paused = false,
  showDots = false,
}: Props) {
  const slides = imageSrcs && imageSrcs.length > 0 ? imageSrcs : [imageSrc];
  const [index, setIndex] = useState(0);
  const [hoverPaused, setHoverPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReducedMotion(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (reducedMotion) setIndex(0);
  }, [reducedMotion]);

  const cycling =
    slides.length > 1 && !videoSrc && !reducedMotion && !paused && !hoverPaused;

  useEffect(() => {
    if (!cycling) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % slides.length);
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [cycling, intervalMs, slides.length]);

  const activeIndex = reducedMotion ? 0 : index;

  return (
    <div
      className={cn("absolute inset-0 overflow-hidden", className)}
      aria-hidden
      onMouseEnter={() => setHoverPaused(true)}
      onMouseLeave={() => setHoverPaused(false)}
    >
      {slides.map((src, i) => {
        const alt = imageAlts?.[i] ?? (i === 0 ? imageAlt : "");
        const isActive = i === activeIndex;
        return (
          <Image
            key={src}
            src={src}
            alt={alt}
            fill
            priority={priority && i === 0}
            sizes="100vw"
            className={cn(
              "object-cover",
              !reducedMotion && "transition-opacity duration-1000 ease-in-out",
              isActive ? "opacity-100" : "opacity-0"
            )}
          />
        );
      })}
      {videoSrc ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          poster={imageSrc}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      ) : null}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-b from-black/65 via-black/55 to-[var(--bg)]",
          overlayClassName
        )}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/45 via-black/15 to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_20%_10%,rgba(46,158,78,0.28),transparent_55%)]" />
      {showDots && slides.length > 1 && !reducedMotion ? (
        <div className="pointer-events-none absolute bottom-5 right-5 z-[1] flex gap-1.5">
          {slides.map((src, i) => (
            <span
              key={src}
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-opacity duration-500",
                i === activeIndex ? "bg-white/70" : "bg-white/25"
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
