"use client";

import React from "react";
import Image from "next/image";
import { HERO_PHOTO_ENABLED } from "@/lib/media";
import { HERO_PHOTO, heroBackgroundMode, heroPhotoCaption, type HeroPhotoMeta } from "@/lib/hero-photo";

export function HeroPhotoBackdrop({
  failed,
  onError,
  enabled = HERO_PHOTO_ENABLED,
  meta = HERO_PHOTO,
}: {
  failed: boolean;
  onError: () => void;
  enabled?: boolean;
  meta?: HeroPhotoMeta | null;
}) {
  if (heroBackgroundMode(HERO_PHOTO, failed, enabled) !== "photo") return null;
  const caption = heroPhotoCaption(meta);
  return (
    <>
      <div
        data-hero-bg="photo"
        className="pointer-events-none absolute -top-28 bottom-0 left-1/2 z-0 w-screen -translate-x-1/2 overflow-hidden border-b border-[var(--border)] md:-top-32"
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
          className="object-cover object-[center_58%]"
          onError={onError}
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(90deg,rgba(17,17,17,0.72)_0%,rgba(17,17,17,0.50)_55%,rgba(17,17,17,0.46)_100%)]"
        />
      </div>
      {caption ? (
        <p className="pointer-events-none absolute bottom-3 right-4 z-20 max-w-[18rem] rounded-md bg-[#111111]/90 px-2 py-1 text-right text-[0.8125rem] leading-snug text-white">
          {caption}
        </p>
      ) : null}
    </>
  );
}
