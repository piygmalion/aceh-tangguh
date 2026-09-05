"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
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

  const invalid = Boolean(error);

  return (
    <GlassPanel className="mx-auto w-full max-w-md p-6 sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight">{t("loginTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("loginLead")}</p>
      <form className="mt-6" onSubmit={(e) => void onSubmit(e)}>
        <FieldGroup className="gap-4">
          <Field data-invalid={invalid || undefined}>
            <FieldLabel htmlFor="login-email">{t("email")}</FieldLabel>
            <Input
              id="login-email"
              type="email"
              required
              autoComplete="username"
              value={email}
              aria-invalid={invalid || undefined}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field data-invalid={invalid || undefined}>
            <FieldLabel htmlFor="login-password">{t("password")}</FieldLabel>
            <Input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              aria-invalid={invalid || undefined}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          {error ? <FieldError>{error}</FieldError> : null}
          <Button type="submit" disabled={busy} className="w-full" data-icon={busy ? "inline-start" : undefined}>
            {busy ? <Spinner /> : null}
            {busy ? t("signingIn") : t("signIn")}
          </Button>
        </FieldGroup>
      </form>
    </GlassPanel>
  );
}
