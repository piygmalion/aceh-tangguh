"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutDashboard, LogIn, LogOut, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/routing";
import { isStaticExport } from "@/lib/preview/env";
import { createAuthBrowserClient } from "@/lib/supabase/ssr-browser";
import type { AdminProfile } from "@/lib/auth/types";
import { TYPE_KICKER_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

type MeResponse = {
  user: { id: string; email: string | null } | null;
  profile: AdminProfile | null;
};

export function AuthMenu() {
  const t = useTranslations("nav");
  const ta = useTranslations("admin");
  const router = useRouter();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const staticPreview = isStaticExport();

  async function refreshMe() {
    try {
      const res = await fetch("/api/admin/me", { cache: "no-store" });
      if (!res.ok) {
        setMe({ user: null, profile: null });
        return;
      }
      setMe((await res.json()) as MeResponse);
    } catch {
      setMe({ user: null, profile: null });
    }
  }

  useEffect(() => {
    if (staticPreview) return;
    void refreshMe();
    const supabase = createAuthBrowserClient();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(() => {
      void refreshMe();
    });
    return () => data.subscription.unsubscribe();
  }, [staticPreview]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function logout() {
    setBusy(true);
    const supabase = createAuthBrowserClient();
    if (supabase) await supabase.auth.signOut();
    setOpen(false);
    setMe({ user: null, profile: null });
    router.refresh();
    router.push("/");
    setBusy(false);
  }

  if (staticPreview) return null;

  if (me === null) {
    return (
      <span
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--glass-border)]"
        aria-hidden
      />
    );
  }

  if (!me.user) {
    return (
      <Link
        href="/admin/login"
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--bg-raised)]/60 px-2.5 text-sm font-medium text-[var(--text)] transition hover:border-[var(--primary)] hover:bg-[var(--primary-dim)] hover:text-[var(--primary)]"
        aria-label={t("login")}
      >
        <LogIn size={16} strokeWidth={2.2} />
        <span className="hidden sm:inline">{t("login")}</span>
      </Link>
    );
  }

  const roleLabel =
    me.profile?.role === "super_admin"
      ? ta("roleSuperAdmin")
      : me.profile?.role === "admin"
        ? ta("roleAdmin")
        : ta("roleNone");

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-9 max-w-[11rem] items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--bg-raised)]/60 px-2.5 text-sm font-medium transition hover:border-[var(--primary)] hover:bg-[var(--primary-dim)]"
      >
        <UserRound size={16} strokeWidth={2.2} />
        <span className="hidden truncate sm:inline">
          {me.profile?.displayName || me.user.email || t("account")}
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 rounded-2xl border border-[var(--glass-border)] bg-[var(--bg-raised)] p-2 shadow-[var(--shadow-elevated)]"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-xs text-[var(--text-dim)]">
              {me.user.email}
            </p>
            <span className={cn("mt-1 inline-flex rounded-full bg-[var(--primary-dim)] px-2 py-0.5 text-[var(--primary)]", TYPE_KICKER_CLASS)}>
              {roleLabel}
            </span>
          </div>
          {me.profile ? (
            <Link
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[var(--text)] hover:bg-[var(--primary-dim)] hover:text-[var(--primary)]"
            >
              <LayoutDashboard size={16} />
              {t("dashboard")}
            </Link>
          ) : (
            <Link
              href="/admin/denied"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-[var(--text-dim)] hover:bg-[var(--primary-dim)]"
            >
              <LayoutDashboard size={16} />
              {ta("deniedShort")}
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            onClick={() => void logout()}
            className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-[var(--danger)] hover:bg-[var(--danger-dim)] disabled:opacity-50"
          >
            <LogOut size={16} />
            {t("logout")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
