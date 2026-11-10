---
name: diagnosis-pr-ci-vercel
description: >-
  Mendiagnosis kegagalan pull request pada CI Quality GitHub Actions dan
  pratinjau Vercel untuk SIK Aceh. Use when a PR check, GitHub Actions
  quality job, or Vercel preview build fails. Wajib npm run build sebelum
  klaim siap terkait build.
---

# Diagnosis PR, CI, dan Vercel

Baca dulu `.github/workflows/ci.yml`, `vercel.json`, `package.json` `scripts`, dan `docs/vercel.md`. Jangan mengubah pengaturan Vercel, `vercel.json`, secret, atau env produksi. Jangan merge, jangan deploy, jangan menyalakan auto-merge. Jangan rebase atau push ke cabang PR agen lain.

## Dua jalur yang berbeda

Job `quality` pada push `main` dan pada pull request:

1. `actions/setup-node@v4` dengan `node-version: "22"`
2. `npm ci`
3. `npm run lint`
4. `npm run typecheck`
5. `npm test`
6. `python3 scripts/check-marker-kab-pip.py --tolerance-m 20` dengan `continue-on-error: true` (report-only, bukan gerbang)

`vercel.json` memakai framework Next.js, `installCommand` `npm ci`, `buildCommand` `npm run build`, region `sin1`. `npm run build` adalah `node scripts/run-next-build.mjs`. Quality tidak menjalankan perintah itu. Pratinjau Vercel bisa gagal saat Quality hijau.

Node produksi dan CI adalah 22, bukan 24: `.nvmrc` `22`, `package.json` `engines.node` `22.x`, dan `docs/vercel.md` bagian Node.js 22.x. Jangan mengubah `engines.node`.

## Sebelum klaim

Pada commit yang sama dengan head PR, jalankan `npm run build` setelah `npm ci` bila `node_modules` belum ada. Jangan set `STATIC_EXPORT`, `GITHUB_PAGES`, atau `NEXT_PUBLIC_BASE_PATH`. Kutip kode keluar. Jangan menulis bahwa build atau pratinjau siap bila perintah itu belum dijalankan pada head tersebut.

Skill `verify` menjalankan lint, typecheck, test, dan build. Pakai itu bila keempatnya belum ada buktinya pada commit yang sama.

## Cara memisahkan gejala

- Gagal di langkah Lint, Typecheck, atau Unit tests: perbaiki sesuai log job `quality`. Jangan mengarang skrip pengganti.
- Hanya langkah Marker kab PIP yang merah, dan `continue-on-error` masih terpasang: itu bukan kegagalan Quality. Sebutkan sebagai report-only.
- Quality hijau dan deployment Vercel gagal: jalankan `npm run build` di head yang sama. Bandingkan log build itu dengan log deployment. Jangan mengubah region, perintah instal, atau perintah build di dashboard.
- Workflow cron (cuaca, DIBI, Sipongi, ubin, dan lainnya) bukan job `quality`. Baca berkas `.github/workflows/` yang gagal. Jangan menganggap versi Node atau perintahnya sama dengan Quality.
- Log deployment tidak terbaca: tulis itu sebagai batas bukti. Jangan mengisi penyebab yang tidak ada di log.

Untuk kegagalan tak terduga pada build Vercel, peta, cache, atau data, ikuti `docs/agents/skills/systematic-debugging/SKILL.md` setelah checklist ini. Jangan mencetak nilai secret. Tes atau build hijau bukan GO.
