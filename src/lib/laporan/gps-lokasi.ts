import { inAcehBounds } from "@/lib/laporan/definitions";

export type ApplyLokasiOk = {
  ok: true;
  latitude: number;
  longitude: number;
};

export type ApplyLokasiErr = {
  ok: false;
  reason: "invalid" | "outside_aceh";
};

export type ApplyLokasiResult = ApplyLokasiOk | ApplyLokasiErr;

function roundCoord(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export function applyLokasiCoords(lat: unknown, lon: unknown): ApplyLokasiResult {
  const latitude = typeof lat === "number" ? lat : Number(lat);
  const longitude = typeof lon === "number" ? lon : Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ok: false, reason: "invalid" };
  }
  if (!inAcehBounds(latitude, longitude)) {
    return { ok: false, reason: "outside_aceh" };
  }
  return {
    ok: true,
    latitude: roundCoord(latitude),
    longitude: roundCoord(longitude),
  };
}
