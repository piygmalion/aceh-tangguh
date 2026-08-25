/**
 * Verify laporan masyarakat production setup (tables, env, optional live checks).
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

if (!url || !anon) {
  fail("Supabase anon env", "missing — file-store fallback only");
  process.exit(0);
}

ok("NEXT_PUBLIC_SUPABASE_URL");
ok("NEXT_PUBLIC_SUPABASE_ANON_KEY");

const client = createClient(url, service || anon);

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

// Existence check above uses service role when present (bypasses GRANT).
// Column GRANT lists are in 20260902 (anon) and 20260904 (authenticated);
// this script does not query information_schema.
