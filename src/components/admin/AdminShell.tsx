"use client";

import type { ReactNode } from "react";
import { Database, FileStack, LayoutDashboard, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { isSuperAdmin, type AdminProfile } from "@/lib/auth/types";
import { TYPE_FLOOR_CLASS, TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

export function AdminShell({
  profile,
  children,
}: {
  profile: AdminProfile;
  children: ReactNode;
}) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const superAdmin = isSuperAdmin(profile);

  const items = [
    { href: "/admin" as const, label: t("navOverview"), icon: LayoutDashboard },
    { href: "/admin/moderasi" as const, label: t("navModeration"), icon: ShieldCheck },
    ...(superAdmin
      ? [
          { href: "/admin/cms" as const, label: t("navCms"), icon: FileStack },
          { href: "/admin/database" as const, label: t("navDatabase"), icon: Database },
        ]
      : []),
  ];

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const roleLabel =
    profile.role === "super_admin" ? t("roleSuperAdmin") : t("roleAdmin");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-3 pb-16 pt-24 md:flex-row md:px-4 md:pt-28">
      <aside className="md:w-56 md:shrink-0">
        <div className="glass rounded-2xl p-3 md:sticky md:top-28">
          <p className={cn("px-2 pb-2 text-[var(--text-dim)]", TYPE_KICKER_CLASS)}>
            {t("console")}
          </p>
          <p className="mb-3 truncate px-2 text-sm">
            {profile.displayName || profile.email}
            <span className={cn("ml-2 rounded-full bg-[var(--primary-dim)] px-2 py-0.5 font-semibold text-[var(--primary)]", TYPE_KICKER_CLASS)}>
              {roleLabel}
            </span>
          </p>
          <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible" aria-label={t("console")}>
            {items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm transition ${
                    active
                      ? "bg-[var(--primary-dim)] font-medium text-[var(--primary)]"
                      : "text-[var(--text-dim)] hover:bg-[var(--primary-dim)] hover:text-[var(--primary)]"
                  }`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      <section className="min-w-0 flex-1">{children}</section>
    </div>
  );
}
