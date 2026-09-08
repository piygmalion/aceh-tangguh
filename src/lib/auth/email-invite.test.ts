import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRODUCTION_SITE_ORIGIN,
  allowlistedSetPasswordPath,
  authorizeInviteResend,
  inviteConfirmFailurePath,
  inviteConfirmUrl,
  inviteRedirectTo,
  isEmailConfirmed,
  parseConfirmLocale,
  parseInviteOtpType,
  pickInviteOrigin,
  staffSetPasswordPath,
} from "./email-invite";

describe("AN-53 staff email invite helpers", () => {
  it("builds confirm redirectTo on the request origin when the host matches", () => {
    assert.equal(
      inviteRedirectTo({
        originHeader: "http://localhost:3000",
        requestHost: "localhost:3000",
      }),
      "http://localhost:3000/auth/confirm",
    );
    assert.equal(inviteConfirmUrl("https://aceh-tangguh.vercel.app"), "https://aceh-tangguh.vercel.app/auth/confirm");
  });

  it("falls back to production origin when Origin is a different host", () => {
    assert.equal(
      pickInviteOrigin("https://evil.example", "aceh-tangguh.vercel.app"),
      PRODUCTION_SITE_ORIGIN,
    );
    assert.equal(
      inviteRedirectTo({ originHeader: null, requestHost: "" }),
      `${PRODUCTION_SITE_ORIGIN}/auth/confirm`,
    );
  });

  it("accepts only invite and email OTP types", () => {
    assert.equal(parseInviteOtpType("invite"), "invite");
    assert.equal(parseInviteOtpType("email"), "email");
    assert.equal(parseInviteOtpType("recovery"), null);
    assert.equal(parseInviteOtpType("magiclink"), null);
    assert.equal(parseInviteOtpType("sms"), null);
    assert.equal(parseInviteOtpType(""), null);
    assert.equal(parseInviteOtpType(null), null);
  });

  it("allowlists set-password next path and blocks open redirects", () => {
    assert.equal(allowlistedSetPasswordPath(null), "/admin/set-password");
    assert.equal(allowlistedSetPasswordPath("/admin/set-password"), "/admin/set-password");
    assert.equal(allowlistedSetPasswordPath("/admin"), "/admin/set-password");
    assert.equal(allowlistedSetPasswordPath("https://evil.example"), "/admin/set-password");
    assert.equal(allowlistedSetPasswordPath("//evil.example"), "/admin/set-password");
    assert.equal(staffSetPasswordPath("en"), "/en/admin/set-password");
    assert.equal(inviteConfirmFailurePath("id"), "/id/admin/login?error=invite_invalid");
  });

  it("parses locale and confirmation / resend guards", () => {
    assert.equal(parseConfirmLocale("en"), "en");
    assert.equal(parseConfirmLocale("fr"), "id");
    assert.equal(isEmailConfirmed("2026-09-09T00:00:00Z"), true);
    assert.equal(isEmailConfirmed(null), false);
    assert.deepEqual(authorizeInviteResend({ emailConfirmedAt: null }), { ok: true });
    assert.deepEqual(authorizeInviteResend({ emailConfirmedAt: "2026-09-09T00:00:00Z" }), {
      ok: false,
      status: 409,
      error: "already_confirmed",
    });
  });
});
