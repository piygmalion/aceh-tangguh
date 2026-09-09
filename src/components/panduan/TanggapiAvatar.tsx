import { cn } from "@/lib/utils";

export type TanggapiAvatarSize = "fab" | "panel";

const BOX: Record<TanggapiAvatarSize, string> = {
  fab: "h-14 w-14",
  panel: "h-9 w-9",
};

/**
 * Civic bust of Tanggapi: Acehnese kupiah meukeutop + forest/orange brand.
 * One viewBox for FAB (56px) and panel (36px); parents already clip to a circle.
 */
export function TanggapiAvatar({
  size,
  className,
}: {
  size: TanggapiAvatarSize;
  className?: string;
}) {
  const clipId = `tanggapi-avatar-clip-${size}`;
  const tenunId = `tanggapi-avatar-tenun-${size}`;

  return (
    <svg
      viewBox="0 0 96 96"
      className={cn(BOX[size], "text-[var(--ink)]", className)}
      role="img"
      aria-hidden
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx="48" cy="48" r="48" />
        </clipPath>
        <pattern
          id={tenunId}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
        >
          <rect width="8" height="8" fill="var(--forest)" />
          <path d="M4 0 8 4 4 8 0 4Z" fill="var(--orange)" />
          <path d="M4 1.8 6.2 4 4 6.2 1.8 4Z" fill="var(--gold)" />
        </pattern>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <circle cx="48" cy="48" r="48" fill="var(--forest)" />
        <circle cx="48" cy="48" r="43.5" fill="var(--orange)" />
        <circle cx="48" cy="48" r="40.6" fill="var(--paper-warm)" />

        <path
          d="M16 74c0-14 10-24 20-18-12 6-14 16-12 24z"
          fill="var(--sage)"
          opacity="0.5"
        />
        <path
          d="M20 84c-2-16 8-26 20-20-12 8-14 16-11 24z"
          fill="var(--sage)"
          opacity="0.32"
        />

        <path d="M7 96c7-24 22-34 41-34s34 10 41 34" fill="var(--forest)" />
        <path
          d="M33 67.5c3.6-4.4 8.6-6.8 15-6.8s11.4 2.4 15 6.8c-4.2 3.4-9.2 5-15 5s-10.8-1.6-15-5z"
          fill="color-mix(in srgb, var(--paper-warm) 72%, var(--gold))"
        />
        <path
          d="M35.5 69c3.6 5.2 8 7.6 12.5 7.6s8.9-2.4 12.5-7.6"
          fill="none"
          stroke="var(--forest-400)"
          strokeWidth="2.1"
          strokeLinecap="round"
        />

        <g transform="translate(48 80.2)">
          <circle r="6.6" fill="var(--gold)" />
          <circle r="5.25" fill="var(--forest)" />
          <path
            d="M0-4.35 0.9-0.9 4.35 0 0.9 0.9 0 4.35-0.9 0.9-4.35 0-0.9-0.9Z"
            fill="var(--gold)"
          />
          <path
            d="M-2.85-2.85 2.85 2.85M2.85-2.85-2.85 2.85"
            stroke="var(--gold)"
            strokeWidth="0.75"
            strokeLinecap="round"
          />
          <circle r="1.2" fill="var(--paper-warm)" />
        </g>

        <path
          d="M31.5 38c-2.6 4-3.4 9.5-2.2 14.5 3-7 5.4-10.5 5.8-14zM64.5 38c2.6 4 3.4 9.5 2.2 14.5-3-7-5.4-10.5-5.8-14z"
          fill="currentColor"
        />

        <path
          d="M30.6 48c-.6 8.4 4.2 17.2 17.4 17.2s18-8.8 17.4-17.2"
          fill="color-mix(in srgb, var(--paper-warm) 78%, var(--gold))"
        />
        <ellipse
          cx="48"
          cy="45.2"
          rx="16.8"
          ry="15.8"
          fill="color-mix(in srgb, var(--paper-warm) 78%, var(--gold))"
        />

        <path
          d="M28.2 34.8c.6-19.2 9.2-24.8 19.8-24.8s19.2 5.6 19.8 24.8c-2-1.2-6.4-2-19.8-2s-17.8.8-19.8 2z"
          fill={`url(#${tenunId})`}
        />
        <path
          d="M29 14.2c2.8-4 10.6-5.8 19-5.8s16.2 1.8 19 5.8c-4.4-1.7-11.4-2.5-19-2.5s-14.6.8-19 2.5z"
          fill="var(--gold)"
        />
        <path
          d="M29.6 20.2h36.8"
          fill="none"
          stroke="var(--gold)"
          strokeWidth="1.2"
        />
        <path
          d="M30 27.2 34.2 23.8 38.4 27.2 42.6 23.8 46.8 27.2 48 26.2 49.2 27.2 53.4 23.8 57.6 27.2 61.8 23.8 66 27.2"
          fill="none"
          stroke="var(--orange)"
          strokeWidth="1.7"
          strokeLinejoin="miter"
        />
        <path
          d="M28.6 34.4h38.8"
          fill="none"
          stroke="var(--orange)"
          strokeWidth="2.4"
        />
        <path
          d="M29.4 34.4 33.6 31.6 37.8 34.4 42 31.6 46.2 34.4 48 32.8 49.8 34.4 54 31.6 58.2 34.4 62.4 31.6 66.6 34.4"
          fill="none"
          stroke="var(--gold)"
          strokeWidth="1.25"
        />
        <ellipse cx="48" cy="16.8" rx="3.2" ry="1.4" fill="var(--gold)" />

        <path
          d="M35.6 40c1.8-1.15 4.2-1.7 6.4-1.25"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <path
          d="M54 40c2.2-.45 4.6.1 6.4 1.25"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
        />
        <ellipse cx="40.6" cy="45" rx="2.55" ry="2.95" fill="currentColor" />
        <ellipse cx="55.4" cy="45" rx="2.55" ry="2.95" fill="currentColor" />
        <circle cx="41.45" cy="44.05" r="0.72" fill="var(--paper)" />
        <circle cx="56.25" cy="44.05" r="0.72" fill="var(--paper)" />
        <ellipse
          cx="40.2"
          cy="49.6"
          rx="2.4"
          ry="1.15"
          fill="var(--orange)"
          opacity="0.22"
        />
        <ellipse
          cx="55.8"
          cy="49.6"
          rx="2.4"
          ry="1.15"
          fill="var(--orange)"
          opacity="0.22"
        />
        <path
          d="M43.6 52.6c1.5 2 2.9 2.7 4.4 2.7s2.9-.7 4.4-2.7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.35"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
