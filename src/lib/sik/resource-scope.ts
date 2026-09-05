import type { AdminProfile } from "@/lib/auth/types";
import { isKabScoped, matchesKabScope, scopeKabupaten } from "@/lib/sik/roles";

export const RESOURCE_SCOPE_MODE = {
  instansi: "row_kab",
  pengungsian: "row_kab",
  korban: "kejadian",
  pengungsi: "kejadian",
  kerusakan: "kejadian_row",
  personil: "row_kab",
  peralatan: "row_kab",
  kebutuhan: "row_kab",
  distPersonil: "kejadian",
  distPeralatan: "kejadian",
  distKebutuhan: "kejadian",
  nomorPenting: "provincial",
  pelatihan: "provincial",
  permintaanPelatihan: "provincial",
  disabilitas: "row_kab",
  rehab: "kejadian_row",
  rehabMonitoring: "via_rehab",
  rehabPenerima: "via_rehab",
} as const;

export type SikResourceKey = keyof typeof RESOURCE_SCOPE_MODE;
export type ResourceScopeMode = (typeof RESOURCE_SCOPE_MODE)[SikResourceKey];

export type KabDecision =
  | { ok: true; applyRowKabFilter: boolean }
  | { ok: false; status: 400 | 403; error: string };

function kabOrForbidden(profile: AdminProfile | null): KabDecision | { scoped: true; scope: string } {
  if (!isKabScoped(profile)) return { ok: true, applyRowKabFilter: false };
  const scope = scopeKabupaten(profile);
  if (!scope) return { ok: false, status: 403, error: "forbidden" };
  return { scoped: true, scope };
}

export function authorizeResourceList(
  profile: AdminProfile | null,
  mode: ResourceScopeMode,
  query: { kejadianId: string | null; kebutuhanId: string | null },
): KabDecision {
  const gate = kabOrForbidden(profile);
  if ("ok" in gate) return gate;

  if (mode === "provincial") return { ok: true, applyRowKabFilter: false };
  if (mode === "row_kab") return { ok: true, applyRowKabFilter: true };
  if (mode === "kejadian") {
    if (!query.kejadianId) return { ok: false, status: 400, error: "kejadian_id_required" };
    return { ok: true, applyRowKabFilter: false };
  }
  if (mode === "kejadian_row") {
    if (query.kejadianId) return { ok: true, applyRowKabFilter: false };
    return { ok: true, applyRowKabFilter: true };
  }
  if (!query.kebutuhanId) return { ok: false, status: 400, error: "kebutuhan_id_required" };
  return { ok: true, applyRowKabFilter: false };
}

export function authorizeResourceRow(
  profile: AdminProfile | null,
  mode: ResourceScopeMode,
  ctx: {
    header?: { kode_kabupaten?: string | null; kabupaten?: string | null } | null;
    row?: { kode_kabupaten?: string | null; kabupaten?: string | null } | null;
    parentRehab?: {
      kode_kabupaten?: string | null;
      kabupaten?: string | null;
      kejadian_id?: string | null;
    } | null;
    kejadianId?: string | null;
    kebutuhanId?: string | null;
  },
): { ok: true } | { ok: false; status: 400 | 403; error: string } {
  const gate = kabOrForbidden(profile);
  if ("ok" in gate) {
    if (!gate.ok) return gate;
    return { ok: true };
  }

  if (mode === "provincial") return { ok: true };

  if (mode === "kejadian") {
    if (!ctx.kejadianId) return { ok: false, status: 400, error: "kejadian_id_required" };
    if (!ctx.header) return { ok: false, status: 403, error: "forbidden" };
    return matchesKabScope(profile, ctx.header)
      ? { ok: true }
      : { ok: false, status: 403, error: "forbidden" };
  }

  if (mode === "row_kab") {
    if (!ctx.row) return { ok: false, status: 403, error: "forbidden" };
    return matchesKabScope(profile, ctx.row)
      ? { ok: true }
      : { ok: false, status: 403, error: "forbidden" };
  }

  if (mode === "kejadian_row") {
    if (ctx.kejadianId) {
      if (!ctx.header) return { ok: false, status: 403, error: "forbidden" };
      return matchesKabScope(profile, ctx.header)
        ? { ok: true }
        : { ok: false, status: 403, error: "forbidden" };
    }
    if (!ctx.row) return { ok: false, status: 403, error: "forbidden" };
    return matchesKabScope(profile, ctx.row)
      ? { ok: true }
      : { ok: false, status: 403, error: "forbidden" };
  }

  if (!ctx.kebutuhanId) return { ok: false, status: 400, error: "kebutuhan_id_required" };
  if (!ctx.parentRehab) return { ok: false, status: 400, error: "kebutuhan_id_required" };
  const parentKejadianId = ctx.parentRehab.kejadian_id?.trim() || ctx.kejadianId || null;
  if (parentKejadianId) {
    if (!ctx.header) return { ok: false, status: 403, error: "forbidden" };
    return matchesKabScope(profile, ctx.header)
      ? { ok: true }
      : { ok: false, status: 403, error: "forbidden" };
  }
  return matchesKabScope(profile, ctx.parentRehab)
    ? { ok: true }
    : { ok: false, status: 403, error: "forbidden" };
}

export function isSikResourceKey(value: string): value is SikResourceKey {
  return value in RESOURCE_SCOPE_MODE;
}
