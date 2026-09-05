import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { juklakToKrbJenis } from "./krb-jenis";

describe("juklakToKrbJenis", () => {
  it("maps alam codes 101–109 onto krb_jenis_bahaya", () => {
    assert.equal(juklakToKrbJenis({ kodeJenis: 101 }), "banjir");
    assert.equal(
      juklakToKrbJenis({ kodeJenis: 101, namaKejadian: "Banjir bandang" }),
      "banjir_bandang"
    );
    assert.equal(juklakToKrbJenis({ kodeJenis: 102 }), "tanah_longsor");
    assert.equal(juklakToKrbJenis({ kodeJenis: 103 }), "gelombang_ekstrim_abrasi");
    assert.equal(juklakToKrbJenis({ kodeJenis: 104 }), "cuaca_ekstrem");
    assert.equal(juklakToKrbJenis({ kodeJenis: 105 }), "kekeringan");
    assert.equal(juklakToKrbJenis({ kodeJenis: 106 }), "kebakaran_hutan_lahan");
    assert.equal(juklakToKrbJenis({ kodeJenis: 107 }), "gempabumi");
    assert.equal(juklakToKrbJenis({ kodeJenis: 108 }), "tsunami");
    assert.equal(juklakToKrbJenis({ kodeJenis: 109 }), "letusan_gunung_api");
  });

  it("hides the card for non-alam / sosial codes", () => {
    assert.equal(juklakToKrbJenis({ kodeJenis: 201 }), null);
    assert.equal(juklakToKrbJenis({ kodeJenis: 301 }), null);
    assert.equal(juklakToKrbJenis({ kodeJenis: null }), null);
  });
});
