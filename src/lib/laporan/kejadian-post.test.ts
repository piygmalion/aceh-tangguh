import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { NextRequest } from "next/server";
import { POST } from "../../app/api/laporan/kejadian/route";

const savedNodeEnv = process.env.NODE_ENV;
const savedRequire = process.env.RATE_LIMIT_REQUIRE_UPSTASH;
const savedUrl = process.env.UPSTASH_REDIS_REST_URL;
const savedToken = process.env.UPSTASH_REDIS_REST_TOKEN;

before(() => {
  (process.env as Record<string, string | undefined>).NODE_ENV = "production";
  delete process.env.RATE_LIMIT_REQUIRE_UPSTASH;
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
});

after(() => {
  (process.env as Record<string, string | undefined>).NODE_ENV = savedNodeEnv;
  if (savedRequire === undefined) delete process.env.RATE_LIMIT_REQUIRE_UPSTASH;
  else process.env.RATE_LIMIT_REQUIRE_UPSTASH = savedRequire;
  if (savedUrl === undefined) delete process.env.UPSTASH_REDIS_REST_URL;
  else process.env.UPSTASH_REDIS_REST_URL = savedUrl;
  if (savedToken === undefined) delete process.env.UPSTASH_REDIS_REST_TOKEN;
  else process.env.UPSTASH_REDIS_REST_TOKEN = savedToken;
});

function kejadianRequest() {
  return new NextRequest("https://aceh.example/api/laporan/kejadian", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "https://aceh.example",
      host: "aceh.example",
    },
    body: JSON.stringify({
      jenis_bencana: "banjir",
      lokasi: {
        latitude: 5.5483,
        longitude: 95.3238,
        kabupaten_kota: "Banda Aceh",
        kecamatan: "Kuta Alam",
        desa: "Beurawe",
      },
      pelapor: {
        nama: "Uji Kirim",
        nik: "1101010101010001",
        telepon: "081234567890",
        email: "uji.kirim@example.com",
      },
      jawaban: {},
      consent: true,
    }),
  });
}

test("POST kejadian is not 503 for missing Upstash in production", async () => {
  const res = await POST(kejadianRequest());
  const json = (await res.json()) as { error?: unknown; nomor_laporan?: string };
  assert.notEqual(json.error, "Service temporarily unavailable");
  assert.notEqual(res.status, 429);
  if (res.status === 201) {
    assert.equal(typeof json.nomor_laporan, "string");
    assert.match(String(json.nomor_laporan), /^KJD-/);
  } else {
    assert.equal(res.status, 503);
    assert.match(String(json.error), /SUPABASE_SERVICE_ROLE_KEY|PII|LAPORAN/);
  }
});
