"use client";

import type { ReactNode } from "react";
import {
  Accessibility,
  Activity,
  BookOpen,
  Boxes,
  Building2,
  Database,
  FileStack,
  Landmark,
  LayoutDashboard,
  Phone,
  ShieldCheck,
  Siren,
  TreePine,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import { isSuperAdmin, type AdminProfile } from "@/lib/auth/types";
import { canAccessModule, normalizedRole, type SikModule } from "@/lib/sik/roles";
import { TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

function roleKey(
  role: AdminProfile["role"]
):
  | "roleSuperAdmin"
  | "roleProvinsi"
  | "roleKabkota"
  | "roleDesa"
  | "rolePenilai"
  | "roleRr"
  | "roleAdmin" {
  const n = normalizedRole(role);
  if (n === "super_admin") return "roleSuperAdmin";
  if (n === "admin_provinsi") return "roleProvinsi";
  if (n === "admin_kabkota") return "roleKabkota";
  if (n === "admin_desa") return "roleDesa";
  if (n === "penilai_pkd") return "rolePenilai";
  if (n === "admin_rr") return "roleRr";
  return "roleAdmin";
}

export function AdminShell({
  profile,
  moduleOverlay,
  children,
}: {
  profile: AdminProfile;
  moduleOverlay?: Record<string, boolean> | null;
  children: ReactNode;
}) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const superAdmin = isSuperAdmin(profile);
  const overlay = moduleOverlay ? new Map(Object.entries(moduleOverlay)) : null;

  const items: Array<{
    href:
      | "/admin"
      | "/admin/operasi"
      | "/admin/moderasi"
      | "/admin/sik/kejadian"
      | "/admin/sik/master"
      | "/admin/sik/logistik"
      | "/admin/sik/destana"
      | "/admin/sik/rehab"
      | "/admin/sik/disabilitas"
      | "/admin/sik/publik"
      | "/admin/staf"
      | "/admin/cms"
      | "/admin/database"
      | "/admin/daily-brief"
      | "/admin/anggaran";
    label: string;
    icon: typeof LayoutDashboard;
    module?: SikModule;
    superOnly?: boolean;
  }> = [
    { href: "/admin", label: t("navOverview"), icon: LayoutDashboard, module: "overview" },
    { href: "/admin/anggaran", label: t("navAnggaran"), icon: Landmark },
    { href: "/admin/operasi", label: t("navOpsDash"), icon: Activity, module: "overview" },
    { href: "/admin/moderasi", label: t("navModeration"), icon: ShieldCheck, module: "moderasi" },
    { href: "/admin/sik/kejadian", label: t("navKejadianOps"), icon: Siren, module: "kejadian" },
    { href: "/admin/sik/master", label: t("navMaster"), icon: Building2, module: "master" },
    { href: "/admin/sik/logistik", label: t("navLogistik"), icon: Boxes, module: "logistik" },
    { href: "/admin/sik/destana", label: t("navDestana"), icon: TreePine, module: "destana" },
    { href: "/admin/sik/rehab", label: t("navRehab"), icon: BookOpen, module: "rehab" },
    { href: "/admin/sik/disabilitas", label: t("navDisabilitas"), icon: Accessibility, module: "disabilitas" },
    { href: "/admin/sik/publik", label: t("navPublikCms"), icon: Phone, module: "publikCms" },
    { href: "/admin/daily-brief", label: t("navDailyBrief"), icon: Phone, module: "dailyBrief" },
    { href: "/admin/staf", label: t("navStaff"), icon: Users, superOnly: true },
    { href: "/admin/cms", label: t("navCms"), icon: FileStack, superOnly: true },
    { href: "/admin/database", label: t("navDatabase"), icon: Database, superOnly: true },
  ];

  const visible = items.filter((item) => {
    if (item.superOnly) return superAdmin;
    if (!item.module) return true;
    return canAccessModule(profile, item.module, overlay);
  });

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

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
              {t(roleKey(profile.role))}
            </span>
          </p>
          <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible" aria-label={t("console")}>
            {visible.map((item) => {
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
