import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createHmac } from "crypto";
import { isAcehTatonasStation } from "./aceh";
import {
  cardFromStations,
  extractDashboardSigningKey,
  parseTatonasLocalTime,
  parseTatonasStations,
  signTatonasPath,
} from "./parse";
import { TATONAS_STALE_MS, type TatonasDtData, type TatonasStation } from "./types";

const SAMPLE: TatonasDtData = {
  plantData: {
    "026": {
      plant: "026",
      favicon: "BWS Aceh",
      hardware: [
        {
          kd_logger: 9,
          nm_logger: "GPA JWT",
          kd_hardware: "4216",
          uid: "20220236",
          pos_name: "AWLR Buga",
          latitude: 5.3585549,
          longitude: 95.5854056,
          tlocal: "2026-09-03 11:30:00",
          condition: 1,
          sensor: [
            {
              kd_sensor: "waterlevel",
              value: 48.437,
              val_step: ["0", "100", "150", "200"],
              color_step: ["hijau", "kuning", "oranye", "merah"],
              rel_sensor: {
                kd_sensor: "waterlevel",
                nm_sensor: "Water Level",
                satuan: "cm",
              },
            },
          ],
        },
        {
          kd_logger: 5,
          nm_logger: "CAM",
          kd_hardware: "9999",
          uid: "cam-skip",
          pos_name: "Kamera Banda Aceh",
          latitude: 5.55,
          longitude: 95.32,
          tlocal: "2026-09-03 11:30:00",
          sensor: [],
        },
      ],
    },
    "018": {
      plant: "018",
      favicon: "BWS Sumatera II Medan",
      hardware: [
        {
          kd_logger: 9,
          kd_hardware: "4110",
          uid: "medan",
          pos_name: "POS PU Sakti Lubis",
          latitude: 3.552787,
          longitude: 98.69037,
          tlocal: "2026-09-03 11:30:00",
          sensor: [
            {
              value: 0,
              rel_sensor: { kd_sensor: "rainfall", nm_sensor: "Rainfall", satuan: "mm" },
            },
          ],
        },
      ],
    },
    "033": {
      plant: "033",
      favicon: "PSDA Kalimantan Selatan",
      hardware: [
        {
          kd_logger: 9,
          kd_hardware: "4429",
          uid: "tamiang-kalsel",
          pos_name: "CH Desa Tamiang",
          latitude: -2.431788,
          longitude: 116.296218,
          tlocal: "2026-09-03 12:30:00",
          sensor: [
            {
              value: 0,
              rel_sensor: { kd_sensor: "rainfall", nm_sensor: "Rainfall", satuan: "mm" },
            },
          ],
        },
      ],
    },
  },
  liveAlertData: [
    {
      category: "WATERLEVEL",
      device: "4216",
      title: "AWLR Buga",
      description: "Water Level mencapai peringatan AWAS",
      level: "AWAS",
    },
  ],
};

describe("Tatonas Aceh filter", () => {
  it("keeps BWS Aceh GPS and drops Medan / Kalimantan Tamiang", () => {
    assert.equal(
      isAcehTatonasStation({
        project: "BWS Aceh",
        posName: "AWLR Buga",
        lat: 5.3585549,
        lng: 95.5854056,
      }),
      true,
    );
    assert.equal(
      isAcehTatonasStation({
        project: "BWS Sumatera II Medan",
        posName: "POS PU Sakti Lubis",
        lat: 3.552787,
        lng: 98.69037,
      }),
      false,
    );
    assert.equal(
      isAcehTatonasStation({
        project: "PSDA Kalimantan Selatan",
        posName: "CH Desa Tamiang",
        lat: -2.431788,
        lng: 116.296218,
      }),
      false,
    );
  });

  it("keeps nameless-coordinate Aceh text only when GPS is absent", () => {
    assert.equal(
      isAcehTatonasStation({ project: "PSDA Aceh", posName: "Pos lama", lat: null, lng: null }),
      true,
    );
  });
});

describe("parseTatonasStations", () => {
  const now = Date.parse("2026-09-03T04:35:00.000Z");

  it("keeps Aceh hydrology, skips cameras and out-of-province points", () => {
    const stations = parseTatonasStations(SAMPLE, now);
    assert.equal(stations.length, 1);
    assert.equal(stations[0].pos_name, "AWLR Buga");
    assert.equal(stations[0].level, "AWAS");
    assert.equal(stations.some((s) => s.kd_hardware === "9999"), false);
    assert.equal(stations.some((s) => s.uid === "medan"), false);
  });

  it("does not treat stale AWAS as a live danger tone", () => {
    const staleNow = Date.parse("2026-09-03T08:00:00.000Z");
    const stations = parseTatonasStations(SAMPLE, staleNow);
    const card = cardFromStations(stations, { source: "live" });
    assert.equal(card.stale, true);
    assert.equal(card.tone, "neutral");
    assert.equal(card.highlights[0]?.level, "AWAS");
  });

  it("uses fresh AWAS as danger", () => {
    const stations = parseTatonasStations(SAMPLE, now);
    const card = cardFromStations(stations, { source: "live" });
    assert.equal(card.stale, false);
    assert.equal(card.tone, "danger");
    assert.equal(card.empty, false);
  });

  it("marks a reading stale after TATONAS_STALE_MS, not the overlay cache window", () => {
    assert.equal(TATONAS_STALE_MS, 15 * 60 * 1000);
    const occurredMs = Date.parse("2026-09-03T04:30:00.000Z");
    const justFresh = parseTatonasStations(SAMPLE, occurredMs + TATONAS_STALE_MS);
    const justStale = parseTatonasStations(SAMPLE, occurredMs + TATONAS_STALE_MS + 1);
    assert.equal(justFresh[0]?.stale, false);
    assert.equal(justStale[0]?.stale, true);
    const staleAmanNow = occurredMs + TATONAS_STALE_MS + 1;
    const staleStations = parseTatonasStations(SAMPLE, staleAmanNow).map((s) => ({
      ...s,
      level: "AMAN" as const,
    }));
    const card = cardFromStations(staleStations, { source: "live" });
    assert.equal(card.stale, true);
    assert.equal(card.tone, "neutral");
  });
});

describe("Tatonas helpers", () => {
  it("extracts the public dashboard signing key from HTML", () => {
    const html = "var kd_plant = 002;\nvar kode = 'unit-test-key-aa';\n";
    assert.equal(extractDashboardSigningKey(html), "unit-test-key-aa");
    assert.equal(extractDashboardSigningKey("<html>no key</html>"), null);
  });

  it("parses WIB tlocal as UTC+7", () => {
    assert.equal(parseTatonasLocalTime("2026-09-03 11:30:00"), "2026-09-03T04:30:00.000Z");
  });

  it("signs path+timestamp the same way as the public dashboard", () => {
    const path = "/api/dt_data?p=002&fp=all_plant&fl=all_logger";
    const ts = 1788410359;
    const secret = "unit-test-key";
    const expected = createHmac("sha256", secret).update(`${path}${ts}`).digest("hex");
    assert.equal(signTatonasPath(path, ts, secret), expected);
  });
});

describe("cardFromStations empty", () => {
  it("is empty and neutral without stations", () => {
    const card = cardFromStations([] as TatonasStation[], { source: "live" });
    assert.equal(card.empty, true);
    assert.equal(card.tone, "neutral");
    assert.equal(card.stale, true);
  });
});
