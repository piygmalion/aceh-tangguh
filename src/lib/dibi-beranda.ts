import type { DibiAcehPayload } from "./dibi-types";

export function aggregateDibiBeranda(
  _payload: DibiAcehPayload,
  _filter: {
    yearFrom?: number | null;
    yearTo?: number | null;
    kabupaten?: string | null;
    jenis?: string | null;
  } = {},
): never {
  throw new Error("aggregateDibiBeranda is not implemented");
}
