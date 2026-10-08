"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthMenu } from "@/components/admin/AuthMenu";
import { ReportLaporDropdown } from "@/components/laporan/ReportLaporDropdown";
import { EmergencyStrip } from "@/components/EmergencyStrip";
import { NAV_ACCENT_HOVER, NAV_UTILITY_HOVER, navInteractiveClass } from "@/lib/nav-chrome";
import { TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

type NavItem = {
  key: string;
  href: "/peta" | "/data-bencana" | "/analisis-data" | "/publikasi" | "/destana" | "/nomor-penting" | "/pelatihan" | "/mitra";
  label: string;
};

function NavGroup({
  label,
  items,
  isActive,
}: {
  label: string;
  items: NavItem[];
  isActive: (href: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const groupActive = items.some((item) => isActive(item.href));

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn("inline-flex items-center gap-1 text-sm", navInteractiveClass({ active: groupActive, open, shape: "pill", surface: "brand" }))}
      >
        {label}
        <ChevronDown size={14} className={open ? "rotate-180 transition" : "transition"} />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-2 min-w-[220px] rounded-xl border border-[var(--glass-border)] bg-[var(--bg-raised)] p-1 shadow-[var(--shadow-elevated)]">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`block ${navInteractiveClass({ active: isActive(item.href), shape: "row" })}`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SiteNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const peta: NavItem = { key: "peta", href: "/peta", label: t("peta") };
  const dataItems: NavItem[] = [
    { key: "dataBencana", href: "/data-bencana", label: t("dataBencana") },
    { key: "analisisData", href: "/analisis-data", label: t("analisisData") },
    { key: "publikasi", href: "/publikasi", label: t("publikasi") },
  ];
  const siagaItems: NavItem[] = [
    { key: "destana", href: "/destana", label: t("destana") },
    { key: "nomorPenting", href: "/nomor-penting", label: t("nomorPenting") },
    { key: "pelatihan", href: "/pelatihan", label: t("pelatihan") },
    { key: "mitra", href: "/mitra", label: t("mitra") },
  ];

  const laporActive = pathname === "/lapor" || pathname.startsWith("/lapor/");

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
    if (open) document.documentElement.setAttribute("data-mobile-nav", "open");
    else document.documentElement.removeAttribute("data-mobile-nav");
    return () => {
      document.body.style.overflow = "";
      document.documentElement.removeAttribute("data-mobile-nav");
    };
  }, [open]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div data-sitenav className="fixed inset-x-0 top-0 z-50">
      <EmergencyStrip />
      <header
        className={`bg-[var(--primary)] text-[var(--primary-fg)] ${
          scrolled ? "shadow-[var(--shadow-elevated)]" : ""
        }`}
      >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-0 px-3 py-2 sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            aria-label="SIK Aceh, Sistem Informasi Kebencanaan Aceh — beranda"
            className={cn(
              "shrink-0 whitespace-nowrap rounded-lg px-1.5 py-1 text-sm font-semibold text-[var(--primary-fg)] md:text-base",
              NAV_ACCENT_HOVER
            )}
          >
            SIK Aceh
          </Link>

          <nav className="hidden items-center gap-1 text-sm lg:flex" aria-label="Primary" data-nav-ia="desktop">
            <Link href={peta.href} className={navInteractiveClass({ active: isActive(peta.href), shape: "pill", surface: "brand" })}>
              {peta.label}
            </Link>
            <NavGroup label={t("data")} items={dataItems} isActive={isActive} />
            <NavGroup label={t("siaga")} items={siagaItems} isActive={isActive} />
            <ReportLaporDropdown active={laporActive} surface="brand" />
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <LocaleSwitch />
              <ThemeToggle />
            </div>
            <AuthMenu />
            <button
              type="button"
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/40 text-[var(--primary-fg)] lg:hidden",
                NAV_UTILITY_HOVER
              )}
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
            className="mt-3 border-t border-white/30 pt-3 lg:hidden"
          >
            <nav className="flex flex-col gap-1" aria-label="Mobile" data-nav-ia="mobile">
              <Link
                href={peta.href}
                onClick={() => setOpen(false)}
                className={navInteractiveClass({ active: isActive(peta.href), shape: "row", surface: "brand" })}
              >
                {peta.label}
              </Link>
              <div className={cn("mt-2 px-3 text-[var(--primary-fg)]", TYPE_KICKER_CLASS)}>
                {t("data")}
              </div>
              {dataItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={navInteractiveClass({ active: isActive(item.href), shape: "row", surface: "brand" })}
                >
                  {item.label}
                </Link>
              ))}
              <div className={cn("mt-2 px-3 text-[var(--primary-fg)]", TYPE_KICKER_CLASS)}>
                {t("siaga")}
              </div>
              {siagaItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={navInteractiveClass({ active: isActive(item.href), shape: "row", surface: "brand" })}
                >
                  {item.label}
                </Link>
              ))}
              <div className="px-1 py-2">
                <ReportLaporDropdown active={laporActive} surface="brand" />
              </div>
            </nav>
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/30 pt-3 sm:hidden">
              <LocaleSwitch />
              <ThemeToggle />
            </div>
          </div>
        ) : null}
      </div>
      </header>
    </div>
  );
}
