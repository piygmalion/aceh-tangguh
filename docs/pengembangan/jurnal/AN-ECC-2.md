# AN-ECC-2 — uji wrapper ECC-C

Agent: analis
Gelombang: ECC-C
Status: selesai

## Niat

- Tujuan: Membuktikan wrapper C memenuhi AN-ECC-1 sebelum installer A.
- Berkas: daftar `.cursor/`, skill Aceh, `00-protokol.md`, `05-ecc.md`. Jangan mengubah `src/`.
- Langkah: cek berkas; cek diff skill wilayah; cek tidak ada dump ECC.
- Cara membuktikan: perintah di bawah + hasil.
- Risiko: menganggap kotoran `src/` lama sebagai kerja C.

## Bacaan ulang niat

Uji berkas, bukan UI. Kotoran `src/` yang sudah ada sebelum tiket ini bukan milik C.

## Perubahan

Tidak ada perubahan kode. Hanya jurnal + STATUS.

## Bukti

```
.cursor/skills/:
  aceh-pengembangan-protokol  (sunting tipis: 05-ecc.md)
  aceh-agent-data             (tidak diubah)
  aceh-agent-backend          (tidak diubah; masih membuka 02-backend.md)
  aceh-agent-frontend         (tidak diubah)
  aceh-agent-analis           (tidak diubah)
  aceh-ecc                    (baru; membuka 05-ecc.md)
  aceh-agent-ecc              (baru; disable-model-invocation: true)

.cursor/agents/: aceh-ecc.md saja (bukan ecc-*.md)
.cursor/hooks.json: tidak ada
.cursor/rules/: tidak ada
src/ tidak disentuh tiket C (ada dirty tree lama di luar lingkup)
```

`git diff` pada empat skill `aceh-agent-{data,backend,frontend,analis}` kosong.

## Bacaan ulang bukti versus kriteria

- [x] Lima skill Aceh lama ada
- [x] Tidak ada `.cursor/agents/ecc-*.md`, hooks, rules ECC
- [x] Agent backend tetap ke `02-backend.md`
- [x] ECC/harness ke `aceh-ecc` + `05-ecc.md`
- [x] Tidak ada perubahan `src/` dari C

## Keputusan

selesai
