import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "path";
import { describe, it } from "node:test";
import type { Feature, FeatureCollection, Point } from "geojson";
import {
  FEATURE_CARD_DENIED_KEYS,
  FEATURE_CARD_EMPTY,
  FEATURE_CARD_NO_DAMAGE,
  FEATURE_CARD_PUBLIC_CONTACT_LAYERS,
  cardHasDeniedLeak,
  extractPublicMedia,
  featureCardQuality,
  featureMatchesPublicId,
  isDeniedFeatureCardKey,
  toFeatureCard,
} from "./feature-card";
import { KEJADIAN_PUBLIC_COLUMNS, PENANGANAN_PUBLIC_COLUMNS } from "./laporan/status";

function point(
  id: string,
  layer: string,
  properties: Record<string, unknown> = {},
): Feature<Point> {
  return {
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates: [96.7, 5.5] },
    properties: { layer, ...properties },
  };
}

function loadMarkers(): FeatureCollection {
  const file = path.join(process.cwd(), "public/fixtures/markers.geojson");
  return JSON.parse(readFileSync(file, "utf8")) as FeatureCollection;
}

describe("feature-card public allowlist", () => {
  it("denies jawaban_json and pelapor keys", () => {
    for (const key of FEATURE_CARD_DENIED_KEYS) {
      assert.equal(isDeniedFeatureCardKey(key), true);
    }
    assert.equal(isDeniedFeatureCardKey("title"), false);
    for (const cols of [KEJADIAN_PUBLIC_COLUMNS, PENANGANAN_PUBLIC_COLUMNS]) {
      assert.equal(cols.includes("jawaban_json"), false);
      assert.equal(cols.includes("pelapor"), false);
    }
  });

  it("does not leak denied properties onto the DTO", () => {
    const card = toFeatureCard(
      point("leak-1", "laporanKejadian", {
        title: "KJD-1",
        jenis_bencana: "Banjir",
        jawaban_json: { nama: "rahasia" },
        pelapor_id: "abc",
        nik: "123",
        catatan_moderator: "internal",
      }),
    );
    assert.equal(cardHasDeniedLeak(card), false);
    assert.equal(JSON.stringify(card).includes("rahasia"), false);
    assert.equal(JSON.stringify(card).includes("jawaban_json"), false);
  });

  it("shows police contact only when the public property is present", () => {
    const withPhone = toFeatureCard(
      point("KPLS-1", "policeOffices", {
        title: "POLSEK TES",
        jenis_kantor: "polsek",
        status: "operasional_penuh",
        skala_kerusakan: "tidak_rusak",
        telepon: "6281111111111",
        alamat: "Jl. Tes",
      }),
    );
    assert.ok(withPhone.details.some((d) => d.key === "kontak" && d.value === "6281111111111"));

    const withoutPhone = toFeatureCard(
      point("KPLS-2", "policeOffices", {
        title: "POLSEK KOSONG",
        jenis_kantor: "polsek",
        status: "operasional_penuh",
      }),
    );
    assert.equal(
      withoutPhone.details.some((d) => d.key === "kontak"),
      false,
    );
  });

  it("never shows health-facility contact even if a phone is stuffed in", () => {
    assert.equal(FEATURE_CARD_PUBLIC_CONTACT_LAYERS.has("facHealth"), false);
    const card = toFeatureCard(
      point("FSK-x", "facHealth", {
        title: "Pustu Tes",
        jenis: "Pustu",
        telepon: "6280000000000",
      }),
    );
    assert.equal(
      card.details.some((d) => d.key === "kontak"),
      false,
    );
  });
});

describe("feature-card mapper", () => {
  it("maps faskes required empty fields to Tidak ada informasi and omits media", () => {
    const card = toFeatureCard(
      point("FSK-empty", "facHealth", {
        title: "RSUD Tes",
        status: "tidak_operasional",
      }),
    );
    assert.equal(card.category, "FASILITAS KESEHATAN");
    assert.equal(card.media.length, 0);
    const tipe = card.details.find((d) => d.key === "tipe");
    const damage = card.details.find((d) => d.key === "tingkatKerusakan");
    assert.equal(tipe?.value, FEATURE_CARD_EMPTY);
    assert.equal(damage?.value, FEATURE_CARD_EMPTY);
  });

  it("maps masjid type and damage when present", () => {
    const card = toFeatureCard(
      point("FIBD-1", "facReligious", {
        title: "Masjid Tes",
        jenis_fasilitas_nama: "Masjid",
        skala_kerusakan: "rusak_ringan",
        alamat: "Desa Tes",
      }),
    );
    assert.equal(card.category, "RUMAH IBADAH");
    assert.equal(card.address, "Desa Tes");
    assert.equal(card.details.find((d) => d.key === "tipe")?.value, "Masjid");
    assert.equal(card.details.find((d) => d.key === "tingkatKerusakan")?.value, "Rusak ringan");
    assert.equal(card.details.find((d) => d.key === "tingkatKerusakan")?.tone, "warn");
    assert.match(card.subtitle ?? "", /Tidak ada kerusakan|Rusak ringan|Rumah Ibadah/);
  });

  it("maps police operational status and no-damage subtitle", () => {
    const card = toFeatureCard(
      point("KPLS-ok", "policeOffices", {
        title: "POLSEK BANDAR BARU",
        jenis_kantor: "polsek",
        status: "operasional_penuh",
        skala_kerusakan: "tidak_rusak",
        alamat: "Jl. Tes",
      }),
    );
    assert.equal(card.details.find((d) => d.key === "tipe")?.value, "Polsek");
    assert.equal(card.details.find((d) => d.key === "tingkatKerusakan")?.value, FEATURE_CARD_NO_DAMAGE);
    assert.equal(card.details.find((d) => d.key === "statusOperasional")?.tone, "ok");
  });

  it("maps jembatan, kejadian, laporan, and pelabuhan catalogs", () => {
    const bridge = toFeatureCard(
      point("irb-1", "infraRoadBridge", {
        title: "Jembatan Tes",
        status: "terputus",
      }),
    );
    assert.equal(bridge.details.find((d) => d.key === "statusOperasional")?.tone, "danger");

    const event = toFeatureCard(
      point("ACEH-1", "disasterEvents", {
        title: "Banjir — Tes",
        jenis_bencana: "Banjir",
        jiwa_terdampak: 10,
        hari_tanggal: "Januari 2022",
        kode_desa_kelurahan: "1101012001",
        kecamatan: "Bakongan",
        kabupaten: "Aceh Selatan",
      }),
    );
    assert.equal(event.details.find((d) => d.key === "jenisBencana")?.value, "Banjir");
    assert.equal(event.updatedAt, "Januari 2022");
    assert.equal(event.kodeDesa, "1101012001");
    assert.equal(event.kecamatan, "Bakongan");
    assert.equal(event.kabupaten, "Aceh Selatan");
    assert.equal(event.details.some((d) => d.key === "kodeDesa"), false);

    const laporan = toFeatureCard(
      point("laporan-kejadian-1", "laporanKejadian", {
        title: "KJD-1",
        jenis_bencana: "Longsor",
        nomor_laporan: "KJD-20260101-0001",
        skor_urgensi: 8,
      }),
    );
    assert.equal(laporan.details.find((d) => d.key === "nomorLaporan")?.value, "KJD-20260101-0001");

    const port = toFeatureCard(
      point("XA001", "maritimePorts", {
        title: "Pelabuhan Ulee Lheue",
        code: "XA001",
        weather: "Berawan",
        wave_cat: "Rendah",
        visibility: 8,
        tides: 1.2,
        wind_gust: 18,
      }),
    );
    assert.equal(port.category, "PELABUHAN");
    assert.equal(port.details.find((d) => d.key === "kode")?.value, "XA001");
    assert.equal(port.details.find((d) => d.key === "cuaca")?.value, "Berawan");
    assert.equal(port.details.find((d) => d.key === "visibilitas")?.value, "8");
    assert.equal(port.details.find((d) => d.key === "pasangSurut")?.value, "1.2");
    assert.equal(port.details.find((d) => d.key === "anginKencang")?.value, "18");

    const water = toFeatureCard(
      point("P.A.05", "maritimeWaters", {
        title: "Aceh Besar–Meulaboh",
        kode: "P.A.05",
        wave_cat: "Sedang",
        in_warning: true,
        warning_cat: "Sedang",
        outlook_max_wave_cat: "Tinggi",
      }),
    );
    assert.equal(water.category, "PERAIRAN");
    assert.equal(water.details.find((d) => d.key === "peringatan")?.value, "Sedang");
    assert.equal(water.details.find((d) => d.key === "puncak3Hari")?.value, "Tinggi");
  });

  it("omits optional media when empty and accepts only public URLs", () => {
    assert.deepEqual(extractPublicMedia([]), []);
    assert.deepEqual(extractPublicMedia("javascript:alert(1)"), []);
    assert.deepEqual(extractPublicMedia("https://example.com/a.jpg"), [
      { url: "https://example.com/a.jpg" },
    ]);
    const card = toFeatureCard(
      point("FSK-media", "facHealth", {
        title: "Pustu Foto",
        jenis: "Pustu",
        media: [{ url: "https://cdn.example/p.jpg", alt: "Pustu" }],
      }),
    );
    assert.equal(card.media.length, 1);
    assert.equal(card.media[0]?.url, "https://cdn.example/p.jpg");
  });

  it("treats education sentinel address as empty", () => {
    const card = toFeatureCard(
      point("fe-1", "facEducation", {
        title: "SD Tes",
        jenjang: "SD",
        alamat: "Alamat tidak ditemukan",
      }),
    );
    assert.equal(card.address, undefined);
    assert.equal(card.details.find((d) => d.key === "jenjang")?.value, "SD");
  });

  it("matches public ids across feature.id and overlay codes", () => {
    const port: Feature = {
      type: "Feature",
      id: "XA001",
      geometry: { type: "Point", coordinates: [95.3, 5.5] },
      properties: { code: "XA001", layer: "maritimePorts" },
    };
    assert.equal(featureMatchesPublicId(port, "XA001"), true);
    assert.equal(featureMatchesPublicId(port, "nope"), false);
  });
});

describe("feature-card fixture inventory", () => {
  it("reports coverage without inventing values; health addresses are mostly filled", () => {
    const fc = loadMarkers();
    const health = fc.features.filter((f) => f.properties?.layer === "facHealth");
    const quality = featureCardQuality(health);
    assert.ok(quality.n > 200);
    assert.ok(quality.addressEmptyPct < 5);
    const sample = toFeatureCard(health[0]!);
    assert.ok(sample.address || sample.details.some((d) => d.key === "tipe"));
    assert.equal(cardHasDeniedLeak(sample), false);
  });
});

describe("disasterEvents source labels", () => {
  it("maps only sik_aceh.db and leaves the event title and layer alone", () => {
    const pdf = "https://bpba.acehprov.go.id/media/2023.09/rekap.pdf";
    const card = toFeatureCard(
      point("ACEH-2023-0372", "disasterEvents", {
        title: "Kebakaran — Aceh Besar",
        jenis_bencana: "Kebakaran",
        sumber_data: [pdf, "https://www.antaranews.com/berita/1", "sik_aceh.db"],
        source: "sik_aceh.db",
      }),
    );
    assert.equal(card.title, "Kebakaran — Aceh Besar");
    assert.equal(card.layer, "disasterEvents");
    assert.equal(card.category, "KEJADIAN BENCANA");
    assert.deepEqual(card.sources, [pdf, "https://www.antaranews.com/berita/1", "Data Kejadian BPBA"]);
    assert.equal(card.subtitle?.includes("BPBA"), false);
  });

  it("renders disasterEvents source labels for the active locale", () => {
    const pdf = "https://bpba.acehprov.go.id/media/2023.09/rekap.pdf";
    const stored = [pdf, "kejadian_operasi", "SIK operasional", "sik_aceh.db"];
    const card = toFeatureCard(
      point("ACEH-2023-0372", "disasterEvents", {
        title: "Kebakaran — Aceh Besar",
        jenis_bencana: "Kebakaran",
        sumber_data: stored,
      }),
      { locale: "en" },
    );
    assert.deepEqual(card.sources, [
      pdf,
      "Operational incidents",
      "Operational incidents",
      "BPBA incident data",
    ]);
    assert.deepEqual(stored, [pdf, "kejadian_operasi", "SIK operasional", "sik_aceh.db"]);
    const idCard = toFeatureCard(
      point("ops-1", "disasterEvents", { source: "kejadian_operasi" }),
      { locale: "id" },
    );
    assert.deepEqual(idCard.sources, ["Kejadian operasional"]);
  });
});
