import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const SOURCE = readFileSync(
  join(process.cwd(), "src/components/sik/KejadianOpsDetail.tsx"),
  "utf8"
);

const FORBIDDEN = [
  "Ajukan verifikasi",
  "Kunci data statis",
  "Buka kunci",
  "Cetak Lampiran I",
  "Gagal memuat kejadian",
  "Gagal menyimpan dampak",
  "Gagal mengubah fase data",
  "Kondisi mutakhir:",
  "Desa terdampak",
  "Belum ada lokasi tambahan.",
  "Korban (mikrodata)",
  "Pengungsi terpilah",
  "Kerusakan aset",
] as const;

describe("i18n detail kejadian (AN-12)", () => {
  it("KejadianOpsDetail tidak memuat string Indonesia yang sudah dipindah ke admin", () => {
    const offenders = FORBIDDEN.filter((literal) => SOURCE.includes(literal));
    assert.deepEqual(offenders, [], `${offenders.join(", ")} masih hardcoded`);
  });
});
