import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/auth/admin";
import { rejectCrossOrigin } from "@/lib/security/origin";
import { ACEH_KABUPATEN } from "@/lib/sik/juklak";
import { isDuplicateKabSlot } from "@/lib/sik/staff-invite";
import { authorizeStaffCatalogInvite, isUserSuspended } from "@/lib/sik/staff-manage";
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

async function listAuthUsers(client: NonNullable<ReturnType<typeof createServiceClient>>) {
  const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, users: data.users ?? [] };
}

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const svc = requireAdminClient();
  if (!svc.ok) return svc.response;

  const { data: profiles, error } = await svc.client
    .from("admin_profiles")
    .select(
      "user_id, role, display_name, created_at, kode_kabupaten, kabupaten, kode_desa_kelurahan, desa",
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });

  const listed = await listAuthUsers(svc.client);
  if (!listed.ok) return NextResponse.json({ error: listed.error }, { status: 502 });

  const authById = new Map(
    listed.users.map((user) => {
      const bannedUntil = "banned_until" in user ? (user.banned_until as string | null) : null;
      return [user.id, { email: user.email ?? null, bannedUntil }];
    }),
  );

  const users = (profiles ?? []).map((row) => {
    const authUser = authById.get(row.user_id);
    const bannedUntil = authUser?.bannedUntil ?? null;
    return {
      userId: row.user_id,
      email: authUser?.email ?? null,
      displayName: row.display_name,
      role: row.role,
      createdAt: row.created_at,
      kodeKabupaten: row.kode_kabupaten,
      kabupaten: row.kabupaten,
      kodeDesaKelurahan: row.kode_desa_kelurahan,
      desa: row.desa,
      bannedUntil,
      status: isUserSuspended(bannedUntil) ? "suspended" : "active",
    };
  });

  const kabProfiles = (profiles ?? []).filter((row) => row.role === "admin_kabkota");
  const slots = ACEH_KABUPATEN.map((kab) => {
    const row = kabProfiles.find((item) => item.kode_kabupaten === kab.kode);
    return {
      kode: kab.kode,
      nama: kab.nama,
      occupied: Boolean(row),
      userId: row?.user_id ?? null,
      displayName: row?.display_name ?? null,
      email: row ? (authById.get(row.user_id)?.email ?? null) : null,
    };
  });

  return NextResponse.json({ users, slots });
}

export async function POST(req: NextRequest) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const svc = requireAdminClient();
  if (!svc.ok) return svc.response;

  const json = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const role = typeof json?.role === "string" ? json.role : null;
  let desaLookup: { nama: string; kabupaten?: string | null; kecamatan?: string | null } | null = null;
  if (role === "admin_desa" && typeof json?.kodeDesaKelurahan === "string") {
    const { data } = await svc.client
      .from("profil_desa")
      .select("nama, kabupaten, kecamatan")
      .eq("kode_desa_kelurahan", json.kodeDesaKelurahan.trim())
      .maybeSingle();
    if (data) desaLookup = data;
  }

  const decided = authorizeStaffCatalogInvite({
    email: typeof json?.email === "string" ? json.email : null,
    displayName: typeof json?.displayName === "string" ? json.displayName : null,
    role,
    kodeKabupaten: typeof json?.kodeKabupaten === "string" ? json.kodeKabupaten : null,
    kodeDesaKelurahan: typeof json?.kodeDesaKelurahan === "string" ? json.kodeDesaKelurahan : null,
    desaLookup,
  });
  if (!decided.ok) {
    return NextResponse.json({ error: decided.error }, { status: decided.status });
  }

  if (decided.invite.role === "admin_kabkota" && decided.invite.kodeKabupaten) {
    const { data: existing, error: existingError } = await svc.client
      .from("admin_profiles")
      .select("kode_kabupaten")
      .eq("role", "admin_kabkota");
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 502 });
    if (isDuplicateKabSlot((existing ?? []).map((row) => row.kode_kabupaten), decided.invite.kodeKabupaten)) {
      return NextResponse.json({ error: "kabupaten_occupied" }, { status: 409 });
    }
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
    role: decided.invite.role,
    display_name: decided.invite.displayName,
    kode_kabupaten: decided.invite.kodeKabupaten,
    kabupaten: decided.invite.kabupaten,
    kode_desa_kelurahan: decided.invite.kodeDesaKelurahan,
    desa: decided.invite.desa,
    kecamatan: decided.invite.kecamatan,
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
      user: {
        userId: invited.data.user.id,
        email: decided.invite.email,
        displayName: decided.invite.displayName,
        role: decided.invite.role,
        kodeKabupaten: decided.invite.kodeKabupaten,
        kabupaten: decided.invite.kabupaten,
        kodeDesaKelurahan: decided.invite.kodeDesaKelurahan,
        desa: decided.invite.desa,
        status: "active",
      },
    },
    { status: 201 },
  );
}
