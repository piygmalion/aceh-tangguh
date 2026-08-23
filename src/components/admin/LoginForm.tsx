"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/Button";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { createAuthBrowserClient } from "@/lib/supabase/ssr-browser";

export function LoginForm() {
  const t = useTranslations("admin");
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createAuthBrowserClient();
    if (!supabase) {
      setError(t("notConfigured"));
      return;
    }
    setBusy(true);
    const { error: signError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (signError) {
      setError(t("loginFailed"));
      return;
    }
    router.refresh();
    router.replace("/admin");
  }

  return (
    <GlassPanel className="mx-auto w-full max-w-md p-6 sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight">{t("loginTitle")}</h1>
      <p className="mt-1 text-sm text-[var(--text-dim)]">{t("loginLead")}</p>
      <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => void onSubmit(e)}>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t("email")}</span>
          <input
            type="email"
            required
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl border border-[var(--glass-border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[var(--ring)] focus:ring-2"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t("password")}</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl border border-[var(--glass-border)] bg-[var(--bg)] px-3 py-2 text-[var(--text)] outline-none ring-[var(--ring)] focus:ring-2"
          />
        </label>
        {error ? (
          <p className="text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={busy} className="mt-1 w-full">
          {busy ? t("signingIn") : t("signIn")}
        </Button>
      </form>
    </GlassPanel>
  );
}
