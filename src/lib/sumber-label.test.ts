import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { displaySumberEntries, displaySumberEntry, renderSumberLine } from "./sumber-label";

describe("disasterEvents source display", () => {
  it("relabels only an exact sik_aceh.db entry inside a mixed list", () => {
    const pdf = "https://bpba.acehprov.go.id/media/2023.09/rekap_bencana_di_aceh_tahun_2023_untuk_ppid1.pdf";
    const kanal = "https://www.kanalaceh.com/2024/01/03/418-kali-bencana-landa-aceh-sepanjang-2023/";
    const bnpb = "https://www.bnpb.go.id/berita/jumlah-pengungsi-akibat-bencana-hidrometeorologi";
    const antara = "https://www.antaranews.com/berita/4569442/aceh-alami-kerugian-rp123-miliar";
    const mixed = [pdf, kanal, "sik_aceh.db", bnpb, antara];

    const shown = displaySumberEntries(mixed);

    assert.deepEqual(shown, [pdf, kanal, "Data Kejadian BPBA", bnpb, antara]);
    assert.equal(shown.includes("BPBA"), false);
    assert.equal(mixed[2], "sik_aceh.db");
  });

  it("maps sik_aceh.db to Data Kejadian BPBA and operational tokens to Kejadian operasional", () => {
    const mixed = ["sik_aceh.db", "kejadian_operasi", "SIK operasional", "kejadian-bencana.json"];
    assert.deepEqual(displaySumberEntries(mixed), [
      "Data Kejadian BPBA",
      "Kejadian operasional",
      "Kejadian operasional",
      "kejadian-bencana.json",
    ]);
    assert.equal(mixed[0], "sik_aceh.db");
    assert.equal(mixed[1], "kejadian_operasi");
    assert.equal(mixed[2], "SIK operasional");
    assert.equal(displaySumberEntry("sik_aceh"), "sik_aceh");
    assert.equal(displaySumberEntry("SIK_ACEH.DB"), "SIK_ACEH.DB");
    assert.deepEqual(displaySumberEntries("sik_aceh.db"), ["Data Kejadian BPBA"]);
    assert.deepEqual(displaySumberEntries("kejadian_operasi"), ["Kejadian operasional"]);
    assert.deepEqual(displaySumberEntries("SIK operasional"), ["Kejadian operasional"]);
  });

  it("labels the three stored tokens in id and en without rewriting them", () => {
    const tokens = ["sik_aceh.db", "kejadian_operasi", "SIK operasional"] as const;
    assert.deepEqual(
      tokens.map((token) => displaySumberEntry(token, "id")),
      ["Data Kejadian BPBA", "Kejadian operasional", "Kejadian operasional"],
    );
    assert.deepEqual(
      tokens.map((token) => displaySumberEntry(token, "en")),
      ["BPBA incident data", "Operational incidents", "Operational incidents"],
    );
    assert.deepEqual(displaySumberEntries([...tokens], "en"), [
      "BPBA incident data",
      "Operational incidents",
      "Operational incidents",
    ]);
    assert.deepEqual(displaySumberEntries([...tokens], "id"), [
      "Data Kejadian BPBA",
      "Kejadian operasional",
      "Kejadian operasional",
    ]);
    assert.equal(tokens[0], "sik_aceh.db");
    assert.equal(tokens[1], "kejadian_operasi");
    assert.equal(tokens[2], "SIK operasional");
    assert.equal(displaySumberEntry("sik_aceh", "en"), "sik_aceh");
    assert.equal(displaySumberEntry("https://bpba.acehprov.go.id/rekap.pdf", "en"), "https://bpba.acehprov.go.id/rekap.pdf");
  });

  it("renders Indonesian card labels and raw tokens for the active locale", () => {
    assert.equal(renderSumberLine("sik_aceh.db", "id"), "Data Kejadian BPBA");
    assert.equal(renderSumberLine("kejadian_operasi", "id"), "Kejadian operasional");
    assert.equal(renderSumberLine("SIK operasional", "id"), "Kejadian operasional");
    assert.equal(renderSumberLine("Data Kejadian BPBA", "en"), "BPBA incident data");
    assert.equal(renderSumberLine("Kejadian operasional", "en"), "Operational incidents");
    assert.equal(renderSumberLine("sik_aceh.db", "en"), "BPBA incident data");
    assert.equal(renderSumberLine("kejadian_operasi", "en"), "Operational incidents");
    assert.equal(renderSumberLine("SIK operasional", "en"), "Operational incidents");
    assert.equal(renderSumberLine("Data Kejadian BPBA", "id"), "Data Kejadian BPBA");
    assert.equal(renderSumberLine("https://www.antaranews.com/berita/1", "en"), "https://www.antaranews.com/berita/1");

    const popup = readFileSync(join(process.cwd(), "src/components/map/MapFeatureCard.tsx"), "utf8");
    assert.match(popup, /useLocale\(/);
    assert.match(popup, /renderSumberLine\(entry, sumberLocale\)/);
  });
});
