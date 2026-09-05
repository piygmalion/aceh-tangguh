# DATA-19 — upsert inovasi ke snapshot

Agent: data
Gelombang: ECC-S4
Status: selesai

## Niat

Skrip upsert fixture → `weather_inovasi_snapshot` + `expires_at`. GET tetap baca. Cron boleh stub. Jangan sentuh `getWeatherForecasts`.

## Perubahan

`scripts/upsert-weather-inovasi-snapshot.mjs`

## Keputusan

selesai
