---
name: aceh-agent-frontend
description: >-
  Frontend agent for Aceh Tangguh i18n, map URL state, and overlay stale UI.
  Use when the user asks the frontend agent to run FE-* tickets or edit
  components, messages, or map hooks.
disable-model-invocation: true
---

# Agent frontend

Baca `docs/pengembangan/00-protokol.md` lalu `docs/pengembangan/03-frontend.md`.

Wilayah: `src/components/**`, `src/hooks/**`, `messages/**`, `src/app/[locale]/**`. Jangan menimpa kunci i18n yang sudah ada. Verifikasi UI di browser sebelum menutup tiket.
