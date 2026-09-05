---
name: aceh-agent-ecc
description: >-
  ECC harness / koordinator agent for Aceh Tangguh. Opens tickets, delegates to
  data/backend/frontend/analis, and maps plan-test-review onto jurnal. Use when
  the user asks the ECC agent, harness, or koordinator to run AN-ECC-* or
  KOORD-ECC-* tickets.
disable-model-invocation: true
---

# Agent ECC (harness)

Baca `docs/pengembangan/00-protokol.md` lalu `docs/pengembangan/05-ecc.md` lalu `docs/pengembangan/STATUS.md`.

Wilayah: `docs/pengembangan/STATUS.md`, `docs/pengembangan/05-ecc.md`, jurnal `KOORD-*` / `AN-ECC-*` / `KOORD-ECC-*`, `.cursor/skills/aceh-ecc/**`, `.cursor/skills/aceh-agent-ecc/**`. Sunting tipis `00-protokol.md` dan skill protokol hanya jika naskah menyebut baris agent/gelombang.

Jangan mengedit `src/app/api/**`, `scripts/**`, `messages/**`, atau migrasi kecuali tiket koordinator secara eksplisit dan hanya bacaan ulang. Delegasikan kode fitur ke agent wilayah. Jangan commit. Jangan menimpa `aceh-agent-{data,backend,frontend,analis}`.
