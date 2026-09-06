import { ACEH_KABUPATEN, findKabupaten } from "@/lib/sik/juklak";

export type StaffInviteInput = {
  email?: string | null;
  displayName?: string | null;
  kodeKabupaten?: string | null;
};

export type StaffInviteReady = {
  email: string;
  displayName: string | null;
  role: "admin_kabkota";
  kodeKabupaten: string;
  kabupaten: string;
};

export type StaffInviteDecision =
  | { ok: true; invite: StaffInviteReady }
  | { ok: false; status: 400; error: string };

function normalizeEmail(value: string | null | undefined): string | null {
  const email = value?.trim().toLowerCase() ?? "";
  if (!email || !email.includes("@") || email.includes(" ")) return null;
  return email;
}

/** POST gelombang ini hanya admin_kabkota dari katalog. */
export function authorizeStaffInvite(input: StaffInviteInput): StaffInviteDecision {
  const email = normalizeEmail(input.email);
  if (!email) return { ok: false, status: 400, error: "email_required" };
  const kab = findKabupaten(input.kodeKabupaten);
  if (!kab) return { ok: false, status: 400, error: "kabupaten_required" };
  const displayName = input.displayName?.trim() || null;
  return {
    ok: true,
    invite: {
      email,
      displayName,
      role: "admin_kabkota",
      kodeKabupaten: kab.kode,
      kabupaten: kab.nama,
    },
  };
}

export function catalogStaffSlots<T extends { kode_kabupaten?: string | null }>(
  profiles: T[],
): Array<{
  kode: string;
  nama: string;
  occupied: boolean;
}> {
  const taken = new Set(
    profiles
      .map((row) => row.kode_kabupaten?.trim())
      .filter((kode): kode is string => Boolean(kode)),
  );
  return ACEH_KABUPATEN.map((kab) => ({
    kode: kab.kode,
    nama: kab.nama,
    occupied: taken.has(kab.kode),
  }));
}

export function isDuplicateKabSlot(
  existingKodes: Array<string | null | undefined>,
  kode: string,
): boolean {
  return existingKodes.some((value) => value?.trim() === kode);
}
