import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { recentAduanCards, topJenisBencana } from "./map-participation";
import type { PublicPetaKejadian } from "./laporan/status";

function row(partial: Partial<PublicPetaKejadian> & Pick<PublicPetaKejadian, "id">): PublicPetaKejadian {
  return {
    nomor_laporan: "KJD-1",
    jenis_bencana: "Banjir",
    latitude: 5,
    longitude: 95,
    kabupaten_kota: "Pidie",
    kecamatan: "Tangse",
    desa: "Blang Pandak",
    skor_urgensi: 1,
    submitted_at: "2026-03-23T00:00:00.000Z",
    laporan_tipe: "kejadian",
    ...partial,
  };
}

describe("map participation widgets", () => {
  it("sorts recent aduan by submitted_at and keeps honest titles", () => {
    const cards = recentAduanCards(
      [
        row({ id: "a", submitted_at: "2026-01-01T00:00:00.000Z", jenis_bencana: "Banjir" }),
        row({ id: "b", submitted_at: "2026-03-01T00:00:00.000Z", jenis_bencana: "Longsor", desa: "Mane" }),
      ],
      [],
      3
    );
    assert.equal(cards[0].id, "b");
    assert.equal(cards[0].title, "Longsor · Mane");
    assert.equal(cards.length, 2);
  });

  it("aggregates top 5 jenis without inventing counts", () => {
    const top = topJenisBencana([
      { jenis_bencana: "Banjir" },
      { jenis_bencana: "Banjir" },
      { jenis_bencana: "Longsor" },
    ]);
    assert.deepEqual(top, [
      { key: "Banjir", label: "Banjir", count: 2 },
      { key: "Tanah longsor", label: "Tanah longsor", count: 1 },
    ]);
    assert.deepEqual(topJenisBencana([]), []);
  });
});
