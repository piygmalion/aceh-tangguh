import type { Json } from "@/lib/supabase/types";

type WaPayload = Record<string, unknown>;

export function buildWhatsAppMessage(template: string, payload: WaPayload): string {
  switch (template) {
    case "laporan_submitted":
      const nomor = String(payload.nomor_laporan ?? "");
      const jenis = payload.jenis ? String(payload.jenis) : "";
      const tipe = payload.tipe ? String(payload.tipe) : "";
      const detail = jenis || tipe;
      return [
        "SIK Aceh — laporan diterima.",
        nomor ? `Nomor: ${nomor}.` : "",
        detail ? `Jenis: ${detail}.` : "",
        "Laporan kejadian dimoderasi BPBA Pusdalops sebelum tampil di peta.",
        "Anda akan mendapat pembaruan status via WhatsApp.",
      ]
        .filter(Boolean)
        .join(" ");
    case "laporan_approved":
      return `SIK Aceh: laporan ${payload.nomor_laporan ?? ""} disetujui dan dapat tampil di peta publik.`;
    case "laporan_rejected":
      return `SIK Aceh: laporan ${payload.nomor_laporan ?? ""} tidak dapat dipublikasikan. Hubungi BPBA Pusdalops jika perlu klarifikasi.`;
    case "daily_brief":
      return typeof payload.message === "string" && payload.message.trim()
        ? payload.message
        : "SIK Aceh — ringkasan harian. Untuk darurat hubungi 112 / Pusdalops.";
    default:
      return `SIK Aceh: ${template} ${JSON.stringify(payload)}`;
  }
}

export function normalizeWhatsAppPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

export type WhatsAppGatewayKind = "fonnte" | "wablas" | "generic";

export type WhatsAppGatewayRequest = {
  url: string;
  headers: Record<string, string>;
  body: Record<string, string>;
};

export function classifyWhatsAppGateway(url: string): WhatsAppGatewayKind {
  let host = "";
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return "generic";
  }
  if (host === "api.fonnte.com" || host.endsWith(".fonnte.com")) return "fonnte";
  if (host === "wablas.com" || host.endsWith(".wablas.com")) return "wablas";
  return "generic";
}

export function buildWhatsAppGatewayRequest(
  url: string,
  token: string | undefined,
  phone: string,
  message: string
): WhatsAppGatewayRequest {
  const normalized = normalizeWhatsAppPhone(phone);
  const kind = classifyWhatsAppGateway(url);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (kind === "fonnte") {
    if (token) headers.Authorization = token;
    return { url, headers, body: { target: normalized, message } };
  }
  if (kind === "wablas") {
    if (token) headers.Authorization = token;
    return { url, headers, body: { phone: normalized, message } };
  }
  if (token) headers.Authorization = `Bearer ${token}`;
  return { url, headers, body: { phone: normalized, message, text: message } };
}

export async function sendWhatsAppGateway(phone: string, message: string): Promise<void> {
  const url = process.env.WHATSAPP_GATEWAY_URL?.trim();
  const token = process.env.WHATSAPP_GATEWAY_TOKEN?.trim();

  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("WHATSAPP_GATEWAY_URL tidak dikonfigurasi");
    }
    console.info("[wa:dev] skip send", { phone, message });
    return;
  }

  const req = buildWhatsAppGatewayRequest(url, token, phone, message);
  const res = await fetch(req.url, {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify(req.body),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`WhatsApp gateway ${res.status}: ${body.slice(0, 200)}`);
  }
}

export type WaQueueRow = {
  id: string;
  laporan_tipe: string;
  laporan_id: string;
  nomor_tujuan_enc: string;
  template_kode: string;
  payload_json: Json;
  status: string;
  created_at: string;
  sent_at: string | null;
};
