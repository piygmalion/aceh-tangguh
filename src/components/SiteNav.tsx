"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { LocaleSwitch } from "@/components/LocaleSwitch";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthMenu } from "@/components/admin/AuthMenu";
import { ReportLaporDropdown } from "@/components/laporan/ReportLaporDropdown";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

type NavItem = {
  key: string;
  href: "/peta" | "/data-bencana" | "/analisis-data" | "/anggaran-bencana" | "/publikasi" | "/destana" | "/nomor-penting" | "/pelatihan" | "/mitra";
  label: string;
};

function navLinkClass(active: boolean, shape: "pill" | "row") {
  const base =
    shape === "pill"
      ? "rounded-full px-3.5 py-2 transition duration-200"
      : "rounded-xl px-3 py-2.5 text-sm transition";
  return `${base} ${
    active
      ? "bg-[var(--primary-dim)] font-medium text-[var(--primary)]"
      : "text-[var(--text-dim)] hover:bg-[var(--primary-dim)] hover:text-[var(--primary)]"
  }`;
}

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
  const groupActive = items.some((item) => isActive(item.href));

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn("inline-flex items-center gap-1 text-sm", navLinkClass(groupActive, "pill"))}
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
              className={`block ${navLinkClass(isActive(item.href), "row")}`}
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
    { key: "anggaranBencana", href: "/anggaran-bencana", label: t("anggaranBencana") },
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

          <nav className="hidden items-center gap-1 text-sm lg:flex" aria-label="Primary" data-nav-ia="desktop">
            <Link href={peta.href} className={navLinkClass(isActive(peta.href), "pill")}>
              {peta.label}
            </Link>
            <NavGroup label={t("data")} items={dataItems} isActive={isActive} />
            <NavGroup label={t("siaga")} items={siagaItems} isActive={isActive} />
            <ReportLaporDropdown className={laporActive ? "ring-2 ring-[var(--ring)]/30 rounded-full" : ""} />
          </nav>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex sm:items-center sm:gap-2">
              <LocaleSwitch />
              <ThemeToggle />
            </div>
            <AuthMenu />
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
            <nav className="flex flex-col gap-1" aria-label="Mobile" data-nav-ia="mobile">
              <Link
                href={peta.href}
                onClick={() => setOpen(false)}
                className={navLinkClass(isActive(peta.href), "row")}
              >
                {peta.label}
              </Link>
              <div className={cn("mt-2 px-3 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
                {t("data")}
              </div>
              {dataItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={navLinkClass(isActive(item.href), "row")}
                >
                  {item.label}
                </Link>
              ))}
              <div className={cn("mt-2 px-3 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
                {t("siaga")}
              </div>
              {siagaItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={navLinkClass(isActive(item.href), "row")}
                >
                  {item.label}
                </Link>
              ))}
              <div className="px-1 py-2">
                <ReportLaporDropdown />
              </div>
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
