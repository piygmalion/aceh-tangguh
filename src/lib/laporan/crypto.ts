import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import type { JenisBencana } from "./definitions";
import { getKejadianFields, inAcehBounds } from "./definitions";

function piiSalt(): string {
  return process.env.LAPORAN_PII_SALT ?? "aceh-tangguh-dev";
}

function piiKeyHex(): string | undefined {
  return process.env.LAPORAN_PII_KEY?.trim();
}

function encryptionKey(): Buffer | null {
  const keyHex = piiKeyHex();
  if (!keyHex || keyHex.length !== 64) return null;
  return Buffer.from(keyHex, "hex");
}

export function isProductionPiiConfigured(): boolean {
  return encryptionKey() != null && piiSalt() !== "aceh-tangguh-dev";
}

export function assertProductionPii(): void {
  if (process.env.NODE_ENV === "production" && !isProductionPiiConfigured()) {
    throw new Error(
      "LAPORAN_PII_KEY (64 hex) and a non-default LAPORAN_PII_SALT are required in production"
    );
  }
}

export function hashPii(value: string): string {
  return createHash("sha256").update(`${piiSalt()}:${value}`).digest("hex");
}

/** AES-256-GCM when LAPORAN_PII_KEY is set; dev fallback is deterministic hash. */
export function encryptPii(value: string): string {
  const key = encryptionKey();
  if (!key) {
    return createHash("sha256").update(`${piiSalt()}:enc:${value}`).digest("hex");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    "v1",
    iv.toString("base64url"),
    encrypted.toString("base64url"),
    tag.toString("base64url"),
  ].join(":");
}

export function decryptPii(payload: string): string {
  if (!payload.startsWith("v1:")) {
    throw new Error("PII tidak dapat didekripsi (format legacy/dev)");
  }
  const key = encryptionKey();
  if (!key) throw new Error("LAPORAN_PII_KEY tidak dikonfigurasi");

  const parts = payload.split(":");
  if (parts.length !== 4) throw new Error("Format enkripsi PII tidak valid");

  const iv = Buffer.from(parts[1], "base64url");
  const data = Buffer.from(parts[2], "base64url");
  const tag = Buffer.from(parts[3], "base64url");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

export function computeUrgency(jenis: JenisBencana, jawaban: Record<string, unknown>): number {
  const fields = getKejadianFields(jenis);
  let score = 0;
  for (const field of fields) {
    if (!field.opsi) continue;
    const bobotMap = Object.fromEntries(
      field.opsi.filter((o) => o.bobot != null).map((o) => [o.value, o.bobot as number])
    );
    const val = jawaban[field.field_key];
    if (val == null) continue;
    if (Array.isArray(val)) {
      for (const v of val) score += bobotMap[v] ?? 0;
    } else {
      score += bobotMap[String(val)] ?? 0;
    }
  }
  const korban = jawaban.ada_korban;
  if (Array.isArray(korban)) {
    if (korban.includes("terjebak") || korban.includes("tersapu")) score += 5;
    if (korban.includes("meninggal")) score += 4;
  }
  return score;
}

export function validateAcehLocation(lat: number, lon: number): void {
  if (!inAcehBounds(lat, lon)) {
    throw new Error("Koordinat harus berada di wilayah Aceh");
  }
}

export function generateNomor(prefix: string, seq: number): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${prefix}-${y}${m}${day}-${String(seq).padStart(4, "0")}`;
}
