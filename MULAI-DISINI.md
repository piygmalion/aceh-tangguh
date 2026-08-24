# Mulai di sini — Aceh Tangguh

Folder kerja lokal untuk development. **Jangan push ke GitHub sampai fitur sudah final.**

## 1. Masuk ke folder ini

```bash
cd "Aceh tangguh"
```

## 2. Pasang dependensi

```bash
bun install
# atau: npm install
```

## 3. Environment

```bash
cp .env.example .env.local
```

Isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Jangan commit `.env.local`.

Tanpa env, aplikasi tetap jalan dari `public/fixtures` (mode fallback).

## 4. Jalankan

```bash
bun run dev
```

Buka [http://localhost:3000](http://localhost:3000) → redirect ke `/id/`.

## Peta folder

Lihat `docs/STRUKTUR.md`. Alur kerja lokal vs GitHub: `docs/PENGEMBANGAN-LOKAL.md`.
