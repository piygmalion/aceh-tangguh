import { createServiceClient, type TypedSupabaseClient } from "@/lib/supabase/server";
import { isProductionPiiConfigured } from "@/lib/laporan/crypto";

export class LaporanConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LaporanConfigError";
  }
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

export type LaporanWriter =
  | { kind: "supabase"; client: TypedSupabaseClient }
  | { kind: "file" };

/**
 * Writes (insert PII / laporan / WA queue) never use the anon key.
 * Production requires service role + AES PII key. Local without Supabase
 * may fall back to `.data/` file-store.
 */
export function requireLaporanWriter(): LaporanWriter {
  if (isProduction() && !isProductionPiiConfigured()) {
    throw new LaporanConfigError(
      "LAPORAN_PII_KEY and a non-default LAPORAN_PII_SALT are required in production"
    );
  }

  const client = createServiceClient();
  if (client) {
    if (!isProductionPiiConfigured() && isProduction()) {
      throw new LaporanConfigError("PII encryption is not configured");
    }
    return { kind: "supabase", client };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (supabaseUrl) {
    throw new LaporanConfigError(
      "SUPABASE_SERVICE_ROLE_KEY is required for laporan writes when Supabase is configured"
    );
  }

  if (isProduction()) {
    throw new LaporanConfigError(
      "Laporan file-store is disabled in production — configure Supabase service role"
    );
  }

  return { kind: "file" };
}
