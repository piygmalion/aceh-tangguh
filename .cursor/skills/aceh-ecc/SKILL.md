---
name: aceh-ecc
description: >-
  Maps the ECC harness loop onto Aceh Tangguh jurnal development. Use when the
  user mentions ECC, Everything Claude Code, harness, koordinator, or the
  plan-test-implement-review-verify-remember loop.
---

# ECC di Aceh Tangguh

Baca `docs/pengembangan/00-protokol.md`, lalu `docs/pengembangan/05-ecc.md`, lalu `docs/pengembangan/STATUS.md`. Jika bentrok, protokol Aceh menang.

## Loop

| ECC | Aceh |
| --- | --- |
| plan | Niat di `docs/pengembangan/jurnal/<id>.md`, lalu baca ulang niat |
| test | Bukti yang disebut brief (`npm test`, `tsc`, rute browser) |
| implement | Hanya berkas di niat; lewat agent wilayah |
| review | Baca ulang bukti versus kriteria |
| verify | Semua butir tertutup atau blocker; max lima putaran |
| remember | Jurnal + STATUS. Bukan Memory Vault sebagai aturan |

## Delegasi

Kerjakan lewat agent wilayah, bukan katalog ECC mentah:

- data → `01-data.md` / `aceh-agent-data`
- backend → `02-backend.md` / `aceh-agent-backend`
- frontend → `03-frontend.md` / `aceh-agent-frontend`
- analis → `04-analis.md` / `aceh-agent-analis`
- harness / koordinator → `05-ecc.md` / `aceh-agent-ecc`

## Clone sibling (baca, jangan salin massal)

Setelah ECC-A, skill allowlist ada di repo:

- `.cursor/skills/search-first/SKILL.md`
- `.cursor/skills/tdd-workflow/SKILL.md`
- `.cursor/skills/security-review/SKILL.md`

Clone sibling `../ecc` (pin `v2.2.0`) tetap boleh dibaca. Jangan jalankan `install.ps1` penuh (menarik hooks + MCP).

Jangan jalankan `install.ps1` kecuali tiket `KOORD-ECC-A` sudah `siap-kode`. Jangan eksekusi hook ECC di gelombang C. Jangan dump 286 skill.

## Larangan

- Jangan menimpa `aceh-pengembangan-protokol` atau `aceh-agent-{data,backend,frontend,analis}`.
- Jangan commit/push kecuali diminta. Jangan tebak Tatonas/KRB/korban.
- Jangan DATA-4, P2 Juklak, POST nasional.
- `.ecc/memory/` bukan kebijakan.
