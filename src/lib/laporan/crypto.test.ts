import { createCipheriv, randomBytes } from "node:crypto";
import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import { decryptPii, encryptPii, generateNomor } from "./crypto";
import {
  isLaporanStatus,
  KEJADIAN_PUBLIC_COLUMNS,
  PENANGANAN_PUBLIC_COLUMNS,
} from "./status";

const PII_ENV = [
  "LAPORAN_PII_KEY",
  "LAPORAN_PII_KEY_ID",
  "LAPORAN_PII_KEYS",
  "LAPORAN_PII_SALT",
] as const;

const savedPiiEnv: Record<string, string | undefined> = {};

function envBag() {
  return process.env as unknown as Record<string, string | undefined>;
}

function setPiiEnv(key: (typeof PII_ENV)[number], value: string | undefined) {
  const env = envBag();
  if (value === undefined) delete env[key];
  else env[key] = value;
}

function snapshotPiiEnv() {
  for (const k of PII_ENV) savedPiiEnv[k] = process.env[k];
}

function restorePiiEnv() {
  for (const k of PII_ENV) setPiiEnv(k, savedPiiEnv[k]);
}

/** Distinct dummy AES-256 keys — not production secrets. */
const KEY_K1 = "01".repeat(32);
const KEY_K2 = "02".repeat(32);
const KEY_OTHER = "03".repeat(32);

function sealV1(keyHex: string, value: string): string {
  const key = Buffer.from(keyHex, "hex");
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

test("generateNomor pads sequence", () => {
  const n = generateNomor("KJD", 7);
  assert.match(n, /^KJD-\d{8}-0007$/);
});

test("isLaporanStatus", () => {
  assert.equal(isLaporanStatus("submitted"), true);
  assert.equal(isLaporanStatus("published"), false);
});

test("public peta columns omit jawaban_json and pelapor fields", () => {
  for (const cols of [KEJADIAN_PUBLIC_COLUMNS, PENANGANAN_PUBLIC_COLUMNS]) {
    assert.equal(cols.includes("jawaban_json"), false);
    assert.equal(cols.includes("pelapor"), false);
    assert.equal(cols.includes("nik"), false);
    assert.equal(cols.includes("catatan_moderator"), false);
  }
});

test("feature-card mapper allowlist matches public peta columns", async () => {
  const { isDeniedFeatureCardKey, toFeatureCard } = await import("../feature-card");
  assert.equal(isDeniedFeatureCardKey("jawaban_json"), true);
  assert.equal(isDeniedFeatureCardKey("pelapor_id"), true);
  const card = toFeatureCard({
    type: "Feature",
    id: "laporan-kejadian-x",
    geometry: { type: "Point", coordinates: [96.7, 5.5] },
    properties: {
      layer: "laporanKejadian",
      title: "KJD-1",
      jenis_bencana: "Banjir",
      jawaban_json: { pelapor: "rahasia" },
      pelapor_id: "p1",
    },
  });
  assert.equal(JSON.stringify(card).includes("jawaban_json"), false);
  assert.equal(JSON.stringify(card).includes("rahasia"), false);
});

describe("PII key rotation", { concurrency: 1 }, () => {
  snapshotPiiEnv();
  afterEach(restorePiiEnv);

  test("encryptPii writes v2 with key id", () => {
    setPiiEnv("LAPORAN_PII_KEY", KEY_K1);
    setPiiEnv("LAPORAN_PII_KEY_ID", undefined);
    setPiiEnv("LAPORAN_PII_KEYS", undefined);
    const payload = encryptPii("nama-uji");
    assert.match(payload, /^v2:k1:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+:[A-Za-z0-9_-]+$/);
    assert.equal(decryptPii(payload), "nama-uji");
  });

  test("v2 round-trip survives rotating to a second key", () => {
    setPiiEnv("LAPORAN_PII_KEY", KEY_K1);
    setPiiEnv("LAPORAN_PII_KEY_ID", "k1");
    setPiiEnv("LAPORAN_PII_KEYS", undefined);
    const oldRow = encryptPii("baris-lama");
    assert.match(oldRow, /^v2:k1:/);

    setPiiEnv("LAPORAN_PII_KEY", KEY_K2);
    setPiiEnv("LAPORAN_PII_KEY_ID", "k2");
    setPiiEnv("LAPORAN_PII_KEYS", `k1=${KEY_K1}`);
    assert.equal(decryptPii(oldRow), "baris-lama");

    const newRow = encryptPii("baris-baru");
    assert.match(newRow, /^v2:k2:/);
    assert.equal(decryptPii(newRow), "baris-baru");
  });

  test("v1 ciphertext still opens with the primary key", () => {
    setPiiEnv("LAPORAN_PII_KEY", KEY_K1);
    setPiiEnv("LAPORAN_PII_KEY_ID", "k1");
    setPiiEnv("LAPORAN_PII_KEYS", undefined);
    const legacy = sealV1(KEY_K1, "pelapor-lama");
    assert.match(legacy, /^v1:/);
    assert.equal(decryptPii(legacy), "pelapor-lama");
  });

  test("v1 ciphertext still opens after primary rotation via backup key", () => {
    const legacy = sealV1(KEY_K1, "pelapor-rotasi");
    setPiiEnv("LAPORAN_PII_KEY", KEY_K2);
    setPiiEnv("LAPORAN_PII_KEY_ID", "k2");
    setPiiEnv("LAPORAN_PII_KEYS", `k1=${KEY_K1}`);
    assert.equal(decryptPii(legacy), "pelapor-rotasi");
  });

  test("wrong key fails to decrypt", () => {
    setPiiEnv("LAPORAN_PII_KEY", KEY_K1);
    setPiiEnv("LAPORAN_PII_KEY_ID", "k1");
    setPiiEnv("LAPORAN_PII_KEYS", undefined);
    const payload = encryptPii("rahasia");

    setPiiEnv("LAPORAN_PII_KEY", KEY_OTHER);
    setPiiEnv("LAPORAN_PII_KEY_ID", "k9");
    setPiiEnv("LAPORAN_PII_KEYS", undefined);
    assert.throws(() => decryptPii(payload), /PII tidak dapat didekripsi/);
    assert.throws(() => decryptPii(sealV1(KEY_K1, "lama")), /PII tidak dapat didekripsi/);
  });
});
