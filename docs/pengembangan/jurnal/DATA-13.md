# DATA-13 — ingest WeatherNext 3 inovasi + fixture terpisah

Agent: data
Gelombang: 19
Status: selesai

## Niat

- Tujuan: Menyediakan jalur ingest baca-saja untuk WeatherNext 3 pada 23 sentroid kab/kota, tanpa menyentuh snapshot cuaca resmi.
- Berkas: `scripts/build-weather-inovasi-snapshot.mjs`; `scripts/lib/weather-inovasi-convert.mjs`; `public/fixtures/weather-inovasi-snapshot.json`; migrasi baru `weather_inovasi_snapshot` bila perlu cache.
- Langkah: skrip baru; bbox `ACEH_BBOX`; koleksi EE 0p05/0p1; `forecast_hour ≤ 48`. Tanpa allowlist: tulis `unconfigured` + array kosong, keluar 0. Jangan sunting `build-weather-snapshot.mjs`.
- Cara membuktikan: fixture default tidak berisi suhu; uji konversi; skrip menolak mengarang titik.
- Risiko: mencampur fixture resmi; mengarang angka; apply migrasi ke produksi dari tiket.

## Bacaan ulang niat

AN-24 sudah diverifikasi. Skrip baru, bukan sunting mesin resmi. Tanpa `WEATHERNEXT_EE_PROJECT` + token/raw: kosong sah. Dengan proyek+token tetapi tanpa berkas mentah: keluar 1, bukan payload palsu. Migrasi baru tidak di-apply dari tiket ini. DATA-4 tidak dibuka.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `scripts/build-weather-inovasi-snapshot.mjs` | Bbox Aceh, aset EE, `unconfiguredSnapshot`, `convertRawPoint`, RAW_PATH saja |
| `scripts/lib/weather-inovasi-convert.mjs` | K−273,15; m×1000; m/s×3,6; RH Magnus |
| `scripts/weather-inovasi-convert.test.mjs` | Konversi + gagal tertutup |
| `public/fixtures/weather-inovasi-snapshot.json` | `official: false`, `unconfigured`, `kabupaten_kota: []` |
| `supabase/migrations/20260921_weather_inovasi_forecasts.sql` | Tabel cache inovasi; RLS SELECT; tidak di-apply |
| `package.json` | `build:weather-inovasi` |

## Bukti

```
node --import tsx --test scripts/weather-inovasi-convert.test.mjs
Fixture default: tidak ada temperature_c; kabupaten_kota []
npm run build:weather-inovasi (tanpa EE): exit 0, tetap unconfigured
Tidak menyunting scripts/build-weather-snapshot.mjs
Migrasi baru tidak di-apply ke produksi
```

## Bacaan ulang bukti versus kriteria

- [x] Skrip baru; snapshot resmi tidak disentuh
- [x] 23 sentroid registry; bbox ACEH_BBOX
- [x] Tanpa allowlist: kosong, bukan suhu karangan
- [x] Field weather_code tidak diisi
- [x] DATA-4 tidak dibuka

## Keputusan

selesai
