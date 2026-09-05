# AN-ECC-5 — naskah skema kerapian data / tampilan / backend

Agent: ecc
Gelombang: ECC-S
Status: selesai

## Niat

- Tujuan: Meneliti seluruh gelombang yang sudah selesai dan pohon kode yang dihasilkan, lalu menulis skema pengembangan agar struktur data, tampilan, dan backend semakin rapi — tanpa mengerjakan tiket fitur, tanpa DATA-4, tanpa mengubah `src/` pada tiket ini.
- Berkas: jurnal ini; `docs/pengembangan/06-skema-kerapian.md`; baris STATUS gelombang ECC-S; sunting tipis `00-protokol.md`, `05-ecc.md`, brief 01–04.
- Langkah: search-first di repo; tulis keputusan gelombang; baca ulang versus kriteria.
- Cara membuktikan: setiap usulan punya berkas sumber, agent pemilik, dan larangan.
- Risiko: merancang ulang G0–G19; membuka P2 Juklak; menggabungkan cuaca.

## Bacaan ulang niat

Skema, bukan kode aplikasi. Empat agent wilayah tetap. DATA-4 tertahan.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `docs/pengembangan/06-skema-kerapian.md` | Kontrak S1–S4 |
| `docs/pengembangan/STATUS.md` | Gelombang ECC-S |
| `docs/pengembangan/00-protokol.md` | Baris gelombang ECC-S |
| `docs/pengembangan/01-data.md` … `05-ecc.md` | Tiket pointer |
| `docs/pengembangan/jurnal/AN-ECC-5.md` | Jurnal ini |

`src/` tidak berubah.

## Bukti

Search-first (repo saja; tidak ada npm paket baru):

- Data: 38 migrasi; kab 4 bentuk; `ACEH_BBOX` vs `ACEH_BOUNDS`; `jembatan.json` dirujuk di `map-layers-catalog.ts`; `overlay-static-rows.json` tidak dibaca `src/`.
- Backend: 73 rute; live 503 vs static 200; `qk.hazards` yatim; refresh cuaca di luar `/cron/`.
- Frontend: `CalonKejadianList` → `useTranslations("sikCalon")`; Grep `messages/` = nol untuk `sikCalon` / `sikSdb` / `overlayLiveStale`; calon/sdb absen di `routing.ts`.

Skema membagi S1 (aman, paralel) / S2–S3 (naskah dulu) / S4 (ditahan).

## Bacaan ulang bukti versus kriteria

- [x] Riset data/backend/frontend ada sumber berkas
- [x] Skema punya gelombang + pemilik + larangan
- [x] `src/` tidak berubah
- [x] DATA-4 / Juklak / POST nasional tidak dibuka

## Keputusan

selesai
