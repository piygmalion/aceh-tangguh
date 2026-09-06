import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/auth/admin";
import { rejectCrossOrigin } from "@/lib/security/origin";
import { ACEH_KABUPATEN } from "@/lib/sik/juklak";
import {
  authorizeStaffInvite,
  inviteStatusFromAuthUser,
  isDuplicateKabSlot,
} from "@/lib/sik/staff-invite";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function requireAdminClient() {
  const client = createServiceClient();
  if (!client) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: "Supabase service role missing" }, { status: 503 }),
    };
  }
  return { ok: true as const, client };
}

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const svc = requireAdminClient();
  if (!svc.ok) return svc.response;

  const { data: profiles, error } = await svc.client
    .from("admin_profiles")
    .select("user_id, role, display_name, kode_kabupaten, kabupaten")
    .eq("role", "admin_kabkota");
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  const { data: usersPage, error: usersError } = await svc.client.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (usersError) return NextResponse.json({ error: usersError.message }, { status: 502 });

  const userById = new Map((usersPage.users ?? []).map((user) => [user.id, user]));

  const slots = ACEH_KABUPATEN.map((kab) => {
    const row = (profiles ?? []).find((item) => item.kode_kabupaten === kab.kode);
    const user = row ? userById.get(row.user_id) : undefined;
    const occupied = Boolean(row);
    return {
      kode: kab.kode,
      nama: kab.nama,
      occupied,
      userId: row?.user_id ?? null,
      displayName: row?.display_name ?? null,
      email: occupied ? (user?.email ?? null) : null,
      inviteStatus: inviteStatusFromAuthUser({
        occupied,
        lastSignInAt: user?.last_sign_in_at ?? null,
      }),
    };
  });

  return NextResponse.json({ slots });
}

export async function POST(req: NextRequest) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const svc = requireAdminClient();
  if (!svc.ok) return svc.response;

  const json = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const decided = authorizeStaffInvite({
    email: typeof json?.email === "string" ? json.email : null,
    displayName: typeof json?.displayName === "string" ? json.displayName : null,
    kodeKabupaten: typeof json?.kodeKabupaten === "string" ? json.kodeKabupaten : null,
  });
  if (!decided.ok) {
    return NextResponse.json({ error: decided.error }, { status: decided.status });
  }

  const { data: existing, error: existingError } = await svc.client
    .from("admin_profiles")
    .select("kode_kabupaten")
    .eq("role", "admin_kabkota");
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 502 });
  if (isDuplicateKabSlot((existing ?? []).map((row) => row.kode_kabupaten), decided.invite.kodeKabupaten)) {
    return NextResponse.json({ error: "kabupaten_occupied" }, { status: 409 });
  }

  const invited = await svc.client.auth.admin.inviteUserByEmail(decided.invite.email, {
    data: { display_name: decided.invite.displayName },
  });
  if (invited.error || !invited.data.user) {
    return NextResponse.json(
      { error: invited.error?.message ?? "invite_failed" },
      { status: 502 },
    );
  }

  const { error: insertError } = await svc.client.from("admin_profiles").insert({
    user_id: invited.data.user.id,
    role: "admin_kabkota",
    display_name: decided.invite.displayName,
    kode_kabupaten: decided.invite.kodeKabupaten,
    kabupaten: decided.invite.kabupaten,
  });
  if (insertError) {
    await svc.client.auth.admin.deleteUser(invited.data.user.id);
    const conflict = insertError.code === "23505" || insertError.message.includes("idx_admin_kabkota_kode");
    return NextResponse.json(
      { error: conflict ? "kabupaten_occupied" : insertError.message },
      { status: conflict ? 409 : 502 },
    );
  }

  return NextResponse.json(
    {
      slot: {
        kode: decided.invite.kodeKabupaten,
        nama: decided.invite.kabupaten,
        occupied: true,
        userId: invited.data.user.id,
        displayName: decided.invite.displayName,
        email: decided.invite.email,
        inviteStatus: inviteStatusFromAuthUser({ occupied: true, lastSignInAt: null }),
      },
    },
    { status: 201 },
  );
}
