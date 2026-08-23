/**
 * POST /api/cron/laporan-wa — process pending WhatsApp queue
 * Env: LAPORAN_CRON_SECRET, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Optional: WHATSAPP_GATEWAY_URL, WHATSAPP_GATEWAY_TOKEN
 */
const secret = process.env.LAPORAN_CRON_SECRET;
const base = process.env.LAPORAN_CRON_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

if (!secret) {
  console.error("Set LAPORAN_CRON_SECRET");
  process.exit(1);
}

const res = await fetch(`${base}/api/cron/laporan-wa`, {
  method: "POST",
  headers: { Authorization: `Bearer ${secret}` },
});

const text = await res.text();
console.log(res.status, text);
