"use client";

import Image from "next/image";
import { HERO_PHOTO, heroBackgroundMode, heroPhotoCaption, type HeroPhotoMeta } from "@/lib/hero-photo";

export function HeroPhotoBackdrop({
  failed,
  onError,
  meta = null,
}: {
  failed: boolean;
  onError: () => void;
  meta?: HeroPhotoMeta | null;
}) {
  if (heroBackgroundMode(HERO_PHOTO, failed) !== "photo") return null;
  const caption = heroPhotoCaption(meta);
  return (
    <div
      data-hero-bg="photo"
      className="pointer-events-none absolute -top-28 bottom-0 left-1/2 z-0 w-screen -translate-x-1/2 md:-top-32"
    >
      <Image
        src={HERO_PHOTO.src}
        alt={HERO_PHOTO.alt}
        fill
        priority
        sizes="100vw"
        quality={75}
        placeholder="blur"
        blurDataURL={HERO_PHOTO.blurDataURL}
        className="object-cover object-[center_42%]"
        onError={onError}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,17,17,0.94)_0%,rgba(17,17,17,0.92)_100%)]"
      />
      {caption ? (
        <p className="absolute bottom-3 right-4 z-[1] text-[0.8125rem] text-white">{caption}</p>
      ) : null}
    </div>
  );
}
