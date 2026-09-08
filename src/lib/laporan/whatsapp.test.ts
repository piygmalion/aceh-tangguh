import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildWhatsAppGatewayRequest,
  classifyWhatsAppGateway,
  normalizeWhatsAppPhone,
} from "./whatsapp";

const ROOT = process.cwd();

describe("BE-33 WhatsApp gateway adapter", () => {
  it("normalizes Indonesian numbers to 62", () => {
    assert.equal(normalizeWhatsAppPhone("081234567890"), "6281234567890");
    assert.equal(normalizeWhatsAppPhone("81234567890"), "6281234567890");
    assert.equal(normalizeWhatsAppPhone("+62 812-3456-7890"), "6281234567890");
  });

  it("classifies Fonnte and Wablas hosts", () => {
    assert.equal(classifyWhatsAppGateway("https://api.fonnte.com/send"), "fonnte");
    assert.equal(classifyWhatsAppGateway("https://solo.wablas.com/api/send-message"), "wablas");
    assert.equal(classifyWhatsAppGateway("https://hooks.example.test/wa"), "generic");
  });

  it("maps Fonnte to target + raw Authorization", () => {
    const req = buildWhatsAppGatewayRequest(
      "https://api.fonnte.com/send",
      "fonnte-token",
      "081234567890",
      "ringkasan harian"
    );
    assert.equal(req.headers.Authorization, "fonnte-token");
    assert.deepEqual(req.body, { target: "6281234567890", message: "ringkasan harian" });
    assert.equal("text" in req.body, false);
  });

  it("maps Wablas to phone + raw Authorization", () => {
    const req = buildWhatsAppGatewayRequest(
      "https://solo.wablas.com/api/send-message",
      "wablas-token",
      "6281234567890",
      "laporan diterima"
    );
    assert.equal(req.headers.Authorization, "wablas-token");
    assert.deepEqual(req.body, { phone: "6281234567890", message: "laporan diterima" });
  });

  it("keeps Bearer + phone/text for custom gateways", () => {
    const req = buildWhatsAppGatewayRequest(
      "https://hooks.example.test/wa",
      "custom-token",
      "0812",
      "halo"
    );
    assert.equal(req.headers.Authorization, "Bearer custom-token");
    assert.deepEqual(req.body, { phone: "62812", message: "halo", text: "halo" });
  });

  it("does not embed gateway tokens in source or docs", () => {
    const src = readFileSync(join(ROOT, "src/lib/laporan/whatsapp.ts"), "utf8");
    const docs = readFileSync(join(ROOT, "docs/laporan-production.md"), "utf8");
    assert.match(src, /api\.fonnte\.com/);
    assert.match(docs, /api\.fonnte\.com\/send/);
    assert.doesNotMatch(src, /WHATSAPP_GATEWAY_TOKEN:\s*[0-9a-fA-F]{16,}/);
    assert.doesNotMatch(docs, /Authorization:\s+[A-Za-z0-9_-]{20,}/);
  });
});
