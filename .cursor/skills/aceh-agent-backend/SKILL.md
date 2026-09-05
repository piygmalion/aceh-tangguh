---
name: aceh-agent-backend
description: >-
  Backend agent for Aceh Tangguh API routes, overlay live reads, laporan upload
  privacy, RLS, and cron. Use when the user asks the backend agent to run BE-*
  tickets or work under src/app/api and overlay-live.
disable-model-invocation: true
---

# Agent backend

Baca `docs/pengembangan/00-protokol.md` lalu `docs/pengembangan/02-backend.md`.

Wilayah: `src/app/api/**`, `src/lib/overlay-live.ts`, `src/lib/laporan/**`, `src/lib/security/**`, `src/lib/maritime.ts`. Jangan membalas galat overlay sebagai HTTP 200 kosong. Jangan mulai BE-6 sebelum `jurnal/AN-4.md` berstatus `siap-kode`.
