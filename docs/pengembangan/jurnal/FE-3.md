# FE-3 — tampilan stale/gagal overlay

Agent: frontend
Gelombang: 2
Status: selesai

## Niat

- Tujuan: Petugas harus membedakan "tidak ada kejadian" dari "sumber overlay hidup mati atau cache tertunda". HTTP 503 atau badan `stale: true` / `error: "upstream"` (BE-1) tidak boleh ditelan sebagai FeatureCollection kosong tanpa status di toolbar/panel layer. Layer yang masih punya fitur tetap digambar.
- Berkas:
  - `src/hooks/useOverlayGeojson.ts` — parse badan overlay + fetch + hook status umpan hidup (baru).
  - `src/hooks/useOverlayGeojson.test.ts` — uji murni parse 503 / stale / kosong sah (baru; `npm test` tidak memindai `src/hooks/**`, dijalankan terpisah).
  - `src/components/map/MapOverlays.tsx` — `fetchOverlayGeojson` tidak lagi mengembalikan `EMPTY_FC` saat `!res.ok`; gambar `features` jika ada.
  - `src/components/map/MapToolbar.tsx` — chip/peringatan di tab Geospasial dan daftar overlay di Legenda.
  - `messages/id.json` dan `messages/en.json` — hanya menambah kunci namespace `map`.
- Tidak diubah: `src/app/api/**`, `src/lib/**`, raster InaRISK, kunci `overlayStale` (itu label prakiraan maritim).
- Langkah:
  1. Fungsi murni `parseOverlayResponse({ ok, status, body })` → `{ collection, health, stale, error, httpStatus }`.
     - Badan FeatureCollection dipakai meski status bukan 2xx (agar 503 + fitur/cache tidak dibuang).
     - `health`: `upstream` jika `error === "upstream"` atau status 503; `stale` jika `stale: true`; `failed` jika `!ok` tanpa itu; `ok` jika 2xx tanpa `stale`.
     - Kosong sah = 200 + features `[]` tanpa `stale`/`error` → `ok` (bukan peringatan).
  2. `fetchOverlayGeojson` membaca JSON juga saat `!res.ok`. Tidak melempar untuk 503 agar React Query menyimpan hasil + status, bukan menelan jadi kosong.
  3. `OverlayVector` menggambar `result.collection.features` (boleh kosong). Query key tetap `qk.overlay(key)` agar toolbar berbagi cache.
  4. Umpan hidup yang dipantau: `bmkgQuakes`, `magmaQuakes`, `magmaVolcanoes`, `sipongiHotspots`, `tatonasStations`. Toolbar hanya menampilkan chip jika layer itu aktif.
  5. Kunci baru (jangan menimpa yang lama): `overlayLiveStale`, `overlayLiveUpstream`, `overlayLiveFailed`, `overlayLiveStaleHint`, `overlayLiveUpstreamHint`.
  6. Di tab Geospasial: banner `role="status"` + chip per baris layer aktif. Di tab Legenda: chip yang sama di samping nama overlay hidup.
- Cara membuktikan:
  - Uji parse: 503 + `stale` + `error: "upstream"` → `health=upstream`, features tidak dibuang jika ada; 200 + `stale: true` + fitur → `health=stale` dan fitur tetap; 200 kosong tanpa `stale` → `ok`.
  - Grep `MapOverlays.tsx`: tidak ada `if (!res.ok) return EMPTY_FC`.
  - Setiap `t("overlayLive…")` ada di `id.json` dan `en.json`; kunci lama `overlayStale` tidak berubah.
  - Browser: `/id/peta?overlays=bmkgQuakes` — tab Geospasial. Jika API 503/stale, peringatan terlihat. Jika server tidak hidup, catat dan uji status tidak disembunyikan (uji parse + markup).
  - `npm test` (PowerShell: `;` bukan `&&`).
- Risiko:
  - Menimpa `overlayStale` merusak popup maritim — tidak diubah.
  - Fetch 503 yang melempar akan membuat React Query `isError` tanpa koleksi — dicegah: parse, jangan throw.
  - Raster InaRISK di luar lingkup; kegagalan ubin tidak ditandai di tiket ini.

## Bacaan ulang niat

Niat bisa dijalankan tanpa menebak data resmi. Status diambil dari kontrak BE-1 (503 + `stale` + `error: "upstream"`; cache = 200 + `stale` + fitur). Kosong sah tidak diberi chip. Peringatan wajib di toolbar atau panel layer — keduanya disentuh. `MapViewport` tidak perlu berubah: ia hanya merender `MapOverlays`. Hook baru di wilayah frontend; `src/lib` tidak disunting. Uji unit hook di luar glob `npm test` — itu keterbatasan skrip yang ada, bukan alasan memindahkan parse ke `src/lib`.

## Perubahan

| Berkas | Ubah |
| --- | --- |
| `src/hooks/useOverlayGeojson.ts` | parse 503/stale, fetch tanpa menelan `!ok`, hook status umpan hidup |
| `src/hooks/useOverlayGeojson.test.ts` | tujuh uji parse/klasifikasi |
| `src/components/map/MapOverlays.tsx` | gambar `data.collection`; tidak `return EMPTY_FC` pada `!res.ok` |
| `src/components/map/MapToolbar.tsx` | banner `role="status"` + chip di Geospasial dan Legenda |
| `messages/id.json` | lima kunci `overlayLive*` baru; `overlayStale` tidak diubah |
| `messages/en.json` | pasangan Inggris; `overlayStale` tetap "Forecast delayed" |

## Bukti

Putaran 1.

Grep `MapOverlays.tsx`: tidak ada `if (!res.ok) return EMPTY_FC`.

`node --import tsx --test src/hooks/useOverlayGeojson.test.ts` — tests 7, pass 7.

`npx tsc --noEmit` — exit 0.

`npm test` — tests 218, pass 218, fail 0.

Kunci `map`: `overlayLiveStale`, `overlayLiveUpstream`, `overlayLiveFailed`, `overlayLiveStaleHint`, `overlayLiveUpstreamHint` ada di id dan en. `overlayStale` tetap "Prakiraan tertunda" / "Forecast delayed". Jumlah kunci `map` id=en.

Server `http://localhost:3122` (dev). Tab IDE browser tidak bisa dipegang; verifikasi lewat Playwright.

Live API saat uji: `magmaQuakes` / `magmaVolcanoes` / `sipongiHotspots` / `tatonasStations` = 503 + `stale: true` + `error: "upstream"` + features `[]`. `bmkgQuakes` kadang 200 kosong, kadang 503 (flaky).

`/id/peta?overlays=magmaQuakes,sipongiHotspots` — tab Geospasial: `status` "Sumber hidup gagal. Layer kosong di sini bukan berarti tidak ada kejadian."; chip "Sumber gagal" pada Gempa MAGMA dan Hotspot Sipongi. Tab Legenda: chip yang sama di samping nama layer. Bukan tampilan "tidak ada data".

`/en/peta?overlays=magmaQuakes` — chip "Source failed" pada MAGMA earthquakes.

Mock 200 kosong tanpa `stale` untuk `bmkgQuakes`: checkbox Gempa BMKG aktif, tidak ada "Sumber gagal" / "Data tertunda". Kosong sah tidak diingatkan.

Mock 200 + `stale: true` + satu titik cache (95.3, 5.5): banner "Umpan hidup tertunda…"; chip "Data tertunda" pada Gempa BMKG; titik oranye tampak dekat Banda Aceh. Layer stale tetap digambar.

## Bacaan ulang bukti versus kriteria

- [x] Overlay 503 atau `stale: true` tidak disamarkan sebagai "tidak ada data" — 503 MAGMA/Sipongi menampilkan banner + chip; 200 stale BMKG menampilkan "Data tertunda", bukan diam.
- [x] Petugas melihat peringatan di toolbar atau panel layer — Geospasial (`role="status"` + chip) dan Legenda (chip).
- [x] Layer dengan fitur stale tetap tampil — parse menahan features; mock 200 stale menggambar titik cache.
- [x] `npm test` lulus — 218/218.

## Keputusan

selesai
