import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { NextRequest } from "next/server";
import { rejectCrossOrigin } from "./origin";

function postRequest(headers: Record<string, string>, url = "https://aceh.example/id/lapor") {
  return new NextRequest(url, { method: "POST", headers });
}

test("rejectCrossOrigin allows matching Origin", () => {
  const req = postRequest({
    origin: "https://aceh.example",
    host: "aceh.example",
  });
  assert.equal(rejectCrossOrigin(req), null);
});

test("rejectCrossOrigin blocks mismatched Origin", () => {
  const req = postRequest({
    origin: "https://evil.example",
    host: "aceh.example",
  });
  const res = rejectCrossOrigin(req);
  assert.ok(res);
  assert.equal(res?.status, 403);
});

test("rejectCrossOrigin validates Referer when Origin is absent", () => {
  const req = postRequest({
    referer: "https://evil.example/id/lapor",
    host: "aceh.example",
  });
  const res = rejectCrossOrigin(req);
  assert.ok(res);
  assert.equal(res?.status, 403);
});

test("rejectCrossOrigin allows matching Referer without Origin", () => {
  const req = postRequest({
    referer: "https://aceh.example/id/lapor/kejadian",
    host: "aceh.example",
  });
  assert.equal(rejectCrossOrigin(req), null);
});

test("rejectCrossOrigin allows curl/cron without Origin or Referer", () => {
  const req = postRequest({ host: "aceh.example" });
  assert.equal(rejectCrossOrigin(req), null);
});
