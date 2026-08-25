import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  joinKabupatenToProfilDesa,
  kabupatenNamesMatch,
  stripKabupatenAdminPrefix,
} from "./kabupaten-join";

/** 23 profil_desa names (short / nama_normalisasi form). */
const PROFIL_DESA_NAMES = [
  "Aceh Selatan",
  "Aceh Tenggara",
  "Aceh Timur",
  "Aceh Tengah",
  "Aceh Barat",
  "Aceh Besar",
  "Pidie",
  "Aceh Utara",
  "Simeulue",
  "Aceh Singkil",
  "Bireuen",
  "Aceh Barat Daya",
  "Gayo Lues",
  "Aceh Jaya",
  "Nagan Raya",
  "Aceh Tamiang",
  "Bener Meriah",
  "Pidie Jaya",
  "Banda Aceh",
  "Sabang",
  "Lhokseumawe",
  "Langsa",
  "Subulussalam",
] as const;

describe("kabupaten join (read-path strip)", () => {
  it("matches Kota Langsa to Langsa without rewriting the marker name", () => {
    const markerKabupaten = "Kota Langsa";
    assert.equal(stripKabupatenAdminPrefix(markerKabupaten), "Langsa");
    assert.equal(kabupatenNamesMatch("Kota Langsa", "Langsa"), true);
    assert.equal(kabupatenNamesMatch("Langsa", "Kota Langsa"), true);
    assert.equal(
      joinKabupatenToProfilDesa(markerKabupaten, PROFIL_DESA_NAMES),
      "Langsa"
    );
    assert.equal(markerKabupaten, "Kota Langsa");
  });

  it("strips Kabupaten / Kota variants used by facHealth and facEducation", () => {
    assert.equal(
      joinKabupatenToProfilDesa("Kabupaten Aceh Tenggara", PROFIL_DESA_NAMES),
      "Aceh Tenggara"
    );
    assert.equal(
      joinKabupatenToProfilDesa("Kota Lhokseumawe", PROFIL_DESA_NAMES),
      "Lhokseumawe"
    );
    assert.equal(
      joinKabupatenToProfilDesa("Kota Subulussalam", PROFIL_DESA_NAMES),
      "Subulussalam"
    );
    assert.equal(
      kabupatenNamesMatch("Kab. Aceh Utara", "Aceh Utara"),
      true
    );
  });
});
