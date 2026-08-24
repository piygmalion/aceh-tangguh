# Pengembangan lokal — Aceh Tangguh

Kesepakatan kerja: **develop di folder lokal `Aceh tangguh`**. GitHub (`piygmalion/aceh-tangguh`) hanya di-commit / di-push setelah suatu bagian **sudah final**.

## Dapatkan folder kerja

### A. Clone ke nama folder yang diminta

```bash
git clone https://github.com/piygmalion/aceh-tangguh.git "Aceh tangguh"
cd "Aceh tangguh"
```

### B. Salinan terstruktur (tanpa `.git`)

Dari root repo ini:

```bash
bash scripts/pack-local.sh "$HOME/Aceh tangguh"
cd "$HOME/Aceh tangguh"
```

Perintah itu juga menulis `Aceh-tangguh.zip` di folder induk (siap disalin ke laptop).

Jangan commit folder `Aceh tangguh/` kembali ke repo — sudah di `.gitignore`.

## Setup harian

```bash
cd "Aceh tangguh"
bun install                 # atau npm install
cp .env.example .env.local  # sekali saja
bun run dev                 # http://localhost:3000
```

Build produksi Node: `bun run build` lalu `bun run start`.  
Preview statis (tanpa API): `STATIC_EXPORT=1 bun run build` → folder `out/`.

## Yang tidak di-push selama development

- `.env.local` dan semua rahasia (`SERVICE_ROLE`, `LAPORAN_PII_KEY`, cron secret)
- `node_modules/`, `.next/`, `out/`
- Percobaan UI / data yang belum selesai
- Folder salinan `Aceh tangguh/` hasil `pack-local.sh`

Commit lokal (`git commit` di mesin sendiri) boleh, supaya ada history. Yang ditunda: **`git push` ke GitHub**.

## Saat sudah final

1. Pastikan `bun run build` lulus dan alur utama (homepage, peta, lapor, admin) terverifikasi.
2. Jangan sertakan `.env.local`.
3. Push branch, buka pull request ke `main`, baru merge.

Remote:

```
https://github.com/piygmalion/aceh-tangguh.git
```

Kalau salinan dibuat tanpa `.git`, inisialisasi saat siap rilis:

```bash
cd "Aceh tangguh"
git init
git remote add origin https://github.com/piygmalion/aceh-tangguh.git
git fetch origin
git checkout -b cursor/fitur-anda
```

## Stack singkat

Next.js 14, React 18, TypeScript, Tailwind 3, next-intl, MapLibre, TanStack Query, Zod, Supabase.
