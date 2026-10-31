# AGENTS.md — SIK Aceh

Konteks untuk agen Cursor di repositori ini. Larangan keras ada di `.cursor/rules/guardrails.mdc` (`alwaysApply`). Empat berkas `.cursor/rules/typescript-*.mdc` tetap berlaku untuk `*.ts`, `*.tsx`, `*.js`, dan `*.jsx`. Jangan menimpa isinya.

## Pemilik dan bahasa

- Pemilik: Pygmalion Indonesia, zona waktu WIB.
- Balas pemilik dalam Bahasa Indonesia.
- Judul dan deskripsi pull request dalam Bahasa Indonesia.
- Agen hanya membuka PR. Jangan merge dan jangan menyalakan auto-merge.

## Merek tampilan

Teks yang pengguna baca memakai **SIK Aceh** (Sistem Informasi Kebencanaan Aceh). Bahasa Inggris tidak menerjemahkan merek. Descriptor "Aceh Disaster Information System" hanya di footer dan meta locale `en`.

Yang tetap (bukan salinan tampilan):

- Nama repositori dan paket `aceh-tangguh`.
- Domain produksi `https://aceh-tangguh.vercel.app` (`SITE_ORIGIN` di `src/app/[locale]/layout.tsx`, `PRODUCTION_SITE_ORIGIN` di `src/lib/auth/email-invite.ts`).
- Nama variabel lingkungan, skema basis data, nama rute, dan konfigurasi Vercel.
- Kredit foto di `public/media/CREDITS.md`, termasuk "Foto aerial DJI — dokumentasi Aceh Tangguh".

Entri katalog `id: "sik-aceh"` di `src/lib/data-sources.ts` ditampilkan "Data Kejadian BPBA — master SQLite (pengayaan)" / "BPBA incident data". Token tersimpan `sik_aceh.db` ditampilkan "Data Kejadian BPBA" / "BPBA incident data" hanya lewat `displaySumberEntry` di `src/lib/sumber-label.ts`. Id `sik-aceh`, berkas `data/sik/sik_aceh.db`, dan prefiks id kejadian `SIK-` tidak ditulis ulang. URL, PDF, dan nama media lain tetap verbatim.

## Stack yang ada di repo

- Next.js 14.2.35, React 18, TypeScript, Tailwind CSS 3, `next-intl` (locale `id` bawaan dan `en`, prefiks locale selalu ada).
- Peta: MapLibre, react-map-gl, PMTiles. Klien data: TanStack Query dan Zod. Grafik: Recharts.
- Supabase proyek `whojoxrbcdyotrpolgav`. Geometri ada di `public/fixtures` dan `public/tiles`, bukan PostGIS.
- Node 22 (`.nvmrc`, `engines` di `package.json`, CI). `vercel.json`: `npm ci`, `npm run build`, region `sin1`.
- CI kualitas: `.github/workflows/ci.yml` pada push `main` dan pull request menjalankan `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`.
- Pratinjau publik adalah Vercel, bukan GitHub Pages. Jangan menyetel `STATIC_EXPORT`, `GITHUB_PAGES`, atau `NEXT_PUBLIC_BASE_PATH` di Vercel. `bun.lock` ada; CI dan Vercel memakai npm.

## Tata letak

- `src/app/[locale]/` halaman. `src/app/api/` rute API. Path terlokalisasi di `src/i18n/routing.ts`.
- `src/components/`, `src/lib/`, `src/hooks/`, `messages/id.json`, `messages/en.json`.
- `public/fixtures/`, `public/tiles/`, `public/media/`.
- `data/staff/` untuk fixture staf. `data/sik/sik_aceh.db` di-gitignore (`data/sik/README.md`). `data/drive-clean/` ada di pohon data.
- `supabase/migrations/` — migrasi yang sudah ada tidak disunting. Berkas SQL baru hanya dengan persetujuan tertulis di PR.
- `scripts/` untuk impor, ubin, cuaca, dan SIK. Tiket pengembangan: `docs/pengembangan/00-protokol.md` dan `docs/pengembangan/STATUS.md`. Skill wilayah: `.cursor/skills/aceh-*`.
- Deploy dan nama env: `docs/vercel.md` dan `.env.example`. Nilai secret tidak masuk git.

## Menjalankan

```bash
npm ci
npm run dev          # http://localhost:3000/id
npm run build        # scripts/run-next-build.mjs → next build
npm run start
npm run lint         # next lint
npm run typecheck    # tsc --noEmit
npm test             # node:test + tsx; src/lib/**/*.test.ts dan scripts/**/*.test.mjs
```

Salin `.env.example` ke `.env.local` untuk admin dan tulis laporan. `SUPABASE_SERVICE_ROLE_KEY` serta secret cron hanya di server. Tanpa env, banyak loader jatuh ke fixture.

## Verifikasi sebelum PR

1. Untuk perubahan kode, `npm run lint`, `npm run typecheck`, dan `npm test` lulus. CI yang sama ada di `.github/workflows/ci.yml`.
2. Perubahan UI: buka rute terdampak di `/id/...` dan padanan `/en/...` dari `src/i18n/routing.ts`. Cek keadaan kosong dan gagal.
3. Jangan mengarang kode Tatonas, zona KRB, atau angka korban (`docs/pengembangan/00-protokol.md`). FeatureCollection kosong saat sumber gagal bukan keberhasilan.
4. Jangan menghapus fixture, isi `data/`, ubin yang di-commit, atau berkas `*.db`.
5. Buka PR. Jangan merge.

## Arah visual yang dikunci repo

Sumber: `docs/pengembangan/visual/SPEK-TERKUNCI.md`, `src/app/globals.css`, `src/app/[locale]/layout.tsx`, `src/lib/peudeung-v2.test.ts`.

- Huruf: Plus Jakarta Sans lewat `next/font` (bobot 400–800, variabel `--font-sans`). `.type-display` bobot 800. Spesifikasi mengunci tanpa webfont baru.
- Chrome Peudeung v2 di `globals.css`: `--merah-peudeung` `#c8102e`, tautan `#8e1224`, kertas `#f7f7f7`, tinta `#111111`, `--accent-on-light` `#c8102e`.
- Lantai 13px (`--type-floor: 0.8125rem`). Di bawah 640px, padding bagian 2rem / 3.5rem / 4.5rem.
- Status hibrida peta: aman `#10b981`, waspada `#fbbf24`, siaga `#f97316`, awas `#c8102e`. Komentar CSS menyebut pendekatan warna PVMBG, bukan hex resmi.
- Konstanta data tidak di-alias ke Peudeung: forest `#1F4C15`, gold `#C4A35A`, orange `#FF7722` (`src/lib/peudeung-v2.test.ts`).

## Aturan Cursor

| Berkas | Cakupan |
| --- | --- |
| `.cursor/rules/guardrails.mdc` | Selalu. Bahasa, domain, env, skema, rute, Vercel, secret, data, merge. |
| `.cursor/rules/merek-tampilan.mdc` | `messages/`, komponen, dan label sumber. |
| `.cursor/rules/visual-peudeung.mdc` | CSS, Tailwind, dan komponen. |
| `.cursor/rules/verifikasi.mdc` | Saat menyunting `src/`, `scripts/`, atau `messages/`. |
| `.cursor/rules/typescript-*.mdc` | Gaya, pola, keamanan, dan uji TypeScript yang sudah ada. |

## Metodologi

Bagian di atas berkas ini berasal dari PR #137 dan tetap berlaku. Empat skill di `docs/agents/skills/` adalah prosedur yang dibaca saat bagian ini mewajibkannya. Atribusi, commit sumber, dan suntingan lokal ada di `docs/agents/skills/ATRIBUSI.md`. Lisensi MIT asli ada di `docs/agents/skills/LICENSE`.

Skill tidak diletakkan di `.cursor/rules/`. Berkas di sana adalah aturan pendek `.mdc` dengan `alwaysApply` atau `globs`, termasuk empat aturan TypeScript yang tidak ditimpa. Skill tidak diletakkan di `.cursor/skills/` karena deskripsi upstream debugging memicu diri untuk setiap bug, termasuk suntingan yang bagian ini kecualikan. `docs/agents/skills/` memuat salinan beserta berkas pendamping yang saling merujuk di direktori yang sama, terpisah dari skill wilayah `.cursor/skills/aceh-*`.

### Bahasa

Jawaban kepada pemilik, laporan, jurnal, serta judul dan deskripsi pull request ditulis dalam Bahasa Indonesia. Path, nama skill, dan cuplikan kode boleh tetap seperti di sumber.

### Kapan tiap skill wajib

- **`systematic-debugging`** (`docs/agents/skills/systematic-debugging/SKILL.md`) wajib untuk bug, tes gagal, build gagal, atau perilaku tak terduga pada peta (MapLibre, react-map-gl, PMTiles, ubin), cache, Vercel (build, runtime, pratinjau), atau data (fixture, loader, Supabase, SIK, skrip impor). Ikuti empat fase. Cari akar masalah sebelum mengusulkan perbaikan. Skill ini tidak dipakai untuk perubahan salinan atau UI kecil yang tidak mengubah perilaku peta, cache, Vercel, atau data.
- **`verification-before-completion`** (`docs/agents/skills/verification-before-completion/SKILL.md`) wajib sebelum klaim selesai, diperbaiki, atau lulus, termasuk sebelum commit dan sebelum membuka PR. Untuk perubahan kode, bukti segar pada giliran yang sama adalah keluaran perintah di bagian Verifikasi sebelum PR: `npm run lint`, `npm run typecheck`, dan `npm test`. `npm run build` dipakai bila perubahan menyentuh konfigurasi Next, rute, atau impor yang hanya pecah saat build. Perubahan UI tetap dicek di `/id` dan padanan `/en`.
- **`writing-plans`** (`docs/agents/skills/writing-plans/SKILL.md`) wajib sebelum menyentuh kode pada tugas multi-langkah (lebih dari satu subsistem, atau beberapa berkas perilaku). Rencana disimpan di `docs/pengembangan/rencana/` kecuali pemilik menentukan lokasi lain. Tunggu tinjauan pemilik sebelum implementasi. Perubahan salinan atau UI kecil satu titik tidak memerlukan rencana ini.
- **`requesting-code-review`** (`docs/agents/skills/requesting-code-review/SKILL.md`) wajib setelah fitur besar, atau setelah perbaikan bug peta, cache, Vercel, atau data, sebelum PR dianggap siap ditinjau. Reviewer menilai diff. Temuan Critical dan Important diperbaiki di cabang fitur. Perubahan salinan atau UI kecil tidak memerlukan review subagen ini.

Bagian Verifikasi sebelum PR tetap berlaku untuk setiap perubahan kode.

### Integrasi

Agen membuka pull request. Merge, deploy, push ke `main`, dan auto-merge tidak dijalankan. GO langsung Pak Pygmalion pada giliran itu, tertulis di tugas, adalah satu-satunya pembuka larangan tersebut. Tes hijau, penilaian review, atau rencana selesai bukan GO.

`git push` ke cabang fitur untuk membuka PR mengikuti alur yang sudah ada. Itu bukan push ke `main`.

### Jika bentrok

`AGENTS.md` menang atas skill yang disalin. Berikutnya `.cursor/rules/guardrails.mdc`, lalu `docs/pengembangan/00-protokol.md`. Skill tidak memberi izin mengubah domain, nama variabel lingkungan, skema atau migrasi, nama rute, `vercel.json`, secret, atau kredit foto, dan tidak memberi izin mengarang kode Tatonas, zona KRB, atau angka korban.
