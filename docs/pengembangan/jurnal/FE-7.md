# FE-7 — Rapikan sisa `/api/hazards`

Agent: frontend
Gelombang: 4
Status: selesai

## Niat

- Tujuan: Komponen `HazardStatusStrip` dan rute `GET /api/hazards` sudah dihapus (FE-4). Rapikan sisa yang menyesatkan: dokumentasi yang masih mendaftar rute itu, klaim README bahwa marker menggabungkan Tatonas, kunci query `qk.hazards` tanpa pemakai, komentar `HazardStatusStrip` pada alias URL, dan namespace i18n `hazards` jika tidak terpakai.
- Berkas (hanya ini):
  - `README.md` — hapus baris tabel `GET /api/hazards`. Pada baris `GET /api/layers/markers`, hapus klaim merge `tatonasStations` (FE-6: Tatonas hanya overlay).
  - `security/attack-surface.md` — hapus `/api/hazards` dari daftar Public GET.
  - `src/lib/qk.ts` — hapus `hazards` hanya jika grep di `src/` = nol pemakai (sudah: satu-satunya kemunculan adalah definisi itu sendiri).
  - `src/lib/map-url-aliases.ts` — perbaiki komentar yang menyebut HazardStatusStrip; `?hazard=` dan `HAZARD_TO_DISASTER_JENIS` tetap.
  - `messages/id.json`, `messages/en.json` — hapus namespace puncak `"hazards"` hanya jika tidak ada `t("hazards…")` / `useTranslations("hazards")`. Jangan menimpa kunci lain.
- Tidak diubah:
  - `HazardKind`, `HazardStatus`, `hazard-kinds.ts`, `?hazard=`, `HAZARD_TO_DISASTER_JENIS`, `parseHazardKind`.
  - Tidak menghidupkan `HazardStatusStrip`.
  - Overlay-live, Supabase, DATA-4, preview `/api/hazards` 503 (FE-4).
  - UI calon (FE-8). `messages` selain namespace `"hazards"` — termasuk teks panduan `panduan.s8.body` yang masih menyebut GET `/api/hazards` (kunci lain; tidak menimpa).
- Langkah:
  1. Hapus baris `GET /api/hazards` di README.
  2. Di README, baris markers: biarkan merge `laporanKejadian` / `laporanPenanganan`; jangan sebut `tatonasStations`.
  3. Hapus `/api/hazards` dari Public GET di attack-surface.
  4. Hapus `qk.hazards`.
  5. Komentar alias: kunci = `HazardKind`; `?hazard=` tetap alias jenis; strip sudah tidak ada.
  6. Hapus objek `"hazards"` di kedua berkas messages (dua kunci `label`/`error` sisa strip).
- Cara membuktikan:
  - Grep `/api/hazards` di `README.md` dan `security/attack-surface.md` = tidak ada.
  - Grep `qk.hazards` di `src/` = tidak ada.
  - Grep `"hazards"` di messages: namespace puncak hilang; `t("hazardsTitle")` di IRBI (`useTranslations("irbi")`) tidak tersentuh.
  - `npm test` (PowerShell: `;` bukan `&&`).
  - `npx tsc --noEmit`.
- Risiko:
  - Menghapus `HazardKind` / `?hazard=` karena nama mirip — dicegah: hanya dokumentasi, `qk.hazards`, komentar, namespace i18n strip.
  - Menimpa kunci i18n lain — dicegah: hanya hapus blok `"hazards": { ... }`.
  - Teks panduan masih menyebut rute lama — tercatat, tidak diubah (aturan jangan menimpa kunci lain).

## Bacaan ulang niat

Niat bisa dijalankan tanpa menebak data resmi. Keputusan hapus `qk.hazards` dan namespace `hazards` berdasarkan grep sebelum kode: nol `qk.hazards` di pemakai, nol `useTranslations("hazards")` / `t("hazards…")`. `t("hazardsTitle")` milik namespace `irbi`, bukan `hazards`. Baris README markers hanya membuang klaim Tatonas, tidak menulis ulang merge operasi/pengungsian. `?hazard=` tetap. Tidak commit. Tidak FE-8 / AN-6 / DATA-4.

## Perubahan

| Berkas | Ubah |
| --- | --- |
| `README.md` | baris `GET /api/hazards` dihapus; baris markers tanpa klaim `tatonasStations` |
| `security/attack-surface.md` | `/api/hazards` dihapus dari Public GET |
| `src/lib/qk.ts` | `hazards: ["hazards"]` dihapus |
| `src/lib/map-url-aliases.ts` | komentar: `?hazard=` alias jenis; strip sudah tidak ada |
| `messages/id.json` | namespace `"hazards"` dihapus |
| `messages/en.json` | namespace `"hazards"` dihapus |
| `docs/pengembangan/STATUS.md` | baris FE-7 → selesai |

## Bukti

Putaran 1.

Grep sebelum kode: `qk.hazards` hanya di `src/lib/qk.ts`. `useTranslations("hazards")` / `t("hazards…")` = tidak ada. `t("hazardsTitle")` di `IrbiHeroPanel` memakai namespace `irbi`.

Grep `/api/hazards` di `README.md` = tidak ada. Grep `/api/hazards` di `security/attack-surface.md` = tidak ada.

Grep `qk.hazards` di `src/` = tidak ada.

Grep `"hazards"` di `messages/` = tidak ada (namespace puncak dihapus).

README markers: `merges overlay laporanKejadian / laporanPenanganan` — tanpa `tatonasStations`.

`HAZARD_TO_DISASTER_JENIS`, `parseHazardKind`, `HazardKind`, `hazard-kinds.ts` tetap. `?hazard=` tetap di `useMapUrlState`.

`node` parse `messages/id.json` + `messages/en.json` — ok.

`npm test` — tests 278, pass 278, fail 0.

`npx tsc --noEmit` — exit 0.

Sisa di luar niat (tidak disunting): `panduan.s8.body` (en) masih menyebut GET `/api/hazards`; preview FE-4 `/api/hazards` → 503.

## Bacaan ulang bukti versus kriteria

- [x] Grep `/api/hazards` di README dan attack-surface = tidak ada
- [x] `qk.hazards` tidak ada di `src/`
- [x] Namespace `messages.hazards` dihapus; tidak ada pemakai `t("hazards…")`
- [x] Komentar `map-url-aliases` tidak menyebut HazardStatusStrip sebagai komponen hidup; `?hazard=` tetap
- [x] README markers tidak mengklaim merge `tatonasStations`
- [x] `npm test` hijau — 278/278
- [x] `npx tsc --noEmit` exit 0

## Keputusan

selesai
