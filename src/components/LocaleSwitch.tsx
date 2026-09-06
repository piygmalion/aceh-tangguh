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
        "inline-flex items-center rounded-full border border-[var(--glass-border)] bg-[var(--bg-raised)]/50 p-0.5 font-semibold",
        TYPE_FLOOR_CLASS
      )}
      role="group"
      aria-label="Language"
    >
      {(["id", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() =>
            router.replace(pathname as Parameters<typeof router.replace>[0], { locale: l })
          }
          aria-pressed={locale === l}
          className={cn(
            "rounded-full px-2.5 py-1.5 uppercase tracking-wide transition duration-200",
            locale === l
              ? "bg-[var(--primary)] text-[var(--primary-fg)] shadow-sm"
              : "text-[var(--text-dim)] hover:bg-[var(--accent-dim)] hover:text-[var(--accent)]"
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
