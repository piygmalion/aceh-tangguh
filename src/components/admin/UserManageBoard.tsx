"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/Chip";
import { Empty, EmptyDescription } from "@/components/ui/empty";
import { FieldError } from "@/components/ui/field";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Skeleton } from "@/components/ui/skeleton";
import { ACEH_KABUPATEN } from "@/lib/sik/juklak";
import { OUTLINE_PRIMARY_CLASS, TYPE_FLOOR_CLASS } from "@/lib/type-floor";
import { cn } from "@/lib/utils";

type StaffUser = {
  userId: string;
  email: string | null;
  displayName: string | null;
  role: string;
  kabupaten: string | null;
  desa: string | null;
  status: "active" | "suspended";
  emailConfirmed: boolean;
};

type RoleMatrix = Record<string, Record<string, boolean>>;

const INVITE_ROLES = [
  "admin_provinsi",
  "admin_kabkota",
  "admin_desa",
  "penilai_pkd",
  "admin_rr",
  "super_admin",
] as const;

const MATRIX_ROLES = [
  "admin_provinsi",
  "admin_kabkota",
  "admin_desa",
  "penilai_pkd",
  "admin_rr",
] as const;

function roleLabelKey(role: string): string {
  if (role === "super_admin") return "roleSuperAdmin";
  if (role === "admin_provinsi" || role === "admin") return "roleProvinsi";
  if (role === "admin_kabkota") return "roleKabkota";
  if (role === "admin_desa") return "roleDesa";
  if (role === "penilai_pkd") return "rolePenilai";
  if (role === "admin_rr") return "roleRr";
  return "roleAdmin";
}

export function UserManageBoard() {
  const t = useTranslations("admin");
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [matrix, setMatrix] = useState<RoleMatrix>({});
  const [modules, setModules] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<string>("admin_provinsi");
  const [kodeKabupaten, setKodeKabupaten] = useState(ACEH_KABUPATEN[0]?.kode ?? "");
  const [kodeDesa, setKodeDesa] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [usersRes, rolesRes] = await Promise.all([
      fetch("/api/admin/users", { cache: "no-store" }),
      fetch("/api/admin/roles", { cache: "no-store" }),
    ]);
    const usersJson = (await usersRes.json().catch(() => null)) as {
      users?: StaffUser[];
      error?: string;
    } | null;
    const rolesJson = (await rolesRes.json().catch(() => null)) as {
      matrix?: RoleMatrix;
      modules?: string[];
      error?: string;
    } | null;
    if (!usersRes.ok) {
      setError(usersJson?.error ?? t("staffLoadError"));
      setUsers([]);
      setLoading(false);
      return;
    }
    setUsers(usersJson?.users ?? []);
    if (rolesRes.ok) {
      setMatrix(rolesJson?.matrix ?? {});
      setModules(rolesJson?.modules ?? []);
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function invite(event: React.FormEvent) {
    event.preventDefault();
    setPending("invite");
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        displayName,
        role,
        kodeKabupaten: role === "admin_kabkota" ? kodeKabupaten : undefined,
        kodeDesaKelurahan: role === "admin_desa" ? kodeDesa : undefined,
      }),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setPending(null);
    if (!res.ok) {
      setError(
        data?.error === "kabupaten_occupied"
          ? t("staffOccupied")
          : data?.error === "desa_not_found" || data?.error === "desa_required"
            ? t("usersDesaError")
            : t("staffInviteError"),
      );
      return;
    }
    setEmail("");
    setDisplayName("");
    await load();
  }

  async function patchUser(userId: string, body: Record<string, unknown>, confirmLabel?: string) {
    if (confirmLabel && !window.confirm(confirmLabel)) return;
    setPending(userId);
    setError(null);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setPending(null);
    if (!res.ok) {
      setError(data?.error === "self" || data?.error === "last_super_admin" ? t("usersGuardError") : t("staffInviteError"));
      return;
    }
    await load();
  }

  async function resendInvite(userId: string) {
    setPending(userId);
    setError(null);
    const res = await fetch(`/api/admin/users/${userId}/resend-invite`, { method: "POST" });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setPending(null);
    if (!res.ok) {
      setError(data?.error === "already_confirmed" ? t("usersAlreadyConfirmed") : t("staffInviteError"));
      return;
    }
    await load();
  }

  async function removeUser(userId: string) {
    if (!window.confirm(t("usersDeleteConfirm"))) return;
    setPending(userId);
    setError(null);
    const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    setPending(null);
    if (!res.ok) {
      setError(data?.error === "self" || data?.error === "last_super_admin" ? t("usersGuardError") : t("staffInviteError"));
      return;
    }
    await load();
  }

  async function saveMatrix() {
    setPending("matrix");
    setError(null);
    const entries = MATRIX_ROLES.flatMap((rowRole) =>
      modules.map((module) => ({
        role: rowRole,
        module,
        allowed: Boolean(matrix[rowRole]?.[module]),
      })),
    );
    const res = await fetch("/api/admin/roles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entries }),
    });
    setPending(null);
    if (!res.ok) {
      setError(t("usersMatrixError"));
      return;
    }
    await load();
  }

  return (
    <div className="flex flex-col gap-4">
      <GlassPanel className="flex flex-col gap-5 p-4 sm:p-6">
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={(event) => void invite(event)}>
          <label className={cn("flex flex-col gap-1", TYPE_FLOOR_CLASS)}>
            {t("usersInviteRole")}
            <select
              className="h-11 rounded-xl border border-[var(--glass-border)] bg-transparent px-3"
              value={role}
              onChange={(event) => setRole(event.target.value)}
            >
              {INVITE_ROLES.map((item) => (
                <option key={item} value={item}>
                  {t(roleLabelKey(item))}
                </option>
              ))}
            </select>
          </label>
          {role === "admin_kabkota" ? (
            <label className={cn("flex flex-col gap-1", TYPE_FLOOR_CLASS)}>
              {t("staffKabupaten")}
              <select
                className="h-11 rounded-xl border border-[var(--glass-border)] bg-transparent px-3"
                value={kodeKabupaten}
                onChange={(event) => setKodeKabupaten(event.target.value)}
              >
                {ACEH_KABUPATEN.map((kab) => (
                  <option key={kab.kode} value={kab.kode}>
                    {kab.kode} · {kab.nama}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {role === "admin_desa" ? (
            <label className={cn("flex flex-col gap-1", TYPE_FLOOR_CLASS)}>
              {t("usersDesaKode")}
              <input
                value={kodeDesa}
                onChange={(event) => setKodeDesa(event.target.value)}
                className="h-11 rounded-xl border border-[var(--glass-border)] bg-transparent px-3"
                inputMode="numeric"
                required
              />
            </label>
          ) : null}
          <label className={cn("flex flex-col gap-1", TYPE_FLOOR_CLASS)}>
            {t("staffEmail")}
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-11 rounded-xl border border-[var(--glass-border)] bg-transparent px-3"
              autoComplete="off"
            />
          </label>
          <label className={cn("flex flex-col gap-1", TYPE_FLOOR_CLASS)}>
            {t("staffDisplayName")}
            <input
              type="text"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              className="h-11 rounded-xl border border-[var(--glass-border)] bg-transparent px-3"
            />
          </label>
          <div className="sm:col-span-2">
            <Button
              type="submit"
              size="sm"
              variant="outline"
              className={OUTLINE_PRIMARY_CLASS}
              disabled={!email.trim() || Boolean(pending)}
            >
              {pending === "invite" ? t("staffInviting") : t("staffInvite")}
            </Button>
          </div>
        </form>
        {error ? (
          <Empty className="border border-dashed" data-testid="users-error">
            <FieldError>{error}</FieldError>
            <Button type="button" size="sm" variant="outline" className={OUTLINE_PRIMARY_CLASS} onClick={() => void load()}>
              {t("retry")}
            </Button>
          </Empty>
        ) : null}
        <div className="overflow-x-auto">
          <table className={cn("min-w-full text-left", TYPE_FLOOR_CLASS)}>
            <thead>
              <tr className="text-[var(--text-dim)]">
                <th className="py-2 pr-3 font-medium">{t("staffDisplayName")}</th>
                <th className="py-2 pr-3 font-medium">{t("staffEmail")}</th>
                <th className="py-2 pr-3 font-medium">{t("usersInviteRole")}</th>
                <th className="py-2 pr-3 font-medium">{t("usersWilayah")}</th>
                <th className="py-2 font-medium">{t("staffColStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? [0, 1, 2].map((row) => (
                    <tr key={row}>
                      <td className="py-3" colSpan={5}>
                        <Skeleton className="h-8 w-full" />
                      </td>
                    </tr>
                  ))
                : users.map((user) => (
                    <tr key={user.userId} className="border-t border-[var(--glass-border)]">
                      <td className="py-2 pr-3">{user.displayName || "—"}</td>
                      <td className="py-2 pr-3">{user.email || "—"}</td>
                      <td className="py-2 pr-3">{t(roleLabelKey(user.role))}</td>
                      <td className="py-2 pr-3">{user.desa || user.kabupaten || "—"}</td>
                      <td className="py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <Chip
                            tone={
                              user.status === "suspended"
                                ? "danger"
                                : user.emailConfirmed
                                  ? "forest"
                                  : "accent"
                            }
                            className={TYPE_FLOOR_CLASS}
                          >
                            {user.status === "suspended"
                              ? t("staffSuspended")
                              : user.emailConfirmed
                                ? t("staffActive")
                                : t("staffPending")}
                          </Chip>
                          {!user.emailConfirmed && user.status !== "suspended" ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className={OUTLINE_PRIMARY_CLASS}
                              disabled={pending === user.userId}
                              onClick={() => void resendInvite(user.userId)}
                            >
                              {pending === user.userId ? t("usersResending") : t("usersResendInvite")}
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className={OUTLINE_PRIMARY_CLASS}
                            disabled={pending === user.userId}
                            onClick={() =>
                              void patchUser(user.userId, { suspended: user.status !== "suspended" })
                            }
                          >
                            {user.status === "suspended" ? t("usersRestore") : t("usersSuspend")}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={pending === user.userId}
                            onClick={() => void removeUser(user.userId)}
                          >
                            {t("usersDelete")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
          {!loading && users.length === 0 && !error ? (
            <Empty className="mt-3 border border-dashed">
              <EmptyDescription className={TYPE_FLOOR_CLASS}>{t("usersEmpty")}</EmptyDescription>
            </Empty>
          ) : null}
        </div>
      </GlassPanel>

      <GlassPanel className="flex flex-col gap-4 p-4 sm:p-6">
        <p className={cn("font-medium", TYPE_FLOOR_CLASS)}>{t("usersRoleMatrix")}</p>
        <div className="overflow-x-auto">
          <table className={cn("min-w-full text-left", TYPE_FLOOR_CLASS)}>
            <thead>
              <tr className="text-[var(--text-dim)]">
                <th className="py-2 pr-3 font-medium">{t("usersInviteRole")}</th>
                {modules.map((module) => (
                  <th key={module} className="py-2 pr-2 font-medium">
                    {module}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MATRIX_ROLES.map((rowRole) => (
                <tr key={rowRole} className="border-t border-[var(--glass-border)]">
                  <td className="py-2 pr-3">{t(roleLabelKey(rowRole))}</td>
                  {modules.map((module) => (
                    <td key={module} className="py-2 pr-2">
                      <input
                        type="checkbox"
                        checked={Boolean(matrix[rowRole]?.[module])}
                        onChange={(event) => {
                          const allowed = event.target.checked;
                          setMatrix((current) => ({
                            ...current,
                            [rowRole]: { ...current[rowRole], [module]: allowed },
                          }));
                        }}
                        aria-label={`${rowRole} ${module}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className={OUTLINE_PRIMARY_CLASS}
          disabled={pending === "matrix"}
          onClick={() => void saveMatrix()}
        >
          {t("usersSaveMatrix")}
        </Button>
      </GlassPanel>
    </div>
  );
}
