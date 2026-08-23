"use client";

import { ArrowLeft, Home, MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";

export function MapTopBar() {
  const t = useTranslations("map");
  const tn = useTranslations("nav");

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-30 flex justify-center p-2 sm:p-3">
      <div className="map-chrome-elevated pointer-events-auto flex w-full max-w-[1600px] items-center gap-2 rounded-2xl px-2 py-1.5 sm:gap-3 sm:px-3 sm:py-2">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
          <Link
            href="/"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-muted)] text-[var(--text)] transition hover:border-[var(--accent)] hover:bg-[var(--accent-dim)] hover:text-[var(--accent)]"
            aria-label={tn("home")}
            title={tn("home")}
          >
            <ArrowLeft size={16} strokeWidth={2.25} />
          </Link>
          <Link
            href="/"
            className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--text-dim)] transition hover:bg-[var(--accent-dim)] hover:text-[var(--accent)] sm:inline-flex"
            aria-label={tn("home")}
          >
            <Home size={15} />
          </Link>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-tight sm:text-[0.9375rem]">
              {t("title")}
            </div>
            <div className="hidden truncate text-[0.68rem] text-[var(--text-dim)] sm:block">
              {t("subtitle")}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link href="/lapor">
            <Button size="sm" className="rounded-xl px-3 shadow-sm sm:px-3.5">
              {tn("lapor")}
            </Button>
          </Link>
          <details className="relative">
            <summary
              className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-xl border border-transparent text-[var(--text-dim)] transition hover:border-[var(--border)] hover:bg-[var(--bg-muted)] hover:text-[var(--text)] [&::-webkit-details-marker]:hidden"
              aria-label={t("more")}
            >
              <MoreHorizontal size={18} />
            </summary>
            <div className="map-chrome-elevated absolute right-0 top-[calc(100%+0.4rem)] z-40 min-w-[10.5rem] overflow-hidden rounded-xl py-1 text-sm">
              <Link
                href="/"
                className="block px-3 py-2 text-[var(--text)] hover:bg-[var(--accent-dim)]"
              >
                {tn("home")}
              </Link>
              <Link
                href="/lapor"
                className="block px-3 py-2 text-[var(--text)] hover:bg-[var(--accent-dim)]"
              >
                {tn("lapor")}
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
