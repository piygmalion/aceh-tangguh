"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { GlassPanel } from "@/components/ui/GlassPanel";

export function SiteNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const items = [
    { key: "peta", href: "/peta" as const, label: t("peta") },
    { key: "dataBencana", href: "/data-bencana" as const, label: t("dataBencana") },
    { key: "sumberData", href: "/sumber-data" as const, label: t("sumberData") },
    { key: "metodologi", href: "/metodologi" as const, label: t("metodologi") },
    { key: "lapor", href: "/lapor" as const, label: t("lapor") },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div
      data-sitenav
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center p-3 md:p-4"
    >
      <GlassPanel
        className={`pointer-events-auto flex w-full max-w-6xl flex-col gap-0 px-3 py-2.5 transition duration-300 sm:px-4 ${
          scrolled ? "shadow-[var(--shadow-elevated)]" : ""
        } ${open ? "rounded-3xl" : ""}`}
      >
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="shrink-0 rounded-lg px-1.5 py-1 text-sm font-semibold tracking-wide md:text-base"
          >
            Aceh Tangguh
          </Link>

          <nav className="hidden items-center gap-1 text-sm lg:flex" aria-label="Primary">
            {items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`rounded-full px-3.5 py-2 transition duration-200 ${
                    active
                      ? "bg-[var(--accent-dim)] text-[var(--accent)] font-medium"
                      : "text-[var(--text-dim)] hover:bg-[var(--accent-dim)] hover:text-[var(--accent)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <LocaleSwitch />
              <ThemeToggle />
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--glass-border)] lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? t("closeMenu") : t("openMenu")}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {open ? (
          <div
            id="mobile-nav"
            className="mt-3 border-t border-[var(--glass-border)] pt-3 lg:hidden"
          >
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`rounded-xl px-3 py-2.5 text-sm transition ${
                      active
                        ? "bg-[var(--accent-dim)] font-medium text-[var(--accent)]"
                        : "text-[var(--text-dim)] hover:bg-[var(--accent-dim)] hover:text-[var(--accent)]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-[var(--glass-border)] pt-3 sm:hidden">
              <LocaleSwitch />
              <ThemeToggle />
            </div>
          </div>
        ) : null}
      </GlassPanel>
    </div>
  );
}
