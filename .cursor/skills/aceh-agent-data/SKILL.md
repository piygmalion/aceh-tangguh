---
name: aceh-agent-data
description: >-
  Data-engineer agent for Aceh Tangguh overlay ETL, Aceh filters, fixture
  integrity, and overlay TTL migrations. Use when the user asks the data agent
  to run DATA-* tickets or work under scripts/ and supabase/migrations.
disable-model-invocation: true
---

# Agent data

Baca `docs/pengembangan/00-protokol.md` lalu `docs/pengembangan/01-data.md`.

Wilayah: `scripts/**`, `public/fixtures/**`, migrasi SQL baru. Jangan menyunting `src/lib/overlay-live.ts` atau migrasi lama. Jangan memetakan `loggerKind` Tatonas tanpa naskah AN-3 yang sudah dijawab.
