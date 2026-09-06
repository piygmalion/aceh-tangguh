import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildProyeksiDampak,
  parseMagnitude,
  parseSungaiLabel,
  parseWaterCm,
  type DampakCard,
} from "./proyeksi-dampak";

const ROOT = process.cwd();

function card(partial: Partial<DampakCard> & Pick<DampakCard, "id">): DampakCard {
  return {
    date: "",
    kabupaten: "",
    kecamatan: "",
    penyebab: "",
    kronologi: "",
    rr: 0,
    rs: 0,
    rb: 0,
    jiwaTerdampak: 0,
    kkTerdampak: 0,
    pengungsi: 0,
    ...partial,
  };
}

describe("parseMagnitude", () => {
  it("reads Indonesian M5,9 and M6,2", () => {
    assert.equal(parseMagnitude("Gempa bumi M5,9 mengguncang pantai barat"), 5.9);
    assert.equal(parseMagnitude("berkekuatan M6,2 (update BMKG)"), 6.2);
  });

  it("returns null for an empty Magnitudo field and ignores depth km", () => {
    assert.equal(parseMagnitude("Pusat gempa Km tenggara aceh singkil Magnitudo :"), null);
    assert.equal(parseMagnitude("kedalaman 53 km. Tidak ada laporan korban"), null);
  });
});

describe("parseWaterCm", () => {
  it("takes the upper bound of a water-height range", () => {
    assert.equal(parseWaterCm("ketinggian air 30-80 cm"), 80);
  });

  it("ignores a blank height placeholder", () => {
    assert.equal(parseWaterCm("Ketinggian air - cm"), null);
  });
});

describe("parseSungaiLabel", () => {
  it("keeps a generic river-overflow label and a named river", () => {
    assert.equal(parseSungaiLabel("Hujan deras menyebabkan luapan sungai"), "luapan sungai");
    assert.equal(parseSungaiLabel("luapan Sungai Krueng Aceh merendam desa"), "Sungai Krueng Aceh");
  });
});

describe("buildProyeksiDampak", () => {
  it("projects local jiwa ranges for Pidie Jaya floods if they repeat", () => {
    const local: DampakCard[] = [
      card({
        id: "a",
        date: "Jumat, 2023-01-20",
        kabupaten: "Pidie Jaya",
        kecamatan: "Meureudu",
        jiwaTerdampak: 854,
        kkTerdampak: 7,
      }),
      card({
        id: "b",
        date: "Kamis, 2023-02-16",
        kabupaten: "Pidie Jaya",
        kecamatan: "Meureudu",
        jiwaTerdampak: 178,
        kkTerdampak: 1,
      }),
      card({
        id: "c",
        date: "Sabtu, 2023-02-04",
        kabupaten: "Pidie Jaya",
        jiwaTerdampak: 7,
        kkTerdampak: 2,
      }),
    ];
    const result = buildProyeksiDampak({
      local,
      provincial: [
        card({
          id: "utara",
          kabupaten: "Aceh Utara",
          rr: 1111,
          jiwaTerdampak: 44389,
          penyebab: "luapan sungai",
        }),
      ],
      ancaman: "banjir",
      irbiKelas: "SEDANG",
    });
    assert.equal(result.grain, "kabupaten");
    assert.equal(result.n, 3);
    assert.equal(result.jiwa?.min, 7);
    assert.equal(result.jiwa?.median, 178);
    assert.equal(result.jiwa?.max, 854);
    assert.equal(result.replay.worst?.id, "a");
    assert.equal(result.replay.worst?.jiwaTerdampak, 854);
    assert.equal(result.scenario, "khas");
    assert.equal(result.housing, null);
  });

  it("shows earthquake magnitude bands without inventing housing damage", () => {
    const provincial: DampakCard[] = [
      card({
        id: "sim",
        kabupaten: "Simeulue",
        kecamatan: "Simeulue Barat",
        kronologi: "Gempa bumi M5,9 mengguncang pantai barat",
      }),
      card({
        id: "meulaboh",
        kabupaten: "Aceh Barat",
        kronologi: "Gempa bumi berkekuatan M6,2 (update BMKG) kedalaman 53 km",
      }),
    ];
    const result = buildProyeksiDampak({
      local: [],
      provincial,
      ancaman: "gempabumi",
      irbiKelas: "TINGGI",
    });
    assert.equal(result.housing, null);
    assert.equal(result.scenario, "parah");
    const mags = result.scale.map((row) => row.value);
    assert.deepEqual(mags.sort((a, b) => a - b), [5.9, 6.2]);
    assert.ok(result.scale.some((row) => row.band === "gte6" && row.value === 6.2));
    assert.deepEqual(result.corridors, []);
  });

  it("does not derive fatalities from an IRBI score", () => {
    const src = readFileSync(join(ROOT, "src/lib/proyeksi-dampak.ts"), "utf8");
    assert.equal(/meninggal\s*\*|skor\s*\*.*meninggal|irbi.*meninggal/i.test(src), false);
    assert.equal(src.includes("KRB I"), false);
  });
});
