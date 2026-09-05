# AN-ECC-4 — verifikasi install selektif ECC-A

Agent: analis
Gelombang: ECC-A
Status: selesai

## Niat

- Tujuan: Membuktikan A memenuhi AN-ECC-3 setelah salinan allowlist (bukan installer penuh).
- Berkas: `.cursor/skills/`, `.cursor/rules/`, `.cursor/agents/`, skill Aceh.
- Langkah: daftar berkas; bandingkan skill wilayah; pastikan hooks/MCP absen.
- Cara membuktikan: daftar di bawah.
- Risiko: menganggap doctor "no install-state" sebagai gagal — itu hasil yang diinginkan.

## Bacaan ulang niat

Installer resmi ditolak. Verifikasi = allowlist ada, dump tidak ada, protokol menang.

## Perubahan

Tidak ada perubahan `src/`. Hanya jurnal + STATUS.

## Bukti

Skill Aceh tetap:

- `aceh-pengembangan-protokol` (ada `05-ecc.md`)
- `aceh-agent-data` → `01-data.md`
- `aceh-agent-backend` → `02-backend.md`
- `aceh-agent-frontend` → `03-frontend.md`
- `aceh-agent-analis` → `04-analis.md`
- `aceh-ecc` + `aceh-agent-ecc` (`disable-model-invocation: true`)

Allowlist ECC (asal `../ecc` v2.2.0 `5eddf1a3`):

- `tdd-workflow`, `search-first`, `security-review` (banner overlay Aceh)
- `typescript-*.mdc` × 4, `alwaysApply: false`

Tidak ada: `.cursor/hooks.json`, `.cursor/mcp.json`, `.cursor/agents/ecc-*.md`, `ecc-install-state.json`.

Doctor: "No ECC install-state files found for the current home/project context."

`src/` tidak disentuh tiket A.

## Bacaan ulang bukti versus kriteria

- [x] Skill `aceh-*` utuh
- [x] Hooks tidak aktif
- [x] Tidak ada merge MCP
- [x] Berkas baru tercatat di KOORD-ECC-A
- [x] Agent wilayah tetap ke brief lama
- [x] `src/` tidak tersentuh tiket A

## Keputusan

selesai
