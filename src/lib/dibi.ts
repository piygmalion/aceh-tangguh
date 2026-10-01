import { readFile } from "fs/promises";
import path from "path";
import { unstable_cache } from "next/cache";
import { assessDibiLive, chooseDibiDelivery } from "./dibi-guard";
import {
  DIBI_DASHBOARD_URL,
  DIBI_KATEGORI_BENCANA,
  DIBI_PROVINSI,
  EMPTY_DIBI_METRICS,
  type DibiAcehPayload,
  type DibiAcehResponse,
  type DibiKabupatenRow,
  type DibiKategoriRow,
  type DibiMetrics,
  type DibiTahunRow,
} from "./dibi-types";

export type {
  DibiAcehPayload,
  DibiAcehResponse,
  DibiKabupatenRow,
  DibiKategoriRow,
  DibiMetrics,
  DibiSource,
  DibiTahunRow,
} from "./dibi-types";
export {
  DIBI_DASHBOARD_URL,
  DIBI_KATEGORI_BENCANA,
  DIBI_PROVINSI,
  EMPTY_DIBI_METRICS,
  jiwaTerdampak,
  meninggalHilang,
  rumahRusakTotal,
} from "./dibi-types";

const DIBI_BASE = "https://dibi.bnpb.go.id";
const DASHBOARD_ID = 2;
const UA =
  "AcehTangguh/0.1 (+https://github.com/piygmalion/aceh-tangguh; DIBI Aceh dashboard)";

const SLICE = {
  totals: 51,
  kategori: 33,
  kabupaten: 33,
  tahun: 22,
} as const;

type SupersetFilter = {
  col: string;
  op: "IN";
  val: Array<string | boolean | number>;
};

type SupersetMetric =
  | {
      aggregate: "SUM";
      column: { column_name: string; type: "INTEGER" };
      expressionType: "SIMPLE";
      label: string;
    }
  | {
      aggregate: null;
      column: null;
      expressionType: "SQL";
      label: string;
      sqlExpression: string;
    };

const METRICS: SupersetMetric[] = [
  {
    aggregate: "SUM",
    column: { column_name: "jumlah_kejadian", type: "INTEGER" },
    expressionType: "SIMPLE",
    label: "kejadian",
  },
  {
    aggregate: null,
    column: null,
    expressionType: "SQL",
    label: "meninggal",
    sqlExpression: "SUM(meninggal)",
  },
  {
    aggregate: null,
    column: null,
    expressionType: "SQL",
    label: "hilang",
    sqlExpression: "SUM(hilang)",
  },
  {
    aggregate: "SUM",
    column: { column_name: "luka_sakit", type: "INTEGER" },
    expressionType: "SIMPLE",
    label: "luka_sakit",
  },
  {
    aggregate: "SUM",
    column: { column_name: "menderita_mengungsi", type: "INTEGER" },
    expressionType: "SIMPLE",
    label: "menderita_mengungsi",
  },
  {
    aggregate: "SUM",
    column: { column_name: "rumah_rusak_berat", type: "INTEGER" },
    expressionType: "SIMPLE",
    label: "rumah_rusak_berat",
  },
  {
    aggregate: "SUM",
    column: { column_name: "rumah_rusak_sedang", type: "INTEGER" },
    expressionType: "SIMPLE",
    label: "rumah_rusak_sedang",
  },
  {
    aggregate: "SUM",
    column: { column_name: "rumah_rusak_ringan", type: "INTEGER" },
    expressionType: "SIMPLE",
    label: "rumah_rusak_ringan",
  },
  {
    aggregate: "SUM",
    column: { column_name: "rumah_terendam", type: "INTEGER" },
    expressionType: "SIMPLE",
    label: "rumah_terendam",
  },
  {
    aggregate: "SUM",
    column: { column_name: "estimasi_kerugian_rumah", type: "INTEGER" },
    expressionType: "SIMPLE",
    label: "estimasi_kerugian_rumah",
  },
];

const ACEH_FILTERS: SupersetFilter[] = [
  { col: "provinsi", op: "IN", val: [DIBI_PROVINSI] },
  { col: "is_bencana", op: "IN", val: [true] },
  { col: "kategori_bencana", op: "IN", val: [...DIBI_KATEGORI_BENCANA] },
];

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function num(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

function metricsFromRow(row: Record<string, unknown>): DibiMetrics {
  return {
    kejadian: num(row.kejadian),
    meninggal: num(row.meninggal),
    hilang: num(row.hilang),
    luka_sakit: num(row.luka_sakit),
    menderita_mengungsi: num(row.menderita_mengungsi),
    rumah_rusak_berat: num(row.rumah_rusak_berat),
    rumah_rusak_sedang: num(row.rumah_rusak_sedang),
    rumah_rusak_ringan: num(row.rumah_rusak_ringan),
    rumah_terendam: num(row.rumah_terendam),
    estimasi_kerugian_rumah: num(row.estimasi_kerugian_rumah),
  };
}

function cookieHeader(res: Response): string {
  const bags =
    typeof res.headers.getSetCookie === "function"
      ? res.headers.getSetCookie()
      : [];
  const raw = bags.length
    ? bags
    : [res.headers.get("set-cookie")].filter((v): v is string => Boolean(v));
  return raw.map((c) => c.split(";")[0]?.trim() ?? "").filter(Boolean).join("; ");
}

async function dibiJson(
  url: string,
  init: RequestInit & { cookie?: string; csrf?: string } = {},
): Promise<{ json: unknown; cookie: string }> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  headers.set("User-Agent", UA);
  if (init.cookie) headers.set("Cookie", init.cookie);
  if (init.csrf) headers.set("X-CSRFToken", init.csrf);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  headers.set("Origin", DIBI_BASE);
  headers.set("Referer", DIBI_DASHBOARD_URL);

  const res = await fetch(url, {
    ...init,
    headers,
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(25_000),
  });
  const cookie = cookieHeader(res) || init.cookie || "";
  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err = asRecord(json);
    const errors = Array.isArray(err.errors) ? err.errors : [];
    const first = asRecord(errors[0]);
    const message =
      (typeof first.message === "string" && first.message) ||
      (typeof err.message === "string" && err.message) ||
      `DIBI ${res.status}`;
    throw new Error(message);
  }
  return { json, cookie };
}

async function openDibiSession(): Promise<{ csrf: string; cookie: string }> {
  const { json, cookie } = await dibiJson(
    `${DIBI_BASE}/api/v1/security/csrf_token/`,
  );
  const csrf = asRecord(json).result;
  if (typeof csrf !== "string" || !csrf) {
    throw new Error("DIBI CSRF token missing");
  }
  return { csrf, cookie };
}

function queryBody(sliceId: number, columns: string[]) {
  return {
    datasource: { id: 1, type: "table" },
    force: false,
    queries: [
      {
        filters: ACEH_FILTERS,
        extras: { having: "", where: "" },
        applied_time_extras: {},
        columns,
        metrics: METRICS,
        orderby: [[METRICS[0], false]],
        annotation_layers: [],
        row_limit: 10_000,
        series_limit: 0,
        order_desc: true,
        url_params: {},
        custom_params: {},
        custom_form_data: {},
      },
    ],
    form_data: {
      slice_id: sliceId,
      dashboardId: DASHBOARD_ID,
      datasource: "1__table",
      viz_type: "table",
      extra_form_data: { filters: ACEH_FILTERS },
    },
    result_format: "json",
    result_type: "full",
  };
}

async function querySlice(
  session: { csrf: string; cookie: string },
  sliceId: number,
  columns: string[],
): Promise<Record<string, unknown>[]> {
  const qs = new URLSearchParams({
    form_data: JSON.stringify({ slice_id: sliceId, dashboardId: DASHBOARD_ID }),
    dashboard_id: String(DASHBOARD_ID),
  });
  const { json } = await dibiJson(`${DIBI_BASE}/api/v1/chart/data?${qs}`, {
    method: "POST",
    body: JSON.stringify(queryBody(sliceId, columns)),
    csrf: session.csrf,
    cookie: session.cookie,
  });
  const root = asRecord(json);
  if (Array.isArray(root.errors) && root.errors.length) {
    const first = asRecord(root.errors[0]);
    throw new Error(
      typeof first.message === "string" ? first.message : "DIBI query error",
    );
  }
  const result = Array.isArray(root.result) ? root.result[0] : null;
  const block = asRecord(result);
  if (block.status && block.status !== "success") {
    throw new Error(`DIBI query status ${String(block.status)}`);
  }
  const data = Array.isArray(block.data) ? block.data : [];
  return data.map((row) => asRecord(row));
}

function isPayload(value: unknown): value is DibiAcehPayload {
  const rec = asRecord(value);
  const totals = asRecord(rec.totals);
  return (
    typeof rec.metadata === "object" &&
    rec.metadata != null &&
    typeof totals.kejadian === "number" &&
    Array.isArray(rec.by_kategori) &&
    Array.isArray(rec.by_kabupaten) &&
    Array.isArray(rec.by_tahun)
  );
}

async function fetchDibiAcehLive(): Promise<DibiAcehPayload> {
  const session = await openDibiSession();
  const [totalsRows, kategoriRows, kabupatenRows, tahunRows] = await Promise.all(
    [
      querySlice(session, SLICE.totals, []),
      querySlice(session, SLICE.kategori, ["kategori_bencana"]),
      querySlice(session, SLICE.kabupaten, ["kabupaten"]),
      querySlice(session, SLICE.tahun, ["tahun"]),
    ],
  );

  const totals = totalsRows[0]
    ? metricsFromRow(totalsRows[0])
    : { ...EMPTY_DIBI_METRICS };

  const by_kategori: DibiKategoriRow[] = kategoriRows
    .map((row) => ({
      kategori_bencana: String(row.kategori_bencana ?? ""),
      ...metricsFromRow(row),
    }))
    .filter((row) => row.kategori_bencana)
    .sort((a, b) => b.kejadian - a.kejadian);

  const by_kabupaten: DibiKabupatenRow[] = kabupatenRows
    .map((row) => ({
      kabupaten: String(row.kabupaten ?? ""),
      ...metricsFromRow(row),
    }))
    .filter((row) => row.kabupaten)
    .sort((a, b) => b.kejadian - a.kejadian);

  const by_tahun: DibiTahunRow[] = tahunRows
    .map((row) => ({
      tahun: num(row.tahun),
      ...metricsFromRow(row),
    }))
    .filter((row) => row.tahun > 0)
    .sort((a, b) => a.tahun - b.tahun);

  if (!by_kabupaten.length || !by_tahun.length) {
    throw new Error("DIBI Aceh payload empty");
  }

  const years = by_tahun.map((r) => r.tahun);
  return {
    metadata: {
      judul: "Dampak kejadian bencana — Provinsi Aceh",
      provinsi: DIBI_PROVINSI,
      source_name: "BNPB DIBI — Data Informasi Bencana Indonesia",
      source_url: DIBI_DASHBOARD_URL,
      dashboard_id: DASHBOARD_ID,
      dataset: "Dampak kejadian bencana",
      year_from: years[0] ?? 0,
      year_to: years[years.length - 1] ?? 0,
      fetched_at: new Date().toISOString(),
      filters: {
        provinsi: [DIBI_PROVINSI],
        is_bencana: [true],
        kategori_bencana: [...DIBI_KATEGORI_BENCANA],
      },
    },
    totals,
    by_kategori,
    by_kabupaten,
    by_tahun,
  };
}

let lastAcceptedDibi: DibiAcehPayload | null = null;

async function baselineKejadian(): Promise<number | null> {
  try {
    const fixture = await loadDibiAcehFixture();
    return fixture.totals.kejadian;
  } catch {
    return null;
  }
}

const getCachedDibiAceh = unstable_cache(
  async () => {
    const live = await fetchDibiAcehLive();
    const verdict = assessDibiLive(live, await baselineKejadian());
    if (!verdict.ok) {
      throw new Error(`DIBI live rejected: ${verdict.reason}`);
    }
    return live;
  },
  ["dibi-aceh-dashboard-2-guarded"],
  { revalidate: 600, tags: ["dibi"] },
);

async function loadDibiAcehFixture(): Promise<DibiAcehPayload> {
  const file = path.join(process.cwd(), "public/fixtures/dibi-aceh.json");
  const raw = await readFile(file, "utf8");
  const data: unknown = JSON.parse(raw);
  if (!isPayload(data)) throw new Error("Invalid DIBI Aceh fixture");
  return data;
}

export async function getDibiAceh(): Promise<DibiAcehResponse> {
  let live: DibiAcehPayload | null = null;
  try {
    live = await getCachedDibiAceh();
  } catch (err) {
    console.error("[dibi]", err);
  }

  const chosen = chooseDibiDelivery(live, await baselineKejadian(), lastAcceptedDibi);
  if (chosen) {
    lastAcceptedDibi = chosen.payload;
    return { ...chosen.payload, source: "dibi" };
  }

  const fixture = await loadDibiAcehFixture();
  return { ...fixture, source: "fixture" };
}
