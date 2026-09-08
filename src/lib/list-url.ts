export type KejadianListUrlState = {
  q: string;
  jenis: string;
  kabupaten: string;
  kecamatan: string;
  status: string;
  from: string;
  to: string;
  page: number;
  pageSize: number;
};

export type OpsKejadianListUrlState = {
  q: string;
  status: string;
  page: number;
};

export const KEJADIAN_LIST_PAGE_SIZES = [10, 25, 50] as const;

export const KEJADIAN_LIST_FACET_KEYS = [
  "q",
  "jenis",
  "kabupaten",
  "kecamatan",
  "status",
  "from",
  "to",
] as const satisfies readonly (keyof KejadianListUrlState)[];

export const OPS_KEJADIAN_LIST_FACET_KEYS = [
  "q",
  "status",
] as const satisfies readonly (keyof OpsKejadianListUrlState)[];

const OPS_STATUS = new Set(["draft", "aktif", "selesai", "diarsipkan"]);

function isoDay(value: string | null): string {
  if (!value) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : "";
}

function parsePage(raw: string | null): number {
  if (!raw) return 1;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1) return 1;
  return n;
}

function parsePageSize(raw: string | null): number {
  if (!raw) return 10;
  const n = Number(raw);
  return (KEJADIAN_LIST_PAGE_SIZES as readonly number[]).includes(n) ? n : 10;
}

function clipQuery(raw: string | null): string {
  return (raw ?? "").trim().slice(0, 80);
}

export function parseKejadianListSearchParams(
  params: URLSearchParams
): KejadianListUrlState {
  return {
    q: clipQuery(params.get("q")),
    jenis: params.get("jenis")?.trim() ?? "",
    kabupaten: params.get("kabupaten")?.trim() ?? "",
    kecamatan: params.get("kecamatan")?.trim() ?? "",
    status: params.get("status")?.trim() ?? "",
    from: isoDay(params.get("from")),
    to: isoDay(params.get("to")),
    page: parsePage(params.get("page")),
    pageSize: parsePageSize(params.get("pageSize")),
  };
}

export function kejadianListStateToParams(
  state: KejadianListUrlState
): URLSearchParams {
  const params = new URLSearchParams();
  const q = state.q.trim();
  if (q) params.set("q", q.slice(0, 80));
  if (state.jenis) params.set("jenis", state.jenis);
  if (state.kabupaten) params.set("kabupaten", state.kabupaten);
  if (state.kecamatan) params.set("kecamatan", state.kecamatan);
  if (state.status) params.set("status", state.status);
  if (state.from) params.set("from", state.from);
  if (state.to) params.set("to", state.to);
  if (state.page > 1) params.set("page", String(state.page));
  if (state.pageSize !== 10) params.set("pageSize", String(state.pageSize));
  return params;
}

export function parseOpsKejadianListSearchParams(
  params: URLSearchParams
): OpsKejadianListUrlState {
  const status = params.get("status")?.trim() ?? "";
  return {
    q: clipQuery(params.get("q")),
    status: OPS_STATUS.has(status) ? status : "",
    page: parsePage(params.get("page")),
  };
}

export function opsKejadianListStateToParams(
  state: OpsKejadianListUrlState
): URLSearchParams {
  const params = new URLSearchParams();
  const q = state.q.trim();
  if (q) params.set("q", q.slice(0, 80));
  if (state.status) params.set("status", state.status);
  if (state.page > 1) params.set("page", String(state.page));
  return params;
}

export function applyListPatch<T extends { page: number }>(
  state: T,
  patch: Partial<T>,
  facetKeys: readonly (keyof T)[]
): T {
  const next = { ...state, ...patch };
  const facetChanged = facetKeys.some(
    (key) => Object.prototype.hasOwnProperty.call(patch, key) && patch[key] !== state[key]
  );
  if (facetChanged && patch.page === undefined) {
    next.page = 1;
  }
  return next;
}
