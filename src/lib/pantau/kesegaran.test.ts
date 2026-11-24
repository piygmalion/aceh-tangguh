import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  KESEGARAN_STATUS_USULAN,
  KESEGARAN_USULAN_DATA,
  ambangKesegaran,
  bacaanHttpCron,
  bacaanJobRun,
  dibiFixtureBasi,
  overlayLedgerBasi,
  weatherForecastBasi,
} from "./kesegaran";

const T0 = Date.parse("2026-11-10T00:00:00.000Z");

describe("ambang kesegaran usulan Data", () => {
  it("berstatus usulan, belum dikunci, dan bisa diganti tanpa mengunci status", () => {
    assert.equal(KESEGARAN_USULAN_DATA.status, "usulan, belum dikunci");
    assert.equal(KESEGARAN_STATUS_USULAN, "usulan, belum dikunci");
    assert.equal(KESEGARAN_USULAN_DATA.weatherFetchedMaxMs, 2 * 60 * 60 * 1000);
    assert.equal(KESEGARAN_USULAN_DATA.overlayRefreshMaxMs, 45 * 60 * 1000);
    assert.equal(KESEGARAN_USULAN_DATA.dibiFetchedMaxMs, 4 * 24 * 60 * 60 * 1000);
    const diganti = ambangKesegaran({ weatherFetchedMaxMs: 60_000 });
    assert.equal(diganti.weatherFetchedMaxMs, 60_000);
    assert.equal(diganti.overlayRefreshMaxMs, KESEGARAN_USULAN_DATA.overlayRefreshMaxMs);
    assert.equal(diganti.status, "usulan, belum dikunci");
  });
});

describe("cuaca weather_forecasts", () => {
  const fresh = {
    expiresAt: new Date(T0 + 60_000).toISOString(),
    fetchedAt: new Date(T0 - 60_000).toISOString(),
  };

  it("segar tepat di ambang fetched_at 2 jam dan tepat saat expires_at sama dengan sekarang", () => {
    const tepat = weatherForecastBasi(
      {
        expiresAt: new Date(T0).toISOString(),
        fetchedAt: new Date(T0 - KESEGARAN_USULAN_DATA.weatherFetchedMaxMs).toISOString(),
      },
      T0,
    );
    assert.equal(tepat.basi, false);
    assert.deepEqual(tepat.alasan, []);
  });

  it("basi satu milidetik setelah ambang fetched_at", () => {
    const lewat = weatherForecastBasi(
      {
        ...fresh,
        fetchedAt: new Date(T0 - KESEGARAN_USULAN_DATA.weatherFetchedMaxMs - 1).toISOString(),
      },
      T0,
    );
    assert.equal(lewat.basi, true);
    assert.ok(lewat.alasan.includes("fetched-at-lewat-ambang"));
  });

  it("basi bila expires_at sudah lewat walau fetched_at masih di dalam ambang", () => {
    const lewat = weatherForecastBasi(
      {
        expiresAt: new Date(T0 - 1).toISOString(),
        fetchedAt: new Date(T0 - 60_000).toISOString(),
      },
      T0,
    );
    assert.equal(lewat.basi, true);
    assert.ok(lewat.alasan.includes("expires-at-lewat"));
  });

  it("menghormati ambang yang diganti", () => {
    const hasil = weatherForecastBasi(
      {
        expiresAt: new Date(T0 + 60_000).toISOString(),
        fetchedAt: new Date(T0 - 60_001).toISOString(),
      },
      T0,
      ambangKesegaran({ weatherFetchedMaxMs: 60_000 }),
    );
    assert.equal(hasil.basi, true);
  });
});

describe("ledger overlay", () => {
  const layersOk = [
    { key: "bmkgQuakes", ok: true },
    { key: "tatonasStations", ok: true },
  ];

  it("segar tepat di 45 menit bila semua lapisan ok", () => {
    const hasil = overlayLedgerBasi(
      {
        refreshedAt: new Date(T0 - KESEGARAN_USULAN_DATA.overlayRefreshMaxMs).toISOString(),
        httpStatus: 200,
        layers: layersOk,
      },
      T0,
    );
    assert.equal(hasil.basi, false);
  });

  it("basi satu milidetik setelah 45 menit", () => {
    const hasil = overlayLedgerBasi(
      {
        refreshedAt: new Date(T0 - KESEGARAN_USULAN_DATA.overlayRefreshMaxMs - 1).toISOString(),
        httpStatus: 200,
        layers: layersOk,
      },
      T0,
    );
    assert.equal(hasil.basi, true);
    assert.ok(hasil.alasan.includes("refresh-lewat-ambang"));
  });

  it("basi bila lapisan gagal walau HTTP 200 dan refresh baru saja", () => {
    const hasil = overlayLedgerBasi(
      {
        refreshedAt: new Date(T0).toISOString(),
        httpStatus: 200,
        layers: [
          { key: "bmkgQuakes", ok: true },
          { key: "tatonasStations", ok: false },
        ],
      },
      T0,
    );
    assert.equal(hasil.basi, true);
    assert.ok(hasil.alasan.includes("lapisan-tidak-ok"));
    assert.ok(hasil.alasan.includes("http-200-lapisan-gagal"));
  });
});

describe("fixture DIBI", () => {
  it("segar tepat di 4 hari", () => {
    const hasil = dibiFixtureBasi(
      new Date(T0 - KESEGARAN_USULAN_DATA.dibiFetchedMaxMs).toISOString(),
      T0,
    );
    assert.equal(hasil.basi, false);
  });

  it("basi satu milidetik setelah 4 hari", () => {
    const hasil = dibiFixtureBasi(
      new Date(T0 - KESEGARAN_USULAN_DATA.dibiFetchedMaxMs - 1).toISOString(),
      T0,
    );
    assert.equal(hasil.basi, true);
    assert.deepEqual(hasil.alasan, ["fetched-at-lewat-ambang"]);
  });

  it("basi bila fetched_at tidak ada", () => {
    assert.equal(dibiFixtureBasi(null, T0).basi, true);
  });
});

describe("bacaan cron baca-saja", () => {
  it("HTTP 200 sehat dan 503, timeout, atau status kosong gagal", () => {
    assert.equal(bacaanHttpCron({ statusCode: 200, timedOut: false }).gagal, false);
    assert.equal(bacaanHttpCron({ statusCode: 503, timedOut: false }).gagal, true);
    assert.equal(bacaanHttpCron({ statusCode: 200, timedOut: true }).gagal, true);
    assert.equal(bacaanHttpCron({ statusCode: null, timedOut: false }).gagal, true);
  });

  it("job run hanya sehat bila status succeeded", () => {
    assert.equal(bacaanJobRun({ status: "succeeded" }).gagal, false);
    assert.equal(bacaanJobRun({ status: "failed" }).gagal, true);
    assert.equal(bacaanJobRun({ status: null }).gagal, true);
  });
});
