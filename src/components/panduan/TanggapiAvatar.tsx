import { cn } from "@/lib/utils";

export type TanggapiAvatarSize = "fab" | "panel";

const BOX: Record<TanggapiAvatarSize, string> = {
  fab: "h-14 w-14",
  panel: "h-9 w-9",
};

export function TanggapiAvatar({
  size,
  className,
}: {
  size: TanggapiAvatarSize;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 96 96"
      className={cn(BOX[size], "text-[var(--ink)]", className)}
      role="img"
      aria-hidden
    >
      <path d="M8 96c8-28 18-40 40-40s32 12 40 40" fill="var(--forest-400)" />
      <path d="M34 70c4 7 9 11 14 11s10-4 14-11l-14 7z" fill="var(--forest-700)" />
      <ellipse cx="48" cy="64" rx="9" ry="5" fill="var(--paper)" />
      <circle cx="48" cy="38" r="18" fill="var(--paper)" />
      <path
        d="M31.5 36c1.2-12 8-17.5 16.5-17.5S63.4 24 64.5 36c-3.4-6-8.6-9-16.5-9s-13.1 3-16.5 9z"
        fill="currentColor"
      />
      <ellipse cx="41.5" cy="40" rx="1.5" ry="1.9" fill="currentColor" />
      <ellipse cx="54.5" cy="40" rx="1.5" ry="1.9" fill="currentColor" />
      <path
        d="M45 48h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <g transform="translate(48 72)">
        <circle r="6.2" fill="var(--gold)" />
        <circle r="4.4" fill="none" stroke="var(--paper)" strokeWidth="0.9" />
        <path
          d="M0-3.6v7.2M-3.6 0h7.2M-2.4-2.4 2.4 2.4M2.4-2.4-2.4 2.4"
          stroke="var(--paper)"
          strokeWidth="0.85"
          strokeLinecap="round"
        />
        <circle r="1.05" fill="var(--paper)" />
      </g>
    </svg>
  );
}
