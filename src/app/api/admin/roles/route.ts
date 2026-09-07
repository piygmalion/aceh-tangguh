import { NextRequest, NextResponse } from "next/server";
import { requireSuperAdminApi } from "@/lib/auth/admin";
import { rejectCrossOrigin } from "@/lib/security/origin";
import { SIK_MODULES, SIK_ROLES, defaultModuleAllowed, normalizedRole } from "@/lib/sik/roles";
import { authorizeRoleMatrixPatch } from "@/lib/sik/staff-manage";
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

function buildFallbackMatrix() {
  const matrix: Record<string, Record<string, boolean>> = {};
  for (const role of SIK_ROLES) {
    const key = normalizedRole(role) ?? role;
    matrix[key] ??= {};
    for (const module of SIK_MODULES) {
      matrix[key][module] = defaultModuleAllowed(role, module);
    }
  }
  return matrix;
}

export async function GET() {
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const svc = requireAdminClient();
  if (!svc.ok) return svc.response;

  const matrix = buildFallbackMatrix();
  const { data } = await svc.client.from("admin_role_modules").select("role, module, allowed");
  for (const row of data ?? []) {
    const role = normalizedRole(row.role as AdminRole);
    if (!role) continue;
    matrix[role] ??= {};
    matrix[role][row.module] = row.allowed;
  }

  return NextResponse.json({
    roles: SIK_ROLES.filter((role) => role !== "admin"),
    modules: SIK_MODULES,
    matrix,
  });
}

export async function PATCH(req: NextRequest) {
  const originErr = rejectCrossOrigin(req);
  if (originErr) return originErr;
  const auth = await requireSuperAdminApi();
  if (!auth.ok) return auth.response;
  const svc = requireAdminClient();
  if (!svc.ok) return svc.response;

  const json = (await req.json().catch(() => null)) as { entries?: unknown } | null;
  const entries = Array.isArray(json?.entries) ? json.entries : [];
  if (!entries.length) return NextResponse.json({ error: "entries_required" }, { status: 400 });

  for (const raw of entries) {
    const row = raw as Record<string, unknown>;
    const decided = authorizeRoleMatrixPatch({
      role: typeof row.role === "string" ? row.role : null,
      module: typeof row.module === "string" ? row.module : null,
      allowed: typeof row.allowed === "boolean" ? row.allowed : null,
    });
    if (!decided.ok) {
      return NextResponse.json({ error: decided.error }, { status: decided.status });
    }
    const { error } = await svc.client.from("admin_role_modules").upsert({
      role: decided.role,
      module: decided.module,
      allowed: decided.allowed,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
