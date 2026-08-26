import assert from "node:assert/strict";
import { test } from "node:test";
import { LaporanConfigError } from "./writer";
import { allocateNomorLaporan } from "./service";

type RpcResult = {
  data: string | null;
  error: { message: string; details: string; hint: string; code: string } | null;
};

function mockClient(result: RpcResult) {
  return {
    rpc: async () => result,
  } as unknown as Parameters<typeof allocateNomorLaporan>[0];
}

test("allocateNomorLaporan returns RPC string", async () => {
  const client = mockClient({
    data: "KJD-20260826-0007",
    error: null,
  });
  assert.equal(await allocateNomorLaporan(client, "KJD"), "KJD-20260826-0007");
});

test("allocateNomorLaporan fails closed on RPC error", async () => {
  const client = mockClient({
    data: null,
    error: { message: "function missing", details: "", hint: "", code: "42883" },
  });
  await assert.rejects(
    () => allocateNomorLaporan(client, "KJD"),
    (err: unknown) =>
      err instanceof LaporanConfigError &&
      /next_laporan_nomor failed/.test(err.message)
  );
});

test("allocateNomorLaporan fails closed on empty result", async () => {
  const client = mockClient({ data: "", error: null });
  await assert.rejects(
    () => allocateNomorLaporan(client, "PNG"),
    LaporanConfigError
  );
});
