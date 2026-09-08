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

const MIN_PASSWORD = 8;

export function SetPasswordForm() {
  const t = useTranslations("admin");
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD) {
      setError(t("passwordTooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }
    const supabase = createAuthBrowserClient();
    if (!supabase) {
      setError(t("notConfigured"));
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(t("setPasswordFailed"));
      return;
    }
    router.refresh();
    router.replace("/admin");
  }

  const invalid = Boolean(error);

  return (
    <GlassPanel className="mx-auto w-full max-w-md p-6 sm:p-8">
      <h1 className="text-xl font-semibold tracking-tight">{t("setPasswordTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("setPasswordLead")}</p>
      <form className="mt-6" onSubmit={(e) => void onSubmit(e)}>
        <FieldGroup className="gap-4">
          <Field data-invalid={invalid || undefined}>
            <FieldLabel htmlFor="set-password">{t("password")}</FieldLabel>
            <Input
              id="set-password"
              type="password"
              required
              minLength={MIN_PASSWORD}
              autoComplete="new-password"
              value={password}
              aria-invalid={invalid || undefined}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field data-invalid={invalid || undefined}>
            <FieldLabel htmlFor="set-password-confirm">{t("passwordConfirm")}</FieldLabel>
            <Input
              id="set-password-confirm"
              type="password"
              required
              minLength={MIN_PASSWORD}
              autoComplete="new-password"
              value={confirm}
              aria-invalid={invalid || undefined}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </Field>
          {error ? <FieldError>{error}</FieldError> : null}
          <Button type="submit" disabled={busy} className="w-full" data-icon={busy ? "inline-start" : undefined}>
            {busy ? <Spinner /> : null}
            {busy ? t("setPasswordSaving") : t("setPasswordSubmit")}
          </Button>
        </FieldGroup>
      </form>
    </GlassPanel>
  );
}
