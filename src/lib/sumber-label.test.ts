import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { displaySumberEntries, displaySumberEntry } from "./sumber-label";

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

  it("leaves every other source token unchanged", () => {
    assert.equal(displaySumberEntry("SIK operasional"), "SIK operasional");
    assert.equal(displaySumberEntry("kejadian-bencana.json"), "kejadian-bencana.json");
    assert.equal(displaySumberEntry("sik_aceh"), "sik_aceh");
    assert.equal(displaySumberEntry("SIK_ACEH.DB"), "SIK_ACEH.DB");
    assert.deepEqual(displaySumberEntries("sik_aceh.db"), ["Data Kejadian BPBA"]);
  });
});
