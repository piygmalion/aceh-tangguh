"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  imageSrc: string;
  imageAlt?: string;
  videoSrc?: string;
  className?: string;
  overlayClassName?: string;
  priority?: boolean;
};

/** Full-bleed photo/video backdrop with readability overlay (Glass Video Hero vibe). */
export function MediaBackdrop({
  imageSrc,
  imageAlt = "",
  videoSrc,
  className,
  overlayClassName,
  priority = false,
}: Props) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)} aria-hidden>
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        priority={priority}
        sizes="100vw"
        className="object-cover"
      />
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
          "absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-[var(--bg)]",
          overlayClassName
        )}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_20%_10%,rgba(46,158,78,0.28),transparent_55%)]" />
    </div>
  );
}
