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
        "Aceh Tangguh — laporan diterima.",
        nomor ? `Nomor: ${nomor}.` : "",
        detail ? `Jenis: ${detail}.` : "",
        "Laporan kejadian dimoderasi BPBA Pusdalops sebelum tampil di peta.",
        "Anda akan mendapat pembaruan status via WhatsApp.",
      ]
        .filter(Boolean)
        .join(" ");
    case "laporan_approved":
      return `Aceh Tangguh: laporan ${payload.nomor_laporan ?? ""} disetujui dan dapat tampil di peta publik.`;
    case "laporan_rejected":
      return `Aceh Tangguh: laporan ${payload.nomor_laporan ?? ""} tidak dapat dipublikasikan. Hubungi BPBA Pusdalops jika perlu klarifikasi.`;
    default:
      return `Aceh Tangguh: ${template} ${JSON.stringify(payload)}`;
  }
}

export function normalizeWhatsAppPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("62")) return digits;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
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

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      phone: normalizeWhatsAppPhone(phone),
      message,
      text: message,
    }),
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
