/**
 * Verify laporan masyarakat production setup (tables, env, RLS, optional live checks).
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

function ok(label, detail = "") {
  console.log(`✓ ${label}${detail ? ` — ${detail}` : ""}`);
}
function warn(label, detail = "") {
  console.log(`⚠ ${label}${detail ? ` — ${detail}` : ""}`);
}
function fail(label, detail = "") {
  console.log(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
}

function isPermissionDenied(error) {
  if (!error) return false;
  if (error.code === "42501") return true;
  const msg = String(error.message ?? "").toLowerCase();
  return msg.includes("permission denied") || msg.includes("row-level security");
}

console.log("Aceh Tangguh — laporan masyarakat setup check\n");

if (process.env.LAPORAN_PII_KEY?.length === 64) ok("LAPORAN_PII_KEY", "set (AES-256-GCM)");
else fail("LAPORAN_PII_KEY", "missing or invalid — production submits will 503");

if (process.env.LAPORAN_PII_SALT && process.env.LAPORAN_PII_SALT !== "aceh-tangguh-dev") {
  ok("LAPORAN_PII_SALT", "custom");
} else {
  fail("LAPORAN_PII_SALT", "using dev default — production submits will 503");
}

if (process.env.LAPORAN_CRON_SECRET) ok("LAPORAN_CRON_SECRET");
else warn("LAPORAN_CRON_SECRET", "missing — cron disabled");

if (process.env.WHATSAPP_GATEWAY_URL) ok("WHATSAPP_GATEWAY_URL");
else warn("WHATSAPP_GATEWAY_URL", "missing — WA logged in dev only");

if (
  process.env.UPSTASH_REDIS_REST_URL?.trim() &&
  process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
) {
  ok("Upstash Redis", "distributed rate limit configured");
} else {
  fail(
    "Upstash Redis",
    "UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN required in production"
  );
}

if (!url || !anon) {
  fail("Supabase anon env", "missing — file-store fallback only");
  process.exit(0);
}

ok("NEXT_PUBLIC_SUPABASE_URL");
ok("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const client = createClient(url, service || anon);
const anonClient = createClient(url, anon);

const tables = [
  "laporan_pelapor",
  "laporan_kejadian",
  "laporan_penanganan",
  "notifikasi_wa",
];

for (const table of tables) {
  const { error } = await client.from(table).select("id").limit(0);
  if (error) fail(`table ${table}`, error.message);
  else ok(`table ${table}`);
}

if (service) {
  ok("SUPABASE_SERVICE_ROLE_KEY");
  const { data: buckets } = await client.storage.listBuckets();
  const bucket = buckets?.find((b) => b.id === "laporan-media");
  if (bucket) ok("storage bucket laporan-media");
  else warn("storage bucket laporan-media", "not found — run 20260826_laporan_production.sql");
} else {
  fail(
    "SUPABASE_SERVICE_ROLE_KEY",
    "required for laporan writes (20260902) and staff /api/admin/laporan reads (20260904)"
  );
}

// ---------------------------------------------------------------------------
// RLS hardening checks (20260902 + 20260904)
// ---------------------------------------------------------------------------
console.log("\nRLS / GRANT checks (apply 20260902 + 20260904 if any fail):\n");

const rlsTargets = [
  { table: "laporan_kejadian", label: "laporan_kejadian" },
  { table: "laporan_penanganan", label: "laporan_penanganan" },
  { table: "laporan_pelapor", label: "laporan_pelapor" },
  { table: "reports", label: "reports (legacy)" },
];

for (const { table, label } of rlsTargets) {
  const { error } = await anonClient.from(table).insert({}).select("id");
  if (isPermissionDenied(error)) {
    ok(`anon INSERT blocked on ${label}`);
  } else if (!error) {
    fail(`anon INSERT allowed on ${label}`, "apply 20260902_harden_laporan_rls.sql");
  } else {
    warn(`anon INSERT on ${label}`, error.message);
  }
}

const { error: jawabanColError } = await anonClient
  .from("laporan_kejadian")
  .select("jawaban_json")
  .limit(0);

if (jawabanColError) {
  const msg = String(jawabanColError.message ?? "").toLowerCase();
  if (msg.includes("jawaban_json") || msg.includes("column")) {
    ok("anon cannot SELECT jawaban_json on laporan_kejadian");
  } else {
    warn("anon jawaban_json SELECT", jawabanColError.message);
  }
} else {
  fail(
    "anon SELECT jawaban_json on laporan_kejadian",
    "column GRANT too broad — apply 20260902"
  );
}

const { error: pelaporColError } = await anonClient
  .from("laporan_kejadian")
  .select("pelapor_id")
  .limit(0);

if (pelaporColError) {
  const msg = String(pelaporColError.message ?? "").toLowerCase();
  if (msg.includes("pelapor_id") || msg.includes("column")) {
    ok("anon cannot SELECT pelapor_id on laporan_kejadian");
  } else {
    warn("anon pelapor_id SELECT", pelaporColError.message);
  }
} else {
  fail(
    "anon SELECT pelapor_id on laporan_kejadian",
    "column GRANT too broad — apply 20260902"
  );
}

// Existence check above uses service role when present (bypasses GRANT).
// Column GRANT lists are in 20260902 (anon) and 20260904 (authenticated);
// authenticated column checks require a non-staff JWT and are not run here.
