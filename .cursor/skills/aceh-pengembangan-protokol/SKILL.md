---
name: aceh-pengembangan-protokol
description: >-
  Runs Aceh Tangguh post-review development with a write-then-reread loop until
  acceptance is met. Use when the user mentions pengembangan, gelombang, jurnal
  tiket, agent data/backend/frontend/analis/ecc, harness ECC, or files under
  docs/pengembangan/.
---

# Protokol pengembangan

Baca dan ikuti `docs/pengembangan/00-protokol.md`. Status hidup ada di `docs/pengembangan/STATUS.md`.

1. Tentukan agent dari permintaan. Buka brief: `01-data.md`, `02-backend.md`, `03-frontend.md`, `04-analis.md`, atau `05-ecc.md` (harness/koordinator).
2. Salin `docs/pengembangan/jurnal/_template.md` ke `jurnal/<ID>.md`.
3. Tulis Niat. Baca ulang Niat. Baru kemudian ubah kode.
4. Tulis Bukti. Baca ulang Bukti versus kriteria di brief. Ulangi sampai semua butir tertutup atau lima putaran.
5. Perbarui STATUS. Jangan commit. Jangan mengerjakan tiket gelombang berikutnya yang masih menunggu.
6. Jangan menebak kode Tatonas, zona KRB, atau angka korban.
