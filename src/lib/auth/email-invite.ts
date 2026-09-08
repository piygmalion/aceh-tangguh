export const PRODUCTION_SITE_ORIGIN = "https://aceh-tangguh.vercel.app";

export type InviteOtpType = "invite" | "email";
export type AppLocale = "id" | "en";

function firstHost(requestHost: string): string {
  return requestHost.split(",")[0]?.trim() ?? "";
}

function originFromHost(host: string): string | null {
  const trimmed = firstHost(host);
  if (!trimmed) return null;
  const proto = trimmed.startsWith("localhost") || trimmed.startsWith("127.0.0.1") ? "http" : "https";
  return `${proto}://${trimmed}`;
}

export function pickInviteOrigin(originHeader: string | null, requestHost: string): string {
  if (originHeader) {
    try {
      const parsed = new URL(originHeader);
      const host = firstHost(requestHost);
      if (host && parsed.host === host && (parsed.protocol === "https:" || parsed.protocol === "http:")) {
        return `${parsed.protocol}//${parsed.host}`;
      }
    } catch {
      // ignore invalid Origin
    }
  }
  return originFromHost(requestHost) ?? PRODUCTION_SITE_ORIGIN;
}

export function inviteConfirmUrl(origin: string): string {
  return `${origin.replace(/\/$/, "")}/auth/confirm`;
}

export function inviteRedirectTo(params: {
  originHeader: string | null;
  requestHost: string;
}): string {
  return inviteConfirmUrl(pickInviteOrigin(params.originHeader, params.requestHost));
}

export function parseInviteOtpType(value: string | null): InviteOtpType | null {
  if (value === "invite" || value === "email") return value;
  return null;
}

export function parseConfirmLocale(value: string | null): AppLocale {
  return value === "en" ? "en" : "id";
}

export function allowlistedSetPasswordPath(next: string | null): string {
  return next === "/admin/set-password" ? next : "/admin/set-password";
}

export function staffSetPasswordPath(locale: AppLocale): string {
  return `/${locale}${allowlistedSetPasswordPath(null)}`;
}

export function inviteConfirmFailurePath(locale: AppLocale): string {
  return `/${locale}/admin/login?error=invite_invalid`;
}

export function isEmailConfirmed(emailConfirmedAt: string | null | undefined): boolean {
  return Boolean(emailConfirmedAt);
}

export function authorizeInviteResend(input: {
  emailConfirmedAt: string | null | undefined;
}): { ok: true } | { ok: false; status: 409; error: "already_confirmed" } {
  if (isEmailConfirmed(input.emailConfirmedAt)) {
    return { ok: false, status: 409, error: "already_confirmed" };
  }
  return { ok: true };
}
