import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";
import type { JenisBencana } from "./definitions";
import { getKejadianFields, inAcehBounds } from "./definitions";

const DEFAULT_PII_KEY_ID = "k1";
const PII_KEY_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/;
const PII_KEY_HEX_RE = /^[0-9a-fA-F]{64}$/;

function piiSalt(): string {
  return process.env.LAPORAN_PII_SALT ?? "aceh-tangguh-dev";
}

function parseKeyHex(hex: string | undefined): Buffer | null {
  const trimmed = hex?.trim();
  if (!trimmed || !PII_KEY_HEX_RE.test(trimmed)) return null;
  return Buffer.from(trimmed, "hex");
}

function encryptionKey(): Buffer | null {
  return parseKeyHex(process.env.LAPORAN_PII_KEY);
}

function primaryKeyId(): string {
  const raw = process.env.LAPORAN_PII_KEY_ID?.trim();
  return raw && raw.length > 0 ? raw : DEFAULT_PII_KEY_ID;
}

/** Backup keys from LAPORAN_PII_KEYS=`id=hex64,id2=hex64`. Invalid entries are skipped. */
function parseBackupKeys(): Map<string, Buffer> {
  const map = new Map<string, Buffer>();
  const raw = process.env.LAPORAN_PII_KEYS?.trim();
  if (!raw) return map;
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const id = trimmed.slice(0, eq).trim();
    const hex = trimmed.slice(eq + 1).trim();
    if (!PII_KEY_ID_RE.test(id)) continue;
    const key = parseKeyHex(hex);
    if (!key || map.has(id)) continue;
    map.set(id, key);
  }
  return map;
}

function keysById(): Map<string, Buffer> {
  const map = parseBackupKeys();
  const primary = encryptionKey();
  const id = primaryKeyId();
  if (primary && PII_KEY_ID_RE.test(id)) {
    map.set(id, primary);
  }
  return map;
}

function pushUniqueKey(ordered: Buffer[], seen: Set<string>, key: Buffer): void {
  const fingerprint = key.toString("hex");
  if (seen.has(fingerprint)) return;
  seen.add(fingerprint);
  ordered.push(key);
}

/** Decrypt order: matching key id (v2), then primary, then backups. */
function decryptKeyOrder(preferredId?: string): Buffer[] {
  const primary = encryptionKey();
  if (!primary) return [];
  const backups = parseBackupKeys();
  const byId = keysById();
  const ordered: Buffer[] = [];
  const seen = new Set<string>();
  if (preferredId) {
    const match = byId.get(preferredId);
    if (match) pushUniqueKey(ordered, seen, match);
  }
  pushUniqueKey(ordered, seen, primary);
  for (const key of Array.from(backups.values())) {
    pushUniqueKey(ordered, seen, key);
  }
  return ordered;
}

function tryDecryptGcm(key: Buffer, iv: Buffer, data: Buffer, tag: Buffer): string | null {
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
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

/** AES-256-GCM when LAPORAN_PII_KEY is set; payload is `v2:<keyId>:<iv>:<data>:<tag>`. Dev fallback is deterministic hash. */
export function encryptPii(value: string): string {
  const key = encryptionKey();
  if (!key) {
    return createHash("sha256").update(`${piiSalt()}:enc:${value}`).digest("hex");
  }
  const keyId = primaryKeyId();
  if (!PII_KEY_ID_RE.test(keyId)) {
    throw new Error("LAPORAN_PII_KEY_ID tidak valid");
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    "v2",
    keyId,
    iv.toString("base64url"),
    encrypted.toString("base64url"),
    tag.toString("base64url"),
  ].join(":");
}

export function decryptPii(payload: string): string {
  const parts = payload.split(":");
  const version = parts[0];
  const isV1 = version === "v1" && parts.length === 4;
  const isV2 = version === "v2" && parts.length === 5;

  if (!isV1 && !isV2) {
    if (version === "v1" || version === "v2") {
      throw new Error("Format enkripsi PII tidak valid");
    }
    throw new Error("PII tidak dapat didekripsi (format legacy/dev)");
  }

  if (!encryptionKey()) throw new Error("LAPORAN_PII_KEY tidak dikonfigurasi");

  if (isV1) {
    const iv = Buffer.from(parts[1], "base64url");
    const data = Buffer.from(parts[2], "base64url");
    const tag = Buffer.from(parts[3], "base64url");
    for (const candidate of decryptKeyOrder()) {
      const plain = tryDecryptGcm(candidate, iv, data, tag);
      if (plain != null) return plain;
    }
    throw new Error("PII tidak dapat didekripsi");
  }

  const keyId = parts[1];
  const iv = Buffer.from(parts[2], "base64url");
  const data = Buffer.from(parts[3], "base64url");
  const tag = Buffer.from(parts[4], "base64url");
  for (const candidate of decryptKeyOrder(keyId)) {
    const plain = tryDecryptGcm(candidate, iv, data, tag);
    if (plain != null) return plain;
  }
  throw new Error("PII tidak dapat didekripsi");
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
