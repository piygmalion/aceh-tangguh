# FE-6 — tatonasStations hanya overlay

Agent: frontend
Gelombang: 3
Status: selesai

## Niat

- Tujuan: `tatonasStations` adalah overlay Geospasial (umpan hidup), bukan marker toolbar Lokasi. Hapus kunci itu dari union `MarkerLayerKey` dan peta warna/ikon marker. Tetap di `OverlayLayerKey`.
- Berkas:
  - `src/lib/types.ts` — hapus `"tatonasStations"` dari `MarkerLayerKey`. Biarkan di `OverlayLayerKey`.
  - `src/lib/layer-colors.ts` — hapus entri marker `tatonasStations` dari `LAYER_COLORS` (`Record<MarkerLayerKey>`).
  - `src/lib/layer-icons.ts` — hapus dari `LAYER_ICON_FILES`; biarkan `OVERLAY_LAYER_ICON_FILES.tatonasStations`.
  - `src/lib/map-layers-catalog.ts` — tidak mengubah entri overlay (sudah `kind: "overlay"`, `source_path: "/api/overlay/tatonasStations"`). Tidak menambah ke `LIVE_MARKER_LAYER_KEYS` / `RETIRED_MARKER_LAYER_KEYS`.
  - Uji: `src/lib/layer-colors.test.ts`, `src/lib/overlay-layers.test.ts`, `src/lib/map-layers-catalog.test.ts`.
- Tidak diubah: `src/lib/map-url-aliases.ts` (luar daftar berkas tiket). Tidak ada pola alias `?layers=` → `?overlays=`. `MARKER_LAYER_ALIASES` hanya marker→marker (`citizenReports`). Jadi `?layers=tatonasStations` **diabaikan** (sudah: `expandMarkerLayerKeys` hanya menerima LIVE+RETIRED marker). `?overlays=tatonasStations` tetap lewat `parseOverlayLayers`.
- Tidak diubah: `messages` (kunci `map.tatonasStations` tetap untuk overlay), overlay-live, Supabase, `data-sources.ts`.
- Langkah:
  1. Hapus dari `MarkerLayerKey`.
  2. Sesuaikan `LAYER_COLORS` dan `LAYER_ICON_FILES` agar `Record<MarkerLayerKey>` kompilasi.
  3. Pastikan overlay icon/katalog/URL tidak pecah.
- Cara membuktikan:
  - `tsc --noEmit` atau `npm test` tidak gagal karena `Record<MarkerLayerKey>` kurang/lebih kunci.
  - `"tatonasStations" in LAYER_COLORS` = false; tetap ada di `OVERLAY_LAYER_ICON_FILES`.
  - `parseMarkerLayers("tatonasStations")` = `[]` (bukan default layers — raw tidak kosong).
  - `parseOverlayLayers("tatonasStations")` = `["tatonasStations"]`.
  - Katalog lokal: `tatonasStations` tetap `kind: "overlay"`.
  - Toolbar Lokasi tidak memuat kunci itu (sudah; `LIVE_MARKER_LAYER_KEYS`).
- Risiko:
  - Alias baru layers→overlays akan menulis `map-url-aliases.ts` di luar wilayah dan bisa mengubah URL — tidak dilakukan.
  - Fitur GeoJSON dengan `properties.layer === "tatonasStations"` di umpan overlay tetap string biasa, bukan `MarkerLayerKey`.

## Bacaan ulang niat

Niat bisa dijalankan tanpa menebak kode perangkat Tatonas. Hanya memindahkan kunci tipe/warna/ikon marker yang salah union. Overlay dan `?overlays=` tidak diubah. `?layers=` diabaikan karena tidak ada pola alias ke overlay. Tidak commit.

## Perubahan

| Berkas | Ubah |
| --- | --- |
| `src/lib/types.ts` | `tatonasStations` dihapus dari `MarkerLayerKey`; tetap di `OverlayLayerKey` |
| `src/lib/layer-colors.ts` | entri marker `tatonasStations` dihapus dari `LAYER_COLORS` |
| `src/lib/layer-icons.ts` | dihapus dari `LAYER_ICON_FILES`; `OVERLAY_LAYER_ICON_FILES` tidak diubah |
| `src/lib/layer-colors.test.ts` | assert kunci tidak ada di `LAYER_COLORS` |
| `src/lib/overlay-layers.test.ts` | `parseOverlayLayers("tatonasStations")` tetap `["tatonasStations"]` |
| `src/lib/map-layers-catalog.test.ts` | katalog overlay + `parseMarkerLayers("tatonasStations")` = `[]` |

`map-layers-catalog.ts` tidak perlu diubah (sudah overlay-only). `map-url-aliases.ts` tidak diubah: tidak ada pola alias layers→overlays.

## Bukti

Putaran 1.

`MarkerLayerKey` tidak lagi memuat `tatonasStations`. `OverlayLayerKey` masih memuatnya.

`"tatonasStations" in LAYER_COLORS` = false. `"tatonasStations" in LAYER_ICON_FILES` = false. `"tatonasStations" in OVERLAY_LAYER_ICON_FILES` = true.

Katalog: `kind: "overlay"`, `source_path: "/api/overlay/tatonasStations"`.

`parseMarkerLayers("tatonasStations")` = `[]`. `resolveMapUrlAliases({ layersRaw: "tatonasStations" }).markerLayers` = `[]`.

`parseOverlayLayers("tatonasStations")` = `["tatonasStations"]`. `isOverlayLayerKey("tatonasStations")` = true.

`npx tsc --noEmit` — exit 0.

`npm test` — tests 266, pass 266, fail 0.

## Bacaan ulang bukti versus kriteria

- [x] `tatonasStations` bukan `MarkerLayerKey`.
- [x] Tetap overlay; `?overlays=tatonasStations` parse tidak pecah.
- [x] `?layers=tatonasStations` diabaikan (bukan default layers, hasil `[]`).
- [x] Warna/ikon marker tanpa kunci itu; ikon overlay tetap.
- [x] `npm test` 266/266.

## Keputusan

selesai
