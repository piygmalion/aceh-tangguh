---
name: verify
description: >-
  Menjalankan verifikasi SIK Aceh dengan npm run lint, npm run typecheck,
  npm test, dan npm run build. Use when the user asks to verify, verifikasi,
  or to check lint, types, tests, and the Next.js build before a pull request.
---

# Verify

Node 22 (`.nvmrc` berisi `22`; `package.json` `engines.node` adalah `22.x`). Pasang ketergantungan dengan `npm ci`. CI (`.github/workflows/ci.yml`) dan `vercel.json` memakai npm, bukan Bun. Jangan menjalankan keempat perintah ini lewat `bun`.

Jalankan berurutan dari akar repositori. Keempat nama skrip ada di `package.json`. Jangan menggantinya dengan perintah yang tidak ada di sana: tidak ada `test:coverage`, Playwright, atau `bun test`.

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

| Perintah | Isi skrip |
| --- | --- |
| `npm run lint` | `next lint` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | `TSX_TSCONFIG_PATH=./tsconfig.test.json node --import tsx --test` pada `src/lib/*.test.ts`, `src/lib/**/*.test.ts`, dan `scripts/**/*.test.mjs` |
| `npm run build` | `node scripts/run-next-build.mjs` |

`scripts/run-next-build.mjs` memanggil `next build` bila `STATIC_EXPORT` dan `GITHUB_PAGES` tidak disetel `1`. Jangan mengekspor `STATIC_EXPORT`, `GITHUB_PAGES`, atau `NEXT_PUBLIC_BASE_PATH` supaya build lulus.

Job `quality` menjalankan `npm ci`, `npm run lint`, `npm run typecheck`, dan `npm test`. Job itu tidak menjalankan `npm run build`. Skill ini tetap menjalankan build. Langkah `python3 scripts/check-marker-kab-pip.py --tolerance-m 20` di CI `continue-on-error` dan bukan bagian skill ini.

Laporkan tiap perintah, kode keluar, dan kutipan kegagalan. Jangan menulis lulus untuk perintah yang tidak dijalankan. Empat perintah hijau bukan GO untuk merge atau deploy.
