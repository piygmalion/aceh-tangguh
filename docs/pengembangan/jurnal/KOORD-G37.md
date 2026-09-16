# KOORD-G37 — rencana GIBS NRT + FIRMS (konteks visual)

Agent: ecc
Gelombang: 37
Status: selesai

Tulisan koordinator. Bukan kode `src/` dari tiket ini. Kontrak perilaku: [AN-57.md](AN-57.md). Jangan DATA-4. Jangan POST nasional. Jangan membuka P2 Juklak. Jangan C1 / BE-37. Jangan merge `/api/weather`. Jangan menulis nilai `FIRMS_MAP_KEY`.

## Niat

- Tujuan: Membuka gelombang **konteks satelit NRT** (GIBS citra + titik FIRMS) untuk verifikasi visual Sipongi, terpisah dari umpan resmi dan calon kejadian.
- Berkas: jurnal ini; AN-57; kerangka BE-40 / FE-60 / AN-58; baris G37 di `STATUS.md`, `00-protokol.md`, brief `02`–`04`. Tiket ini tidak menyunting `src/`.
- Langkah: kunci search-first; ID tiket; naskah analis; urutan BE lalu FE lalu uji.
- Cara membuktikan: keputusan merujuk GIBS WMTS EPSG:3857, FIRMS Area API, dan isolasi WeatherNext G19.
- Risiko: mencampur FIRMS ke `overlay_live_features` / calon; proxy ubin GIBS di Next; menambah `OverlayLayerKey`; mengklaim citra berawan sebagai “tidak ada kebakaran”.

## Bacaan ulang niat

G37 bukan peringatan BPBA. Sipongi/BMKG/MAGMA tetap mesin resmi. GIBS = raster browser langsung. FIRMS = GET server + `ACEH_BBOX` sebagai AOI satelit, bukan batas kab. Tidak ada migrasi DATA.

ID: AN-57 / BE-40 / FE-60 / AN-58. FE-57 di `main` sudah Tanggapi analisis data (#106); tiket peta G37 memakai FE-60.

## Search-first (pra-arsitektur)

| Saluran | Hasil |
| --- | --- |
| Repo | Raster EOX di `basemap.ts`; InaRISK proxy hanya BNPB; overlay live lima kunci; calon BMKG/MAGMA/Sipongi/Tatonas; isolasi `weather-inovasi`. |
| NASA GIBS | WMTS REST `epsg3857/best`, dimensi `TIME` YYYY-MM-DD. Akar nasa-gibs.github.io 404; docs di `gibs-api-docs/access-basics`. |
| npm | Tolak `maplibre-gl-nasa-earthdata`. |
| MCP web | Context.dev kuota habis; Bright Data 401. WebSearch/WebFetch resmi NASA. |

| Kandidat | Keputusan |
| --- | --- |
| WMTS EPSG:3857 `{z}/{y}/{x}` | **Adopt** |
| Endpoint `best` | **Adopt** default |
| Paket GIBS MapLibre | **Reject** |
| Proxy ubin GIBS Next | **Reject** |
| FIRMS → overlay_live / calon | **Reject** |
| FIRMS Area API + `FIRMS_MAP_KEY` server | **Extend** modul `nasa-nrt` |
| Tabel Postgres / Upstash store | **Reject** |
| Tambah `OverlayLayerKey` | **Reject**; `?nasa=` terpisah |

## Tiket (urutan)

1. AN-57 naskah (kontrak).
2. BE-40 `src/lib/nasa-nrt/` + GET FIRMS + GET waktu GIBS — setelah AN-57 `siap-kode`.
3. FE-60 peta + i18n — setelah BE-40.
4. AN-58 uji isolasi + penerimaan.

Jangan kode DATA/BE/FE sebelum AN-57 dibaca ulang. Jangan DATA-4. Jangan G32. Jangan C1.

## Perubahan

| Berkas | Isi |
| --- | --- |
| jurnal ini | keputusan + urutan |
| AN-57 | kontrak |
| BE-40 / FE-60 / AN-58 | kerangka niat |
| STATUS / 00-protokol / brief 02–04 | Gelombang 37 |

## Bukti

Riset: GIBS access-basics; pola EOX/InaRISK; `CALON_SOURCES`; WeatherNext isolasi. ID baru agar tidak menimpa AN-55/56, BE-39, FE-55/56. Tidak commit.

## Bacaan ulang bukti versus kriteria

- [x] Search-first tercatat; paket GIBS ditolak
- [x] OverlayLayerKey tidak diperluas
- [x] Naskah AN-57 sebelum kode
- [x] DATA-4 / Juklak / overlay live / Tatonas / C1 tidak dibuka

## Keputusan

selesai
