# KOORD-G3 — bacaan ulang koordinator gelombang 3

Agent: koordinator
Gelombang: 3
Status: selesai

## Niat

Membaca ulang jurnal AN-5, BE-7, FE-4, FE-5, FE-6, DATA-3, BE-8 dan mencocokkan kode ke kontrak AN-5. Tidak mengerjakan DATA-4. Tidak menambah UI calon.

## Bacaan ulang niat

Verifikasi, bukan implementasi baru. DATA-3 dan BE-8 hanya sah jika AN-5 `siap-kode` — sudah terpenuhi sebelum keduanya dijalankan.

## Bukti

- DATA-3: helper clip sisi di `overlay-etl.mjs`; kueri tetap `esriSpatialRelIntersects` + `ACEH_BBOX` `[95.0, 2.0, 98.3, 6.15]`; skrip menolak tulis jika salah satu layer 0 fitur. Fixture diisi ulang: 22 LineString patahan lon 95–98,3 / lat 2,7666–6,15; 2 Polygon megathrust lon 95–98,3 / lat 2–4,4904; 0 vertex di luar amplop.
- BE-8: migrasi baru `20260916_overlay_live_refresh.sql` (SELECT anon+authenticated, tanpa write staf). `resolveOverlayLiveRead` delapan cabang; uji lama tanpa ledger + kosong = 503. Kosong sah (`ok` + `feature_count=0` + tanpa baris) = 200 tanpa `stale`/`upstream`. `planOverlayLiveWrite([],…)` tetap `clear`. Tidak ada sentinel. `types.ts` tidak di-generate.
- BE-7: tulis `v2:<keyId>:…`; `v1:` tetap terbuka lewat primer lalu `LAPORAN_PII_KEYS`.
- FE-4: `HazardStatusStrip.tsx` dan `src/app/api/hazards/route.ts` tidak ada; pratinjau `/api/hazards` = 503.
- FE-5: pratinjau catalog 200 dari `enabledMapLayersCatalog()`; meta tanpa berkas = `{ items: [], source: "fixture" }`.
- FE-6: `tatonasStations` bukan `MarkerLayerKey`; tetap `OverlayLayerKey`; `?layers=` dibuang, `?overlays=` hidup. `mergeTatonasOverlays` tidak dipanggil dari rute marker.
- Pengecualian kontrak FE-6: AN-5 meminta `"tatonasStations"` di `REMOVED_MARKER_LAYER_KEYS`. Tidak ditambah. Daftar itu juga memfilter `enabledMapLayersCatalog()`, jadi kunci yang sama akan menyembunyikan overlay Geospasial. Perilaku URL sudah sama lewat `KNOWN_MARKER_LAYER_KEYS`.
- `npm test` 278 lulus; `tsc --noEmit` lulus.

## Bacaan ulang bukti versus kriteria

- [x] AN-5 tetap kontrak `siap-kode`; DATA-3/BE-8/FE-6 tidak menambah opsi
- [x] Clip sisi, bukan filter; bukan poligon administrasi
- [x] Kosong sah = 200; belum refresh / hulu gagal = 503; senter tabel, bukan sentinel
- [x] Tatonas tidak dipindah ke marker; `loggerKind` tidak ditebak
- [x] Uji hijau

## Catatan terbuka (bukan blocker gelombang 3)

DATA-4 menunggu jawaban penyedia (AN-3).

Sisa dokumentasi `/api/hazards` di README dan `security/attack-surface.md`; `qk.hazards` dan namespace i18n `hazards` tidak dihapus (luar FE-4).

UI daftar/terima calon masih di luar BE-6.

Produksi perlu: terapkan migrasi `20260913`–`20260916`; set `OVERLAY_CRON_SECRET` dan `OVERLAY_REFRESH_URL`; opsional `LAPORAN_PII_KEY_ID` / `LAPORAN_PII_KEYS`.

## Keputusan

selesai
