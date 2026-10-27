import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkKabKode, loadKabKodeInputs } from "./check-kab-kode.mjs";

describe("check-kab-kode", () => {
  it("keeps 23 unique Kemendagri codes and unswapped kode_sik", () => {
    const { registry, boundaries } = loadKabKodeInputs();
    const errors = checkKabKode(registry, boundaries);
    assert.deepEqual(errors, []);
  });
});
