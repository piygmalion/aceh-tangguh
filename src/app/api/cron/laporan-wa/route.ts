import { NextResponse } from "next/server";
import { decryptPii } from "@/lib/laporan/crypto";
import {
  buildWhatsAppMessage,
  sendWhatsAppGateway,
  type WaQueueRow,
} from "@/lib/laporan/whatsapp";
import { bearerMatches } from "@/lib/security/bearer";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BATCH = 25;

export async function POST(request: Request) {
  const secret = process.env.LAPORAN_CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "LAPORAN_CRON_SECRET not configured" }, { status: 503 });
  }
  if (!bearerMatches(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase service role missing" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("notifikasi_wa")
    .select("id, laporan_tipe, laporan_id, nomor_tujuan_enc, template_kode, payload_json, status, created_at, sent_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(BATCH);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 502 });
  }

  const rows = (data ?? []) as WaQueueRow[];
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const row of rows) {
    try {
      let phone: string | null = null;
      try {
        phone = decryptPii(row.nomor_tujuan_enc);
      } catch {
        if (process.env.NODE_ENV !== "production") {
          await supabase
            .from("notifikasi_wa")
            .update({ status: "skipped" })
            .eq("id", row.id);
          continue;
        }
        throw new Error("Gagal dekripsi nomor tujuan");
      }

      const payload =
        typeof row.payload_json === "object" && row.payload_json !== null
          ? (row.payload_json as Record<string, unknown>)
          : {};
      const message = buildWhatsAppMessage(row.template_kode, payload);
      await sendWhatsAppGateway(phone!, message);

      await supabase
        .from("notifikasi_wa")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", row.id);
      sent += 1;
    } catch (err) {
      failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${row.id}: ${msg}`);
      await supabase.from("notifikasi_wa").update({ status: "failed" }).eq("id", row.id);
    }
  }

  return NextResponse.json({
    processed: rows.length,
    sent,
    failed,
    errors: errors.slice(0, 10),
  });
}
