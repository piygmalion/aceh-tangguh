# AN-5 — naskah clip patahan + kosong-vs-503

Agent: analis
Gelombang: 3
Status: selesai — naskah terpakai gelombang 3. Jangan ditulis ulang.

## Niat

- Tujuan: Mengunci tiga keputusan operasional agar DATA-3, BE-8, dan FE-6 bisa dikode tanpa tebakan dan tanpa cabang “nanti kita lihat”. Tiket ini tulisan. Tidak mengimplementasikan DATA-3 / BE-8 / FE-6. Tidak mengubah `src/` kecuali baris AN-5 di STATUS.
- Berkas:
  - `docs/pengembangan/jurnal/AN-5.md` — niat + naskah
  - Baris AN-5 di `docs/pengembangan/STATUS.md` (hanya setelah bacaan ulang kedua lolos)
- Langkah:
  1. Tulis niat tiga keputusan: clip vs intersects; kosong sah vs 503; `tatonasStations` hanya overlay.
  2. Baca ulang niat sebagai orang yang tidak menulisnya; hapus opsi, tebakan `loggerKind`, zona KRB, angka korban, dan poligon administrasi baru.
  3. Tulis naskah lengkap yang bisa dijalankan ketiga tiket.
  4. Baca ulang seluruh naskah sebagai orang yang akan mengerjakan DATA-3, BE-8, atau FE-6 besok.
  5. Status jurnal `siap-kode` hanya jika setiap keputusan punya satu perilaku.
- Cara membuktikan:
  - DATA-3: clip geometri ke `ACEH_BBOX` yang sudah ada; helper murni di `overlay-etl.mjs`; skrip tidak hanya memfilter fitur.
  - BE-8: kosong sah = 200 tanpa `stale`/`upstream`; belum refresh / hulu gagal = 503; satu senter `overlay_live_refresh`, bukan baris sentinel.
  - FE-6: hapus `tatonasStations` dari `MarkerLayerKey`; tetap di `OverlayLayerKey`; jangan memindahkan Tatonas ke marker.
- Risiko:
  - Memakai bbox sebagai klaim batas resmi Aceh — dilarang. Clip adalah potongan amplop kueri yang sama, bukan administrasi.
  - Mengarang poligon kabupaten/GADM untuk memotong patahan — dilarang.
  - Baris sentinel di `overlay_live_features` — dilarang (bocor ke calon AN-4, purge, GeoJSON).
  - Menebak `loggerKind` / `kd_hardware` — dilarang; DATA-4 menunggu jawaban AN-3.
  - Zona KRB atau angka korban — dilarang.

## Bacaan ulang niat

Niat tulisan murni. Tiga keputusan harus berupa aturan, bukan opsi. Fixture megathrust hari ini dua poligon dengan rentang ≈ 91,4–98,7 E / −0,6–12,1 N — jauh di luar `ACEH_BBOX` [95, 2, 98,3, 6,15] karena kueri `intersects` membawa geometri utuh. Clip memotong sisi, bukan membuang/menyimpan fitur utuh. GET live tidak boleh memakai ketiadaan baris sebagai satu-satunya bukti gagal: cron sukses 0 fitur sudah `DELETE` layer (`planOverlayLiveWrite` `clear`). Senter = tabel `overlay_live_refresh` per `layer_key`. Tatonas sudah overlay Geospasial di katalog dan `data-sources`; kunci duplikat di `MarkerLayerKey` dihapus, tidak dipindah ke toolbar Lokasi.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `docs/pengembangan/jurnal/AN-5.md` | Naskah keputusan untuk DATA-3, BE-8, FE-6 (bagian di bawah) |
| `docs/pengembangan/STATUS.md` | Baris AN-5 → `siap-kode` setelah bacaan ulang kedua |

## Naskah (untuk DATA-3, BE-8, FE-6)

Naskah ini adalah kontrak implementasi. Jangan menambah opsi, dependensi npm baru, poligon administrasi, pemetaan Tatonas, zona KRB, atau angka korban. Jangan mengubah migrasi yang sudah ada; berkas SQL baru saja.

---

### 1. DATA-3 — patahan / megathrust: **clip** ke `ACEH_BBOX`

**Keputusan.** Tetap kueri InaRISK dengan `esriSpatialRelIntersects` + amplop `ACEH_BBOX` yang sudah ada. Setelah unduh, **potong geometri** setiap fitur ke `ACEH_BBOX`. Jangan biarkan geometri utuh. Jangan hanya memfilter fitur.

**Alasan operasional.**

- `inariskFaultQueryUrl` memakai `spatialRel=esriSpatialRelIntersects` dan amplop `ACEH_BBOX` `[95.0, 2.0, 98.3, 6.15]` (sama dengan `src/lib/basemap.ts`). Intersects mengembalikan fitur **utuh** yang menyentuh amplop.
- Fixture hari ini membuktikan kebocoran itu, tanpa jaringan baru: `megathrust-aceh.geojson` = 2 `Polygon`, rentang ≈ lon 91,44–98,68 / lat −0,58–12,10; `sumatera-fault-aceh.geojson` = 22 `LineString`, rentang ≈ lon 93,81–99,00 / lat 1,98–6,85. Keduanya keluar dari amplop kueri.
- Megathrust adalah zona subduksi panjang. Menyimpan poligon utuh membuat layer “Aceh” menggambar Andaman sampai ekuator, menarik kamera, dan menyiratkan cakupan yang bukan AOI operasional.
- Memfilter fitur (centroid / satu titik wakil di dalam bbox) **salah**: centroid megathrust bisa di luar Aceh sehingga layer kosong, atau sebaliknya fitur tetap utuh. Satu-satunya perbaikan yang memakai amplop yang sudah ada: **clip sisi**.
- Protokol melarang bbox sebagai pengganti batas administratif. Clip di sini **bukan** klaim “ini wilayah resmi Aceh”. Itu potongan kartografis ke amplop kueri yang sama. Amplop sudah diketahui memuat sliver non-Aceh (contoh titik: Pangkalan Susu). Layer patahan **tidak** menempelkan kabupaten dan **tidak** memakai GADM untuk memotong. Sliver Sumut di tepi timur amplop **diterima**.

**`ACEH_BBOX` yang wajib.** Hanya konstanta yang sudah ada di `scripts/lib/overlay-etl.mjs`: `[95.0, 2.0, 98.3, 6.15]`. Jangan mengganti angka. Jangan mengarang poligon administrasi baru.

**Helper murni (wajib, agar bisa diuji).** Di `scripts/lib/overlay-etl.mjs`, tanpa paket npm baru:

| Nama | Perilaku |
| --- | --- |
| `clipGeometryToBbox(geometry, bbox = ACEH_BBOX)` | Mengembalikan geometri terpotong, atau `null` jika tidak ada sisa. |
| `clipFeatureCollectionToBbox(collection, bbox = ACEH_BBOX)` | Tidak mengubah argumen. Menyalin `properties` / `id` fitur; memotong `geometry`; membuang fitur yang geometrinya `null` atau degenerate. `type` koleksi tetap `FeatureCollection`; field lain pada koleksi (mis. `source`) disalin apa adanya. |

Inklusivitas sama dengan `inAcehBbox`: tepi amplop dihitung di dalam (`>=` / `<=`).

**Aturan potong (bukan filter vertex).**

1. **Potong sisi** yang memotong tepi amplop. Jangan hanya menyimpan vertex yang `inAcehBbox`. Garis dengan kedua ujung di luar amplop tetapi menyeberang Aceh **wajib** menyisakan segmen di dalam.
2. `Point` / `MultiPoint`: simpan hanya titik di dalam amplop.
3. `LineString` / `MultiLineString`: clip tiap segmen ke persegi (Liang–Barsky atau setara). Sisa boleh `LineString` atau `MultiLineString`. Buang bagian panjang nol.
4. `Polygon` / `MultiPolygon`: clip cincin ke persegi (Sutherland–Hodgman atau setara). Wajib: megathrust adalah `Polygon`. Buang cincin luar yang hilang; buang lubang yang hilang. Jika tidak ada cincin luar tersisa → `null`.
5. `GeometryCollection`: clip tiap anggota; buang yang kosong.
6. Tipe tidak dikenal → `null`.
7. Jangan mengisi koordinat, KRB, atau atribut baru.

**Yang boleh dilakukan `scripts/fetch-inarisk-faults.mjs`.**

- Tetap memakai `inariskFaultQueryUrl` (intersects + `ACEH_BBOX`). Jangan mengubah `spatialRel`.
- Setelah `fetchJson`, memanggil `clipFeatureCollectionToBbox` **sebelum** `writeFile`.
- Tetap menandai `properties.layer` dan `title` seperti sekarang (`Name` / `Segment`).
- Layer tetap: id 6 → `sumatera-fault-aceh.geojson` / `inariskSumateraFault`; id 0 → `megathrust-aceh.geojson` / `inariskMegathrust`.
- Jika **salah satu** layer setelah clip punya `features.length === 0`: `process.exit(1)` dan **jangan menulis kedua berkas** (jangan menimpa fixture lama dengan kosong). Tidak ada `FORCE` pada tiket ini.
- Boleh menambahkan uji di `scripts/overlay-etl.test.mjs` untuk helper.

**Yang tidak boleh dilakukan skrip itu.**

- Hanya `features.filter(...)` tanpa memotong geometri.
- Mengganti intersects dengan contains / envelop-index, atau menambah `distance` buffer.
- Mengunduh / mengarang batas kabupaten, GADM, atau poligon “Aceh resmi”.
- Mengubah angka `ACEH_BBOX`.
- Menebak zona KRB, korban, atau atribut InaRISK yang tidak ada di properti unduhan.
- Memasukkan patahan ke scrape Ruang Kita / gerbang `assessOverlayFeatureCounts` (skrip ini terpisah; manifest Ruang Kita tidak wajib memuat patahan).
- Mengubah `src/`.

**Uji wajib helper (tanpa jaringan).**

- `LineString` yang menyeberang tepi amplop: sisa di dalam; tidak utuh; tidak hilang.
- `Polygon` yang mirip megathrust (vertex di luar, badan memotong amplop): setelah clip, semua vertex sisa di dalam amplop (inklusif); `properties` utuh.
- Fitur sepenuhnya di luar → hilang dari koleksi.
- `inariskFaultQueryUrl` tetap memuat `esriSpatialRelIntersects` dan koordinat `ACEH_BBOX`.

DATA-3 mengisi ulang kedua fixture dengan menjalankan skrip setelah helper ada. Catalog / `loadOverlayVector` sudah menunjuk berkas yang sama; jangan memindahkan path.

---

### 2. BE-8 — GET overlay live kosong sah = **200** tanpa stale/upstream

**Keputusan.** Refresh hulu **berhasil** dengan 0 fitur Aceh adalah keadaan sah: HTTP **200**, `FeatureCollection` `features: []`, **tanpa** `stale`, **tanpa** `error: "upstream"`. FE-3 sudah memetakan itu ke `health: ok` (bukan chip “Sumber gagal”). Jangan tetap 503 untuk kasus ini.

**Senter — pilih satu: tabel `overlay_live_refresh` (bukan sentinel).**

Jangan menyisipkan baris fiktif ke `overlay_live_features`. Sentinel akan terbaca calon AN-4, `purge_expired_overlay_rows`, dan GeoJSON publik.

Migrasi **baru** (jangan menyunting migrasi lama), nama berkas `supabase/migrations/20260916_overlay_live_refresh.sql`:

```
overlay_live_refresh
  layer_key text primary key
    check (layer_key in (
      'bmkgQuakes',
      'magmaQuakes',
      'magmaVolcanoes',
      'sipongiHotspots',
      'tatonasStations'
    ))
  refreshed_at timestamptz not null
  ok boolean not null
  feature_count integer not null check (feature_count >= 0)
  error text null
```

- RLS: `ENABLE`. `SELECT` untuk `anon` dan `authenticated` (`using (true)`), sama semangat `overlay_live_features`. `INSERT`/`UPDATE`/`DELETE` hanya service role (jangan kebijakan write staf).
- Indeks tidak wajib selain PK.

`planOverlayLiveWrite` **tetap** `clear` jika 0 fitur (hapus baris layer agar gempa/hotspot lama tidak menumpuk). Jangan mengisi titik fiktif. Jangan membatalkan `clear`.

**Kapan baris senter ditulis** (satu aturan, setelah upaya persist/fetch layer itu selesai):

| Hasil refresh layer | Tulis `overlay_live_refresh` | Baris `overlay_live_features` |
| --- | --- | --- |
| Fetch melempar | `ok = false`, `feature_count` = hitungan cache yang tersisa (0 jika tidak ada), `error` = pesan, `refreshed_at` = sekarang | **jangan** dihapus / diganti |
| Fetch sukses, `persistLive` gagal | `ok = false`, `feature_count` = hitungan cache yang tersisa, `error` = gagal persist, `refreshed_at` = sekarang | biarkan apa yang ditinggal persist (sudah rollback/gagal) |
| Fetch sukses, persist sukses, N fitur | `ok = true`, `feature_count = N`, `error = null`, `refreshed_at` = sekarang | `replace` seperti sekarang |
| Fetch sukses, persist sukses, 0 fitur | `ok = true`, `feature_count = 0`, `error = null`, `refreshed_at` = sekarang | `clear` seperti sekarang |

`refreshOverlayLive` mengembalikan `ok: true` **hanya** jika persist **dan** tulis senter berhasil. Fetch sukses + persist gagal = `ok: false` (hari ini fungsi bisa mengembalikan `ok: true` meski persist gagal — itu diluruskan di BE-8).

Tulis senter **setelah** persist/clear diketahui hasilnya. `feature_count` saat gagal = `COUNT(*)` baris `overlay_live_features` untuk `layer_key` itu setelah upaya itu; jika `COUNT` gagal, tulis `feature_count = 0` dan tetap `ok = false`.

Jika persist sukses tetapi tulis senter gagal: kembalikan `ok: false` pada hasil refresh. Jangan menghapus fitur yang baru ditulis. GET memakai ledger **lama** (jika ada) bersama baris yang ada — lihat tabel di bawah, cabang “ledger 0 + ada baris”.

**GET — `resolveOverlayLiveRead`.** Parameter ketiga `ledger` (default `null`). Uji lama `resolveOverlayLiveRead(rows, nowMs)` tanpa ledger tetap 503 jika baris kosong. `loadOverlayLive` untuk kunci live: `readStoredLive` + `SELECT` satu baris `overlay_live_refresh` untuk `layer_key` itu (klien baca yang sama dengan fitur, bukan scrape hulu).

`ledger` = baris `overlay_live_refresh` untuk `layer_key` itu, atau `null` jika belum ada.

| ledger | baris fitur | Hasil GET |
| --- | --- | --- |
| `null` | kosong / `null` | **503** + `OVERLAY_UPSTREAM_FAILURE_BODY` (belum pernah refresh) |
| `null` | ada | perilaku `expires_at` yang sudah ada (200 atau 200 `stale`) |
| `ok === false` | kosong | **503** + `OVERLAY_UPSTREAM_FAILURE_BODY` (hulu/persist gagal, tidak ada cache) |
| `ok === false` | ada | **200** + `stale: true`, tanpa `error: "upstream"`, fitur cache (sama `resolveOverlayLiveFailure` ber-cache) |
| `ok === true` dan `feature_count === 0` | kosong / `null` | **200**, `features: []`, tanpa `stale`, tanpa `error` (kosong sah) |
| `ok === true` dan `feature_count === 0` | ada | perilaku `expires_at` pada baris itu (jangan dibuang; senter 0 tidak menelan fitur yang sudah tertulis) |
| `ok === true` dan `feature_count > 0` | kosong | **503** + badan upstream (purge atau hilang setelah sukses berfitur; bukan kosong sah) |
| `ok === true` dan `feature_count > 0` | ada | perilaku `expires_at` yang sudah ada |

Jangan men-generate ulang `src/lib/supabase/types.ts`. Cast baris ledger seperti BE-4 men-cast `expires_at`.

Definisi operasional yang dikunci:

- **Belum pernah refresh / hulu gagal** = tidak ada ledger dan tidak ada baris; atau `ledger.ok === false` tanpa cache; atau ledger sukses dengan `feature_count > 0` tetapi baris sudah kosong.
- **Refresh sukses, nol fitur Aceh** = `ledger.ok === true` dan `ledger.feature_count === 0` dan tidak ada baris fitur.

Jangan memakai `now()` sebagai pengganti ledger. Jangan memakai 503 untuk “Aceh sepi”. Jangan menambah field `stale` pada kosong sah.

**Yang tidak berubah.**

- Fixture statis (`seismicSensors`, `maritimePorts`, patahan, perairan): tetap 200 meski koleksi kosong; **jangan** memakai ledger.
- `catch` rute overlay tetap 503 + `OVERLAY_UPSTREAM_FAILURE_BODY`.
- FE-3: tidak diubah. 200 kosong tanpa `stale` sudah “bukan peringatan”.
- AN-4 / BE-6: `syncCalonDariOverlay` tetap hanya setelah persist layer sukses (termasuk `clear` 0 fitur). Kosong sah tetap boleh menandai tautan `putus`. Jangan sync jika fetch/persist gagal. Jangan membaca baris sentinel (tidak ada).
- `purge_expired_overlay_rows` tidak menulis ledger. Setelah purge mengosongkan layer yang `feature_count > 0`, GET = 503 sampai cron sukses berikutnya.

**Uji wajib (murni, tanpa jaringan).**

- Ledger `ok` + `feature_count = 0` + baris `[]` → 200, tanpa `stale`/`error`.
- Ledger `ok` + `feature_count = 0` + ada fitur → 200 mengikuti `expires_at`, bukan koleksi kosong paksa.
- Tanpa ledger + baris `[]` → 503 + `error: "upstream"`.
- Ledger `ok: false` + baris `[]` → 503.
- Ledger `ok: false` + ada fitur → 200 `stale`, bukan 503.
- Ledger `ok` + `feature_count > 0` + baris `[]` → 503.
- `planOverlayLiveWrite([], …)` tetap `{ action: "clear" }`.

---

### 3. FE-6 — `tatonasStations`: **hapus dari `MarkerLayerKey`**

**Keputusan.** `tatonasStations` hanya overlay Geospasial. Hapus dari `MarkerLayerKey`. Tetap di `OverlayLayerKey`. **Jangan** memindahkan Tatonas ke marker, `marker_features`, toolbar Lokasi, atau `GET /api/layers/markers`.

**Alasan.** `src/lib/data-sources.ts` (id `tatonas-monitoring`) sudah menulis: kartu Peringatan Dini + overlay Geospasial `tatonasStations`, **bukan** toolbar Lokasi. Katalog `map-layers-catalog.ts` sudah `kind: "overlay"`, `meta.toolbar: "geospasial"`, `source_path: "/api/overlay/tatonasStations"`. `OVERLAY_LAYER_KEYS` / `OVERLAY_TOOLBAR_GROUPS.live` sudah memuat kunci itu. `MarkerLayerKey` yang sama adalah sisa tipe: `LAYER_COLORS` dan `LAYER_ICON_FILES` terpaksa punya entri marker, tetapi `LIVE_MARKER_LAYER_KEYS` / `MARKER_TOOLBAR_GROUPS` **tidak** menampilkan Tatonas, dan `expandMarkerLayerKeys` sudah membuang token yang bukan live/retired — jadi `?layers=tatonasStations` sudah tidak mengaktifkan marker. `mergeTatonasOverlays` tidak dipanggil dari `loadPublicMarkerCollection`.

**Perilaku URL (satu aturan).** Tambah string `"tatonasStations"` ke `REMOVED_MARKER_LAYER_KEYS` (bersama `helipad` / `starlink` / `citizenReports`). Token `?layers=tatonasStations` **dibuang**, tidak ditulis ulang ke `?overlays=`. Overlay hanya hidup dari `?overlays=tatonasStations` (parser overlay yang sudah ada).

**Berkas yang wajib disentuh FE-6** (pengecualian wilayah: `src/lib/types.ts` dan Record yang pecah karena serikat itu).

| Berkas | Perilaku |
| --- | --- |
| `src/lib/types.ts` | Hapus `tatonasStations` dari `MarkerLayerKey`. Biarkan di `OverlayLayerKey`. |
| `src/lib/layer-colors.ts` | Hapus kunci `tatonasStations` dari `LAYER_COLORS`. Warna overlay tetap dari `OVERLAY_CATALOG` (teal). |
| `src/lib/layer-icons.ts` | Hapus kunci dari `LAYER_ICON_FILES`. Biarkan `OVERLAY_LAYER_ICON_FILES.tatonasStations`. |
| `src/lib/map-layers-catalog.ts` | Tambah `"tatonasStations"` ke `REMOVED_MARKER_LAYER_KEYS`. Jangan menambah ke `MARKER_TOOLBAR_GROUPS` / `LIVE_MARKER_LAYER_KEYS` / `DEFAULT_LAYERS`. Entri katalog overlay tetap. |

**Jangan.**

- Menambah Tatonas ke toolbar Lokasi, cluster, atau default `?layers=`.
- Memanggil `mergeTatonasOverlays` / `loadTatonasMarkerFeatures` dari rute marker. Fungsi itu boleh dibiarkan mati; jangan dihidupkan kembali.
- Mengubah `src/lib/overlay-layers.ts` kecuali terpaksa oleh tipe (seharusnya tidak).
- Mengubah kartu beranda `/api/peringatan-dini/tatonas` atau cron overlay.
- Menebak atau memetakan `loggerKind` / `kd_hardware` / satuan (DATA-4 menunggu jawaban AN-3). Jangan menambah arti `jenis` di popup.
- Mengubah zona KRB atau angka korban.

`GeoFeatureSummary.layer` tetap boleh `OverlayLayerKey`, jadi popup overlay Tatonas tidak perlu masuk `MarkerLayerKey`.

Kunci i18n `map.tatonasStations` tetap (label Geospasial). Jangan menambah label Lokasi baru.

---

### Larangan (jangan dilanggar saat kode)

- Menebak `loggerKind` / arti `kd_hardware` / satuan sensor Tatonas
- Zona KRB I/II/III
- Angka korban
- Poligon administrasi baru atau bbox sebagai klaim batas resmi Aceh
- Baris sentinel di `overlay_live_features`
- Mengubah `spatialRel` InaRISK menjauh dari intersects
- Memindahkan Tatonas ke marker

## Bukti

Putaran 1 — niat ditulis dari STATUS AN-5, KOORD-G2 (kosong cron → 503 → FE-3 “sumber gagal”), `planOverlayLiveWrite` `clear`, `resolveOverlayLiveRead` kosong=503, komentar `OverlayLiveBody` yang sudah mengisyaratkan kosong sah, `inariskFaultQueryUrl` intersects, fixture megathrust/patahan di luar amplop, `MarkerLayerKey` vs `OverlayLayerKey`, `data-sources` Tatonas.

Putaran 2 — bacaan ulang niat: clip (bukan biarkan intersects); senter tabel (bukan sentinel); hapus dari `MarkerLayerKey` (bukan pindah ke Lokasi). Cabang “nanti GADM / nanti rewrite URL / nanti FE-3 chip baru” dihapus.

Putaran 3 — naskah lengkap tiga kontrak.

Putaran 4 — bacaan ulang sebagai implementer DATA-3 / BE-8 / FE-6: garis menyeberang dengan ujung di luar wajib tersisa; megathrust = `Polygon` wajib di helper; skrip gagal-nol tanpa menulis; ledger vs purge vs persist gagal dikunci tabel; `refreshOverlayLive` tidak boleh `ok: true` jika persist atau tulis senter gagal; FE-6 boleh menyentuh `types.ts`; URL layers dibuang tidak di-alias ke overlays. Cabang “abaikan baris liar” dihapus: kosong sah hanya jika senter 0 **dan** tabel fitur kosong.

## Bacaan ulang bukti versus kriteria

- [x] DATA-3: satu perilaku — clip geometri ke `ACEH_BBOX` yang ada; intersects tetap untuk kueri; helper murni disebut; skrip boleh/tidak boleh tertulis; bukan filter-saja; bukan poligon admin baru
- [x] BE-8: kosong sah = 200 tanpa stale/upstream; belum refresh / gagal = 503; satu senter `overlay_live_refresh`; bukan sentinel; aturan GET tanpa tebakan
- [x] FE-6: hapus dari `MarkerLayerKey`; tetap overlay; jangan pindah ke marker
- [x] Tidak menebak Tatonas logger, KRB, korban
- [x] Tidak ada cabang “nanti kita lihat”

## Keputusan

siap-kode
