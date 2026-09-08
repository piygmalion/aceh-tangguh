import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/auth/admin";
import { authorizeInviteResend, inviteRedirectTo } from "@/lib/auth/email-invite";
import { rejectCrossOrigin } from "@/lib/security/origin";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function requestHost(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    req.headers.get("host") ||
    ""
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;

  const client = createServiceClient();
  if (!client) {
    return NextResponse.json({ error: "Supabase service role missing" }, { status: 503 });
  }

  const { data: profile, error: profileError } = await client
    .from("admin_profiles")
    .select("user_id")
    .eq("user_id", params.id)
    .maybeSingle();
  if (profileError) return NextResponse.json({ error: profileError.message }, { status: 502 });
  if (!profile) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const listed = await client.auth.admin.getUserById(params.id);
  if (listed.error || !listed.data.user) {
    return NextResponse.json({ error: listed.error?.message ?? "not_found" }, { status: 404 });
  }

  const user = listed.data.user;
  const guard = authorizeInviteResend({ emailConfirmedAt: user.email_confirmed_at });
  if (!guard.ok) {
    return NextResponse.json({ error: "already_confirmed" }, { status: 409 });
  }
  if (!user.email) {
    return NextResponse.json({ error: "email_required" }, { status: 400 });
  }

  const redirectTo = inviteRedirectTo({
    originHeader: req.headers.get("origin"),
    requestHost: requestHost(req),
  });
  const invited = await client.auth.admin.inviteUserByEmail(user.email, {
    data: user.user_metadata ?? {},
    redirectTo,
  });
  if (invited.error) {
    return NextResponse.json({ error: "invite_failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
