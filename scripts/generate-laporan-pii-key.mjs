/**
 * Generate LAPORAN_PII_KEY (64 hex chars = 32 bytes) for production .env
 * Usage: node scripts/generate-laporan-pii-key.mjs
 */
import { randomBytes } from "crypto";

const key = randomBytes(32).toString("hex");
const salt = randomBytes(16).toString("hex");

console.log("Add to production environment (never commit):");
console.log(`LAPORAN_PII_KEY=${key}`);
console.log(`LAPORAN_PII_SALT=${salt}`);
