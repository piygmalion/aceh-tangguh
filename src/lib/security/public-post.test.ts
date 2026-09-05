import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { canAccessModule } from "../sik/roles";
import { guardPublicPost } from "./public-post";

function postRequest(headers: Record<string, string>, url = "https://aceh.example/id/lapor") {
  return new NextRequest(url, { method: "POST", headers });
}

test("guardPublicPost allows same-origin under the quota", async () => {
  const req = postRequest({
    origin: "https://aceh.example",
    host: "aceh.example",
  });
  const res = await guardPublicPost(req, `an1-public-ok-${Date.now()}`, 5);
  assert.equal(res, null);
});

test("guardPublicPost rejects cross-origin before any staff module check", async () => {
  const req = postRequest({
    origin: "https://evil.example",
    host: "aceh.example",
  });
  const res = await guardPublicPost(req, `an1-public-origin-${Date.now()}`, 5);
  assert.ok(res);
  assert.equal(res?.status, 403);
});

test("guardPublicPost is not the GET laporan PII gate", async () => {
  const req = postRequest({
    origin: "https://aceh.example",
    host: "aceh.example",
  });
  const res = await guardPublicPost(req, `an1-public-not-pii-${Date.now()}`, 5);
  assert.equal(res, null);

  const desa = {
    userId: "u-desa",
    email: null,
    role: "admin_desa" as const,
    displayName: null,
    createdAt: "",
    kodeKabupaten: null,
    kabupaten: null,
    kodeKecamatan: null,
    kecamatan: null,
    kodeDesaKelurahan: "1101010001",
    desa: "Tes",
  };
  assert.equal(canAccessModule(desa, "moderasi"), false);
});
