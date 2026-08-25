"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/routing";

export function LocaleSwitch() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      className="inline-flex items-center rounded-full border border-[var(--glass-border)] bg-[var(--bg-raised)]/50 p-0.5 text-xs font-semibold"
      role="group"
      aria-label="Language"
    >
      {(["id", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => router.replace(pathname, { locale: l })}
          aria-pressed={locale === l}
          className={`rounded-full px-2.5 py-1.5 uppercase tracking-wide transition duration-200 ${
            locale === l
              ? "bg-[var(--primary)] text-[var(--primary-fg)] shadow-sm"
              : "text-[var(--text-dim)] hover:text-[var(--text)]"
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
