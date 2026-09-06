import { isProductionPiiConfigured } from "@/lib/laporan/crypto";
import { isUpstashConfigured } from "@/lib/security/rate-limit";

function isStaticExport(): boolean {
  return process.env.STATIC_EXPORT === "1" || process.env.GITHUB_PAGES === "1";
}

function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

/**
 * Validates required production secrets before the Node server accepts traffic.
 * Skipped for static export builds (GitHub Pages preview) and `next build`.
 */
export function assertProductionConfig(): void {
  if (process.env.NODE_ENV !== "production" || isStaticExport() || isBuildPhase()) return;

  const missing: string[] = [];
  const warnings: string[] = [];

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (supabaseUrl) {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
      missing.push("SUPABASE_SERVICE_ROLE_KEY");
    }
    if (!isProductionPiiConfigured()) {
      missing.push("LAPORAN_PII_KEY (64 hex) + non-default LAPORAN_PII_SALT");
    }
    // Public laporan POSTs need distributed limits only when Supabase enables writes.
    if (!isUpstashConfigured()) {
      missing.push("UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN");
    }
    if (!process.env.LAPORAN_CRON_SECRET?.trim()) {
      warnings.push("LAPORAN_CRON_SECRET (WhatsApp cron disabled)");
    }
  }

  if (!process.env.WEATHER_CRON_SECRET?.trim()) {
    warnings.push("WEATHER_CRON_SECRET (weather refresh cron disabled)");
  }
  if (!process.env.WEATHER_INOVASI_CRON_SECRET?.trim()) {
    warnings.push("WEATHER_INOVASI_CRON_SECRET (WeatherNext 3 inovasi cron disabled)");
  }
  if (!process.env.OVERLAY_CRON_SECRET?.trim()) {
    warnings.push("OVERLAY_CRON_SECRET (overlay live cron disabled)");
  }

  for (const item of warnings) {
    console.warn(`[production-config] ${item}`);
  }

  if (missing.length > 0) {
    throw new Error(
      `[production-config] Missing required env: ${missing.join("; ")}. See SECURITY.md`
    );
  }

  console.info("[production-config] Production secrets validated");
}
