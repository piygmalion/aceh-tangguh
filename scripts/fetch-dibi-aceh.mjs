/**
 * Refresh public/fixtures/dibi-aceh.json from the public BNPB DIBI dashboard.
 * Usage: node scripts/fetch-dibi-aceh.mjs
 */
import { readFileSync } from "fs";
import { writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { assessDibiLive } from "./dibi-guard.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const BASE = "https://dibi.bnpb.go.id";
const DASHBOARD_URL = `${BASE}/superset/dashboard/2/`;
const DASHBOARD_ID = 2;
const UA =
  "AcehTangguh/0.1 (+https://github.com/piygmalion/aceh-tangguh; DIBI Aceh dashboard)";
const KATEGORI = [
  "Banjir",
  "Longsor",
  "Cuaca ekstrem",
  "Gelombang pasang / Abrasi",
  "Erupsi gunung api",
  "Gempabumi",
  "Kekeringan",
  "Kebakaran hutan dan lahan",
  "Tsunami",
];

const FILTERS = [
  { col: "provinsi", op: "IN", val: ["Aceh"] },
  { col: "is_bencana", op: "IN", val: [true] },
  { col: "kategori_bencana", op: "IN", val: KATEGORI },
];

const METRICS = [
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

function num(value) {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function metricsFromRow(row) {
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

function cookieHeader(res) {
  const bags =
    typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  const raw = bags.length
    ? bags
    : [res.headers.get("set-cookie")].filter(Boolean);
  return raw
    .map((c) => String(c).split(";")[0].trim())
    .filter(Boolean)
    .join("; ");
}

async function dibiFetch(url, { cookie, csrf, body } = {}) {
  const headers = {
    Accept: "application/json",
    "User-Agent": UA,
    Origin: BASE,
    Referer: DASHBOARD_URL,
  };
  if (cookie) headers.Cookie = cookie;
  if (csrf) headers["X-CSRFToken"] = csrf;
  if (body) headers["Content-Type"] = "application/json";
  const res = await fetch(url, {
    method: body ? "POST" : "GET",
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(25_000),
  });
  const nextCookie = cookieHeader(res) || cookie || "";
  const json = await res.json();
  if (!res.ok) {
    const message = json?.errors?.[0]?.message || json?.message || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return { json, cookie: nextCookie };
}

function queryBody(sliceId, columns) {
  return {
    datasource: { id: 1, type: "table" },
    force: false,
    queries: [
      {
        filters: FILTERS,
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
      extra_form_data: { filters: FILTERS },
    },
    result_format: "json",
    result_type: "full",
  };
}

async function querySlice(session, sliceId, columns) {
  const qs = new URLSearchParams({
    form_data: JSON.stringify({ slice_id: sliceId, dashboardId: DASHBOARD_ID }),
    dashboard_id: String(DASHBOARD_ID),
  });
  const { json } = await dibiFetch(`${BASE}/api/v1/chart/data?${qs}`, {
    ...session,
    body: queryBody(sliceId, columns),
  });
  if (json?.errors?.length) {
    throw new Error(json.errors[0].message || "DIBI query error");
  }
  const block = json?.result?.[0];
  if (block?.status && block.status !== "success") {
    throw new Error(`DIBI query status ${block.status}`);
  }
  return Array.isArray(block?.data) ? block.data : [];
}

async function main() {
  const csrfRes = await dibiFetch(`${BASE}/api/v1/security/csrf_token/`);
  const csrf = csrfRes.json?.result;
  if (!csrf) throw new Error("DIBI CSRF token missing");
  const session = { csrf, cookie: csrfRes.cookie };

  const [totalsRows, kategoriRows, kabupatenRows, tahunRows] = await Promise.all([
    querySlice(session, 51, []),
    querySlice(session, 33, ["kategori_bencana"]),
    querySlice(session, 33, ["kabupaten"]),
    querySlice(session, 22, ["tahun"]),
  ]);

  const totals = metricsFromRow(totalsRows[0] ?? {});
  const by_kategori = kategoriRows
    .map((row) => ({
      kategori_bencana: String(row.kategori_bencana ?? ""),
      ...metricsFromRow(row),
    }))
    .filter((row) => row.kategori_bencana)
    .sort((a, b) => b.kejadian - a.kejadian);
  const by_kabupaten = kabupatenRows
    .map((row) => ({
      kabupaten: String(row.kabupaten ?? ""),
      ...metricsFromRow(row),
    }))
    .filter((row) => row.kabupaten)
    .sort((a, b) => b.kejadian - a.kejadian);
  const by_tahun = tahunRows
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
  const payload = {
    metadata: {
      judul: "Dampak kejadian bencana — Provinsi Aceh",
      provinsi: "Aceh",
      source_name: "BNPB DIBI — Data Informasi Bencana Indonesia",
      source_url: DASHBOARD_URL,
      dashboard_id: DASHBOARD_ID,
      dataset: "Dampak kejadian bencana",
      year_from: years[0],
      year_to: years[years.length - 1],
      fetched_at: new Date().toISOString(),
      filters: {
        provinsi: ["Aceh"],
        is_bencana: [true],
        kategori_bencana: KATEGORI,
      },
    },
    totals,
    by_kategori,
    by_kabupaten,
    by_tahun,
  };

  const out = path.join(root, "public/fixtures/dibi-aceh.json");
  let baselineKejadian = null;
  try {
    const previous = JSON.parse(readFileSync(out, "utf8"));
    const previousTotal = previous?.totals?.kejadian;
    baselineKejadian =
      typeof previousTotal === "number" && Number.isFinite(previousTotal)
        ? previousTotal
        : null;
  } catch {
    baselineKejadian = null;
  }
  const verdict = assessDibiLive(payload, baselineKejadian);
  if (!verdict.ok) {
    console.error(
      `DIBI refresh rejected (${verdict.reason}); fixture left unchanged`,
    );
    process.exit(1);
  }
  await writeFile(out, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `Wrote ${out} (${by_kabupaten.length} kab, ${by_tahun.length} years, ${totals.kejadian} events)`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
