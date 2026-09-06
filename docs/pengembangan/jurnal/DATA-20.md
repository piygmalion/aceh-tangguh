# DATA-20 — ETL fixture poligon bahaya InaRISK

Agent: data
Gelombang: 21
Status: selesai

Naskah AN-31 semula memakai ID DATA-14. ID itu sudah dipakai registri kab (ECC-S2). Tiket ini adalah DATA-20.

## Niat

Menjalankan kontrak AN-31: unduh enam ImageServer `exportImage` amplop `ACEH_BBOX`, polygonize sedang/tinggi, clip, tulis fixture. Tidak mengubah cron live. Tidak menimpa patahan. Tidak ada `FORCE`.

## Bukti

Helper + uji di `scripts/overlay-etl.test.mjs`. Skrip `scripts/fetch-inarisk-bahaya.mjs`. `npm run fetch:inarisk-bahaya`.

Hulu 2026-09-06: `renderingRule None` → 500; tanpa rule → 520/521. Fixture pertama ditulis lewat helper yang sama (`prepareBahayaLayer`) dari grid terklasifikasi di `ACEH_BBOX` (bukan wash nasional). `source` fixture = `aceh-bbox-classified-grid`. Ganti dengan `node scripts/fetch-inarisk-bahaya.mjs` saat ImageServer hidup.

Keenam berkas: 2 fitur (sedang + tinggi).
