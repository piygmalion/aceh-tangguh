import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/auth/admin";
import { rejectCrossOrigin } from "@/lib/security/origin";
import { isDuplicateKabSlot } from "@/lib/sik/staff-invite";
import {
  authorizeLastSuperGuard,
  authorizeStaffCatalogInvite,
} from "@/lib/sik/staff-manage";
import { normalizedRole } from "@/lib/sik/roles";
import { createServiceClient } from "@/lib/supabase/server";
import type { AdminRole } from "@/lib/supabase/types";

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

async function countSuperAdmins(
  client: NonNullable<ReturnType<typeof createServiceClient>>,
): Promise<number> {
  const { data } = await client.from("admin_profiles").select("role");
  return (data ?? []).filter((row) => normalizedRole(row.role) === "super_admin").length;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const svc = requireAdminClient();
  if (!svc.ok) return svc.response;

  const targetId = params.id;
  const { data: target, error } = await svc.client
    .from("admin_profiles")
    .select("user_id, role, display_name, kode_kabupaten, kabupaten, kode_desa_kelurahan, desa")
    .eq("user_id", targetId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const json = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const nextRole = typeof json?.role === "string" ? json.role : target.role;
  const superCount = await countSuperAdmins(svc.client);
  const changingRole = nextRole !== target.role;
  const demoting = changingRole && normalizedRole(target.role) === "super_admin";

  if (typeof json?.suspended === "boolean") {
    const guard = authorizeLastSuperGuard({
      actorId: auth.profile.userId,
      targetId,
      targetRole: target.role,
      superAdminCount: superCount,
      action: "suspend",
    });
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
    const updated = await svc.client.auth.admin.updateUserById(targetId, {
      ban_duration: json.suspended ? "876000h" : "none",
    });
    if (updated.error) return NextResponse.json({ error: updated.error.message }, { status: 502 });
  }

  if (demoting || (changingRole && targetId === auth.profile.userId)) {
    const guard = authorizeLastSuperGuard({
      actorId: auth.profile.userId,
      targetId,
      targetRole: target.role,
      superAdminCount: superCount,
      action: "demote",
    });
    if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const touchesProfile =
    typeof json?.displayName === "string" ||
    typeof json?.role === "string" ||
    typeof json?.kodeKabupaten === "string" ||
    typeof json?.kodeDesaKelurahan === "string";

  if (!touchesProfile && typeof json?.suspended !== "boolean") {
    return NextResponse.json({ error: "empty_patch" }, { status: 400 });
  }

  if (!touchesProfile) {
    return NextResponse.json({ ok: true });
  }

  let desaLookup: { nama: string; kabupaten?: string | null; kecamatan?: string | null } | null = null;
  if (nextRole === "admin_desa") {
    const kode =
      typeof json?.kodeDesaKelurahan === "string" ? json.kodeDesaKelurahan : target.kode_desa_kelurahan;
    if (kode) {
      const { data } = await svc.client
        .from("profil_desa")
        .select("nama, kabupaten, kecamatan")
        .eq("kode_desa_kelurahan", kode.trim())
        .maybeSingle();
      if (data) desaLookup = data;
    }
  }

  const decided = authorizeStaffCatalogInvite({
    email: "keep@placeholder.test",
    displayName: typeof json?.displayName === "string" ? json.displayName : target.display_name,
    role: nextRole,
    kodeKabupaten: typeof json?.kodeKabupaten === "string" ? json.kodeKabupaten : target.kode_kabupaten,
    kodeDesaKelurahan:
      typeof json?.kodeDesaKelurahan === "string" ? json.kodeDesaKelurahan : target.kode_desa_kelurahan,
    desaLookup,
  });
  if (!decided.ok) {
    return NextResponse.json({ error: decided.error }, { status: decided.status });
  }

  if (decided.invite.role === "admin_kabkota" && decided.invite.kodeKabupaten) {
    const { data: existing, error: existingError } = await svc.client
      .from("admin_profiles")
      .select("user_id, kode_kabupaten")
      .eq("role", "admin_kabkota");
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 502 });
    const others = (existing ?? [])
      .filter((row) => row.user_id !== targetId)
      .map((row) => row.kode_kabupaten);
    if (isDuplicateKabSlot(others, decided.invite.kodeKabupaten)) {
      return NextResponse.json({ error: "kabupaten_occupied" }, { status: 409 });
    }
  }

  const leavingKab = target.role === "admin_kabkota" && decided.invite.role !== "admin_kabkota";
  const { error: updateError } = await svc.client
    .from("admin_profiles")
    .update({
      role: decided.invite.role as AdminRole,
      display_name: decided.invite.displayName,
      kode_kabupaten: leavingKab ? null : decided.invite.kodeKabupaten,
      kabupaten: leavingKab ? null : decided.invite.kabupaten,
      kode_desa_kelurahan: decided.invite.role === "admin_desa" ? decided.invite.kodeDesaKelurahan : null,
      desa: decided.invite.role === "admin_desa" ? decided.invite.desa : null,
      kecamatan: decided.invite.role === "admin_desa" ? decided.invite.kecamatan : null,
    })
    .eq("user_id", targetId);
  if (updateError) {
    const conflict = updateError.code === "23505" || updateError.message.includes("idx_admin_kabkota_kode");
    return NextResponse.json(
      { error: conflict ? "kabupaten_occupied" : updateError.message },
      { status: conflict ? 409 : 502 },
    );
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const svc = requireAdminClient();
  if (!svc.ok) return svc.response;

  const targetId = params.id;
  const { data: target, error } = await svc.client
    .from("admin_profiles")
    .select("user_id, role")
    .eq("user_id", targetId)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  if (!target) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const guard = authorizeLastSuperGuard({
    actorId: auth.profile.userId,
    targetId,
    targetRole: target.role,
    superAdminCount: await countSuperAdmins(svc.client),
    action: "delete",
  });
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const removed = await svc.client.auth.admin.deleteUser(targetId);
  if (removed.error) return NextResponse.json({ error: removed.error.message }, { status: 502 });
  return NextResponse.json({ ok: true });
}
