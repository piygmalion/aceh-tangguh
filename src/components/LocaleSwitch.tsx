"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";
import { TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

export function LocaleSwitch() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-white/40 p-0.5",
        TYPE_FLOOR_CLASS
      )}
      role="group"
      aria-label="Language"
    >
      {(["id", "en"] as const).map((l) => {
        const active = locale === l;
        return (
          <button
            key={l}
            type="button"
            onClick={() =>
              router.replace(pathname as Parameters<typeof router.replace>[0], { locale: l })
            }
            aria-pressed={active}
            className={cn(
              "rounded-full px-2.5 py-1.5 uppercase tracking-wide transition duration-200",
              active
                ? "bg-[var(--primary)] font-semibold text-[var(--primary-fg)] underline decoration-2 underline-offset-4"
                : "text-white/70 hover:bg-[var(--accent-dim)] hover:text-[var(--accent)]"
            )}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
