# AN-4 — naskah sinyal overlay → calon kejadian

Agent: analis
Gelombang: 2
Status: selesai — naskah terpakai gelombang 2. Jangan ditulis ulang.

## Niat

- Tujuan: Mengunci keputusan operasional agar BE-6 bisa membuat calon kejadian dari overlay live tanpa menebak ambang, peran, skema, atau data resmi. Tiket ini tulisan. Tidak mengimplementasikan BE-6. Tidak mengubah `src/`.
- Berkas:
  - `docs/pengembangan/jurnal/AN-4.md` — niat + naskah
  - Baris AN-4 di `docs/pengembangan/STATUS.md` (hanya setelah bacaan ulang kedua lolos)
- Langkah:
  1. Tulis niat keputusan (enam butir brief), merujuk field yang sudah ada di SIK/overlay.
  2. Baca ulang niat sebagai orang yang tidak menulisnya; hapus cabang “nanti kita lihat” dan tebakan (magnitudo minimum, `loggerKind`, KRB, korban, SK darurat, evakuasi).
  3. Tulis naskah lengkap yang bisa dijalankan BE-6.
  4. Baca ulang seluruh naskah sebagai orang yang akan mengimplementasikan BE-6 besok.
  5. Status jurnal `siap-kode` hanya jika setiap keputusan punya perilaku tunggal.
- Cara membuktikan:
  - Enam butir `04-analis.md` AN-4 tertutup secara tertulis.
  - Calon bukan baris `kejadian_operasi` aktif sebelum diterima.
  - Peran memakai `canAccessModule("kejadian")`, `is_ops()`, `matchesKabScope`; tidak ada peran baru.
  - Ambang hanya yang sudah ada di overlay (Sipongi medium/high; Tatonas `AWAS`/`WASPADA`/`AMAN`); tidak ada magnitudo minimum baru.
  - Field salin merujuk `KejadianOperasiRow` dan properti overlay yang ada; overlay tidak punya korban.
- Risiko:
  - Menulis calon ke `kejadian_operasi` berstatus `aktif` — dilarang sampai operator menerima, dan setelah diterima pun tidak langsung `aktif`.
  - Memakai `logger_kind` / `kd_hardware` untuk jenis bencana — dilarang; DATA-4 masih menunggu jawaban AN-3.
  - Menyalin angka korban, SK darurat, himbauan evakuasi, atau zona KRB — dilarang.
  - Mengarang ambang magnitudo BMKG/MAGMA yang tidak ada di kebijakan situs.

## Bacaan ulang niat

Niat tulisan murni. Enam keputusan harus berupa aturan, bukan opsi. Calon hidup di tabel baru, bukan di `kejadian_operasi.status`. `draft` / `aktif` / `dinamis` hanya dipakai setelah diterima. Kabupaten dari overlay hanya jika field terpisah lolos `findKabupaten`; judul marker bukan kabupaten. Tatonas boleh menjadi calon dari `level` yang sudah ada di tipe overlay, tanpa memetakan jenis perangkat. MAGMA gunung bukan calon: itu titik lokasi, overlay tidak membawa status KRB. Sinyal hulu hilang tidak menghapus calon atau kejadian; tautan ditandai putus, dan hanya setelah fetch layer itu berhasil (bukan 503/stale).

## Perubahan

| Berkas | Isi |
| --- | --- |
| `docs/pengembangan/jurnal/AN-4.md` | Naskah keputusan untuk BE-6 (bagian di bawah) |
| `docs/pengembangan/STATUS.md` | Baris AN-4 → `siap-kode` setelah bacaan ulang kedua |

## Naskah (untuk BE-6)

Naskah ini adalah kontrak implementasi. Jangan menambah ambang, peran, jenis bencana, atau kolom `kejadian_operasi` di luar yang tertulis. Jangan scrape hulu kedua kali: baca `overlay_live_features` yang sudah diisi overlay.

### Istilah

- **Sinyal** = satu baris `overlay_live_features` (`source`, `external_id`, `layer_key`, `longitude`, `latitude`, `occurred_at`, `properties`, `updated_at`).
- **Calon** = baris tabel baru `overlay_calon_kejadian`. Bukan baris `kejadian_operasi`.
- **Kejadian** = baris `kejadian_operasi` yang hanya dibuat saat operator **menerima** calon.
- **Tautan** = pasangan (`source`, `external_id`) pada calon, menunjuk sinyal hulu.

`overlay_live_features.source` yang sah: `bmkg`, `magma`, `sipongi`, `tatonas`. Layer live yang relevan: `bmkgQuakes`, `magmaQuakes`, `magmaVolcanoes`, `sipongiHotspots`, `tatonasStations`. Layer lain (pelabuhan, perairan, sensor seismik fixture, patahan, raster InaRISK) **bukan** sumber calon.

---

### 1. Sumber yang boleh menjadi calon

| Sumber | Layer | Calon? | Alasan operasional |
| --- | --- | --- | --- |
| BMKG | `bmkgQuakes` | **Ya** | Titik gempa TEWS yang sudah lolos filter Aceh di overlay. Itu peristiwa, bukan pos tetap. |
| MAGMA | `magmaQuakes` | **Ya** | Titik gempa MAGMA yang sudah lolos filter Aceh. Peristiwa terpisah dari BMKG; jangan digabung otomatis. |
| MAGMA | `magmaVolcanoes` | **Tidak** | Titik lokasi gunung, bukan kejadian. Overlay memakai parser yang sama dengan gempa dan **tidak** membawa status KRB. Dilarang mengarang zona KRB I/II/III atau erupsi dari kehadiran marker. |
| Sipongi | `sipongiHotspots` | **Ya** | Hotspot karhutla Aceh yang sudah dipotong confidence medium/high di overlay. Itu sinyal kebakaran, bukan pos tetap. |
| Tatonas | `tatonasStations` | **Ya, bersyarat** | Pos hidrologi overlay. Boleh jadi calon hanya jika `properties.level` = `AWAS` atau `WASPADA`. `AMAN` bukan calon. Jangan memakai `logger_kind` / `kd_hardware` / `jenis` untuk memutuskan jenis bencana (DATA-4 menunggu jawaban AN-3). |

Kamera Tatonas sudah di luar overlay (`TATONAS_CAMERA_LOGGER`). Tidak ada calon dari kamera.

Dua sinyal sumber berbeda (misalnya BMKG dan MAGMA) boleh menjadi dua calon. Jangan menggabungkan lintas sumber.

---

### 2. Otomatis, manual, atau keduanya

**Keduanya.**

**Otomatis.** Job/cron (atau langkah setelah persist overlay) membaca `overlay_live_features` dan membuat calon `draf` jika lolos uji kelayakan di bawah. Tidak scrape BMKG/MAGMA/Sipongi/Tatonas lagi.

**Manual dari popup.** Operator yang lolos otorisasi butir 4 boleh mengirim `POST` calon dengan `source` + `external_id` (atau `id` baris `overlay_live_features`). Popup peta publik **tidak** menulis calon; tombol hanya untuk sesi staf yang sudah lolos `requireOpsApi`. Layer yang ditolak di butir 1 (`magmaVolcanoes` dan non-live) ditolak 400.

#### Uji kelayakan (otomatis dan manual)

Pakai baris `overlay_live_features`. Jangan menambah magnitudo minimum — situs tidak punya kebijakan itu.

1. `source` ∈ {`bmkg`, `magma`, `sipongi`, `tatonas`}.
2. `layer_key` ∈ {`bmkgQuakes`, `magmaQuakes`, `sipongiHotspots`, `tatonasStations`}.
3. `longitude` dan `latitude` hingga (sudah NOT NULL di tabel overlay).
4. Khusus Tatonas: `properties.level` harus string `AWAS` atau `WASPADA`. Nilai lain (termasuk `AMAN`, kosong, atau `stale === true` tanpa level waspada) → bukan calon. `properties.stale === true` **tetap boleh** jika level `AWAS`/`WASPADA` (pos kedaluwarsa masih sinyal; operator yang menolak).
5. Sipongi: **jangan** memfilter ulang confidence. Overlay sudah membuang selain `medium`/`high` (`confidence[]` + cek `confidence_level` di `overlay-live.ts`). Semua baris `sipongiHotspots` di tabel overlay layak.
6. BMKG dan MAGMA gempa: **jangan** memotong magnitudo. Overlay sudah memotong ke Aceh (`isAcehRelevant`). Semua baris `bmkgQuakes` / `magmaQuakes` di tabel overlay layak.

#### Dedup

- Paling banyak **satu** calon berstatus `draf` per (`source`, `external_id`).
- Indeks unik parsial: `UNIQUE (source, external_id) WHERE status = 'draf'`.
- Sinyal masuk lagi dan sudah ada `draf` → perbarui cuplikan (nama, waktu, koordinat, `properties_snapshot`, `tautan_status = 'utuh'`). Jangan membuat baris kedua.
- Sudah ada `diterima` untuk pasangan yang sama → otomatis **diam**. Manual → 409, body memuat `kejadian_id` yang sudah tertaut.
- Sudah ada `ditolak` (ambil `decided_at` **terbaru** untuk pasangan itu) dan sinyal masih layak serta `overlay_live_features.updated_at` **lebih baru** dari `decided_at` itu → boleh `draf` baru. Jika tidak lebih baru → diam.

---

### 3. Status awal calon — tabel baru

**Jangan** mengisi `kejadian_operasi` sebelum diterima.

Alasan: `kejadian_operasi.status` hanya `draft` | `aktif` | `selesai` | `diarsipkan`. `fase_data` hanya `dinamis` | `diajukan` | `statis`. Peta publik (`loadKejadianOperasiPublik`) menampilkan `aktif` dan `selesai`. RLS publik kejadian: `status in ('aktif', 'selesai') or is_staff()`. Jika calon masuk `kejadian_operasi` sebagai `draft`, staf melihatnya tercampur wizard, nomor `ACEH-OPS-…` terpakai, dan KIB bisa teralokasi sebelum ada keputusan.

**Tabel baru** `overlay_calon_kejadian` (nama ini; jangan memakai status `usulan` atau `perlu tinjauan` — keduanya tidak ada di SIK).

Status calon (kolom `status` tabel baru, **bukan** `kejadian_operasi.status`):

| Nilai | Arti |
| --- | --- |
| `draf` | Status awal (otomatis atau manual). Menunggu terima/tolak. |
| `ditolak` | Operator menolak. Tidak ada baris `kejadian_operasi`. |
| `diterima` | Operator menerima. `kejadian_id` wajib terisi. |

Status awal: **`draf`**.

Setelah diterima, baris `kejadian_operasi` yang baru:

- `status` = `draft` (enum yang sudah ada; **bukan** `aktif`)
- `fase_data` = `dinamis`
- `is_bencana` = `false` (set eksplisit; default SQL tabel adalah `true`)
- `status_darurat` = `false`
- `nomor_sk` = `null`
- `himbauan` = `null`
- `permintaan_bantuan_nasional` = `false`
- `kode_provinsi` = `'11'`
- `kib_sumber` = `episentrum` jika `layer_key` ∈ {`bmkgQuakes`, `magmaQuakes`}; selain itu `lokasi`
- `nomor` = default `next_kejadian_nomor()`
- `created_by` = `userId` operator yang menerima
- KIB: panggil `allocateKib` seperti `POST /api/sik/kejadian`; jika `kode_kabupaten` atau `kode_jenis` kosong, KIB tetap `null`

Operator mengaktifkan kejadian lewat alur SIK yang sudah ada (ubah `status` ke `aktif`). Jalur overlay **tidak** men-set `aktif`.

Tidak membuat baris `kejadian_dampak`. Tidak mengisi angka korban.

---

### 4. Siapa yang boleh menerima / menolak / membuat calon manual

Tidak ada peran baru. Pakai fungsi yang sudah ada.

**Gerbang API** (sama dengan kejadian): `requireOpsApi()` = `requireModuleApi("kejadian")` = staf + `canAccessModule(profile, "kejadian")`.

Peran yang lolos modul `kejadian` (`roles.ts`): `super_admin`, `admin_provinsi`, `admin_kabkota`. Peran `admin` dinormalisasi menjadi `admin_provinsi`. SQL `is_ops()` memakai himpunan yang sama (`super_admin`, `admin`, `admin_provinsi`, `admin_kabkota`).

**Ditolak modul** (jangan diperlebar): `admin_desa`, `penilai_pkd`, `admin_rr`. Mereka tidak menerima, menolak, atau membuat calon.

`canLockStatis` **tidak** dipakai di jalur ini. Itu kunci fase `statis` Juklak, bukan tinjauan sinyal.

**Wilayah.** `matchesKabScope` memakai `kode_kabupaten` atau `kabupaten`. Overlay hari ini jarang punya field kabupaten terpisah (Sipongi merangkai nama di `title`, bukan `properties.kabkota`). Jadi banyak calon lahir tanpa wilayah. Aturan tunggal:

**GET daftar — `admin_kabkota` melihat:**

1. calon yang `matchesKabScope` = benar, **atau**
2. calon yang `kode_kabupaten` dan `kabupaten` **keduanya kosong** (belum terikat).

Mereka **tidak** melihat calon yang sudah terikat kabupaten lain.

**GET daftar — `super_admin` / `admin_provinsi`:** semua calon.

**Terima:**

- Calon sudah terikat kabupaten: `matchesKabScope` wajib. Gagal → 403. Body boleh menimpa kabupaten hanya jika `findKabupaten` + `matchesKabScope` tetap lolos.
- Calon belum terikat + `admin_kabkota`: body **wajib** `kode_kabupaten` atau `kabupaten`. `findKabupaten` harus mengenai katalog `ACEH_KABUPATEN`, lalu hasilnya harus `matchesKabScope`. Body kosong → 400. Hasil bukan scope mereka → 403. Setelah terima, kejadian dan calon menyimpan nama+kode katalog itu.
- Calon belum terikat + ops provinsi / `super_admin`: boleh menerima tanpa kabupaten (gempa laut). Jika body mengisi kabupaten, wajib `findKabupaten`; gagal → 400.

**Tolak:** gerbang `requireOpsApi`. `admin_kabkota` boleh menolak calon yang mereka boleh **lihat** (terikat scope mereka, atau belum terikat). Tidak wajib mengisi kabupaten. Calon terikat kabupaten lain → 403.

**Otomatis** memakai service client (seperti `persistLive`). `created_by` calon = `null`, `asal_buat` = `otomatis`.

**Manual** memakai `requireOpsApi`. `created_by` = `userId` pemohon, `asal_buat` = `manual`. Publik / anon = 401. `admin_kabkota` boleh membuat calon manual dari sinyal mana pun yang lolos kelayakan; wilayah tetap kosong sampai terima (aturan terima di atas).

---

### 5. Apa yang disalin ke `kejadian_operasi`, apa yang hanya tautan

#### 5.1 Tetap di calon (tautan + cuplikan)

Jangan menambah kolom `external_id` pada `kejadian_operasi`.

Pada `overlay_calon_kejadian` simpan:

- `source`, `layer_key`, `external_id` — sama dengan `overlay_live_features` (`unique (source, external_id)` di overlay)
- `overlay_feature_id` = `overlay_live_features.id`
- `tautan_status` = `utuh` | `putus`
- `kejadian_id` (null sampai diterima)
- `properties_snapshot` = salinan `properties` overlay pada saat buat/perbarui draf
- `nama_sinyal`, `waktu_sinyal`, koordinat, usulan jenis, `sumber_label`, `penyebab_ringkas`

Magnitudo, kedalaman, `potensi`, `confidence`/`status` hotspot, `level` Tatonas, `value`/`satuan` sensor, `href` — **hanya** di cuplikan / `penyebab_ringkas`. Bukan kolom korban, bukan `kejadian_dampak`.

#### 5.2 Usulan jenis (isi calon; disalin saat terima jika operator tidak menimpa)

Pakai katalog Juklak `JENIS_BENCANA_JUKLAK`. Jangan mengarang nama kejadian di luar katalog kecuali memakai `title` overlay sebagai `nama_kejadian`.

| `layer_key` | `usulan_kode_jenis` | `usulan_jenis_bencana` | `nama_kejadian` saat terima (jika body kosong) |
| --- | --- | --- | --- |
| `bmkgQuakes` | `107` | `Gempa bumi` | `properties.title` jika panjang ≥ 2; else `Gempa tektonik` |
| `magmaQuakes` | `107` | `Gempa bumi` | sama; **jangan** memilih `Gempa vulkanik` hanya karena ada `nearest_volcano` |
| `sipongiHotspots` | `106` | `Kebakaran hutan dan lahan` | `properties.title` jika panjang ≥ 2; else `Kebakaran hutan dan lahan`. Jangan memilih hutan/lahan/gambut otomatis. |
| `tatonasStations` | `null` | `null` | `properties.title` jika panjang ≥ 2; else `Pos hidrologi`. **`kode_jenis` wajib di body terima**, harus ada di katalog Juklak. |

`slug_nama`: isi hanya jika operator (atau usulan) memakai slug katalog yang sudah ada (`gempa-tektonik`, `kebakaran-hutan`, dst.). Jika nama diambil dari `title` overlay, `slug_nama` = `null`.

#### 5.3 Waktu

Urutan untuk `waktu_sinyal` calon dan default `waktu_kejadian`:

1. `overlay_live_features.occurred_at` jika ISO sah
2. `properties.waktu` jika `Date.parse` berhasil (BMKG; fungsi `asIso` di `overlay-live.ts`)
3. `properties.tanggal` jika `Date.parse` berhasil (Sipongi)
4. `properties.time_local` jika `Date.parse` berhasil (Tatonas; jika format `YYYY-MM-DD HH:MM:SS` tanpa zona, perlakukan sebagai WIB `+07:00` — ini sudah ada di `parseTatonasLocalTime`, boleh dipakai ulang; jangan mengarang parser `loggerKind`)

Jika keempatnya gagal: calon `draf` tetap sah, `waktu_sinyal` = `null`. **Terima ditolak 400** sampai body memuat `waktu_kejadian` yang lolos `kejadianWizardSchema` (string min 8). Jangan mengisi `now()` sebagai waktu kejadian.

`tarikh` = `resolveTarikh(waktu_kejadian)` seperti rute kejadian.

#### 5.4 Kabupaten

**Jangan** mengurai `title` / `Wilayah` menjadi kabupaten (risiko Pidie vs Pidie Jaya).

Hanya jika `properties.kabkota` atau `properties.kabupaten` ada dan bertipe string, panggil `findKabupaten`. Jika ketemu: isi `kabupaten` = nama katalog, `kode_kabupaten` = kode katalog. Jika tidak ketemu atau field tidak ada: keduanya `null` pada calon.

Saat ini persist Sipongi **tidak** menyimpan `kabkota` terpisah (hanya dirangkai di `title`). Calon Sipongi hari ini hampir selalu tanpa kabupaten. Itu bukan blocker: operator mengisi kabupaten **saat terima** (butir 4). Jika suatu saat overlay menyimpan `properties.kabkota` string, aturan `findKabupaten` di atas berlaku tanpa tiket naskah baru.

`kecamatan` / `desa_ringkas` pada kejadian: salin `properties.kecamatan` jika string; salin `properties.desa` ke `desa_ringkas` jika string. Masing-masing independen. Jangan memotong `title`.

#### 5.5 Field `kejadian_operasi` yang diisi saat terima

Salin / set hanya ini (plus default butir 3):

| Field | Isi |
| --- | --- |
| `jenis_bencana` | Body operator, else `usulan_jenis_bencana`. Tatonas: wajib dari body + `findJenisByKode`. Min 2 karakter. |
| `kode_jenis` | Selaras `jenis_bencana`. |
| `nama_kejadian` | Body, else aturan tabel 5.2. Max 200. |
| `waktu_kejadian` | Body, else `waktu_sinyal`. Wajib ada. |
| `kabupaten`, `kode_kabupaten` | Body lalu `findKabupaten`, else cuplikan calon. Boleh null untuk ops provinsi. |
| `kecamatan`, `desa_ringkas` | Hanya dari `properties` string, else null. |
| `latitude`, `longitude` | Dari calon (asal overlay). Wajib. |
| `sumber_informasi` | Label tetap: BMKG → `BMKG TEWS`; MAGMA gempa → `MAGMA PVMBG`; Sipongi → `Sipongi`; Tatonas → `Tatonas`. Jika `properties.href` string, boleh dilanjutkan ` + href` (satu string). |
| `penyebab` | `penyebab_ringkas` calon (di bawah). Bukan angka korban. |

`penyebab_ringkas` (teks, boleh null jika semua potongan kosong):

- BMKG: gabung yang ada dari `properties`: `magnitude`, `kedalaman`, `potensi` (teks `potensi` **bukan** perintah tsunami/SK).
- MAGMA gempa: `magnitude`, `depth`, `nearest_volcano` sebagai teks lokasi terdekat, bukan status gunung.
- Sipongi: `status` (medium/high) + `tanggal` + `sumber` jika string.
- Tatonas: `Level ` + `properties.level` + ` ` + `properties.title`. Jangan menulis arti `wl`/`rf`/`gpa`.

**Jangan disalin / jangan diisi dari overlay:**

- Semua field korban dan kerusakan (`kejadian_dampak`, `meninggal`, dll.) — overlay tidak punya korban
- `status_darurat`, `nomor_sk`, `himbauan`, `permintaan_bantuan_nasional`
- `is_bencana` = true
- `logger_kind`, `kd_hardware`, zona KRB
- `merusak` MAGMA (tidak ada di `properties` overlay; jangan diambil dari HTML)

Tidak membuat `kejadian_lokasi` kecuali suatu saat `properties` punya `desa`/`kecamatan` string — boleh satu baris lokasi dengan koordinat yang sama, tanpa `foto_url`. Jika field itu tidak ada, **jangan** membuat lokasi.

---

### 6. Jika sinyal hulu hilang

Satu perilaku, bukan cabang:

1. **Calon `draf` tetap.** Jangan dihapus. Jangan ditolak otomatis. `tautan_status` = `putus`.
2. **Calon `ditolak` / `diterima` tetap.** `tautan_status` = `putus` jika sebelumnya `utuh`.
3. **Kejadian yang sudah diterima tetap.** Jangan ubah `status`, `fase_data`, atau hapus `kejadian_operasi`. Jangan turunkan ke arsip.
4. **Tautan ditandai putus** — ini satu-satunya reaksi otomatis.

**Kapan “hilang”:** setelah **fetch layer itu berhasil** (hasil live 200 tanpa `error: "upstream"`), himpunan `external_id` baru untuk `layer_key` itu tidak memuat `external_id` calon. Termasuk baris overlay yang dihapus `purge_expired_overlay_rows()` setelah `expires_at` terisi.

**Bukan hilang:** GET overlay 503; body `stale: true` + `error: "upstream"`; cache stale dipakai. Jangan menandai `putus` hanya karena refresh gagal.

**Sinyal kembali** (pasangan `source`+`external_id` muncul lagi setelah fetch sukses): `tautan_status` = `utuh` pada calon yang masih ada. Jangan membuat `draf` kedua jika sudah ada `draf`. Jangan mengubah `ditolak`/`diterima` hanya karena tautan pulih (aturan dedup butir 2 tetap berlaku untuk `ditolak` + `updated_at` lebih baru).

Tatonas yang turun ke `AMAN` **bukan** hilang: baris overlay masih ada. Calon `draf` tetap `draf`, tautan `utuh`. Jangan ditolak otomatis. Sinyal `AMAN` tidak membuat calon baru.

---

### Skema tabel untuk BE-6

Migrasi **baru**. Jangan menyunting migrasi lama.

```
overlay_calon_kejadian
  id uuid pk default gen_random_uuid()
  source text not null check (source in ('bmkg','magma','sipongi','tatonas'))
  layer_key text not null
  external_id text not null
  overlay_feature_id text
  status text not null default 'draf' check (status in ('draf','ditolak','diterima'))
  tautan_status text not null default 'utuh' check (tautan_status in ('utuh','putus'))
  kejadian_id uuid null references kejadian_operasi(id) on delete set null
  nama_sinyal text not null
  waktu_sinyal timestamptz null
  kabupaten text null
  kode_kabupaten text null
  latitude double precision not null
  longitude double precision not null
  usulan_kode_jenis int null
  usulan_jenis_bencana text null
  sumber_label text not null
  penyebab_ringkas text null
  properties_snapshot jsonb not null default '{}'::jsonb
  asal_buat text not null check (asal_buat in ('otomatis','manual'))
  created_by uuid null
  decided_by uuid null
  decided_at timestamptz null
  ditolak_alasan text null
  created_at timestamptz not null default now()
  updated_at timestamptz not null default now()
```

- `UNIQUE (source, external_id) WHERE status = 'draf'`
- Indeks `(status, created_at desc)`, `(kode_kabupaten)`, `(layer_key)`
- RLS: `ENABLE`. `SELECT`/`INSERT`/`UPDATE` untuk `authenticated` hanya jika `is_ops()`. Jangan `SELECT` ke `anon`. Jangan memperlebar `is_ops()`. Job otomatis memakai service role.
- `kejadian_id` hanya terisi jika `status = 'diterima'`.

---

### Kontrak API (cukup untuk BE-6; UI popup belakangan)

Semua menulis: `rejectCrossOrigin` seperti rute kejadian.

| Metode | Jalur | Auth | Perilaku |
| --- | --- | --- | --- |
| GET | `/api/sik/calon-kejadian` | `requireOpsApi` | Daftar; default `status=draf`; filter wilayah butir 4 (kab: scope **atau** belum terikat) |
| POST | `/api/sik/calon-kejadian` | `requireOpsApi` | Manual: body `{ source, external_id }` atau `{ overlay_id }` (`overlay_live_features.id`). Uji kelayakan. 201 atau 200 jika `draf` sudah ada. |
| POST | `/api/sik/calon-kejadian/[id]/terima` | `requireOpsApi` + wilayah butir 4 | Body opsional: `kabupaten`, `kode_kabupaten`, `waktu_kejadian`, `kode_jenis`, `nama_kejadian`. Hanya dari `draf`. Insert `kejadian_operasi` sesuai butir 3 dan 5. Set calon `diterima`, `kejadian_id`, `decided_by`, `decided_at`. |
| POST | `/api/sik/calon-kejadian/[id]/tolak` | `requireOpsApi` + wilayah butir 4 | Hanya dari `draf`. Set `ditolak`, `decided_by`, `decided_at`, `ditolak_alasan` opsional. Tidak membuat kejadian. |
| internal | fungsi murni + service | service | `syncCalonDariOverlay(layer_key)`: baca `overlay_live_features` untuk layer itu; buat/perbarui `draf`; tandai `putus` menurut butir 6 |

Terima dua kali → 409. Tolak yang bukan `draf` → 409.

**Kapan job otomatis dipanggil (satu aturan):** setelah upsert/persist `overlay_live_features` untuk `layer_key` yang diizinkan **berhasil**. Hari ini: panggil dari jalur yang sama dengan `persistLive` (bukan dari GET publik klien). Setelah BE-4: panggil dari cron yang menulis tabel, setelah tulis sukses. Jangan scrape hulu. Jangan panggil sync jika fetch layer gagal (503 / `error: "upstream"`) — itu juga mencegah `putus` palsu.

UI tombol popup **bukan** tiket ini dan bukan FE-3 (FE-3 = stale/gagal overlay). BE-6 wajib menyediakan `POST` manual.

---

### Larangan (jangan dilanggar saat kode)

- Menebak `loggerKind` / arti `kd_hardware` / satuan sensor Tatonas
- Zona KRB I/II/III atau erupsi dari `magmaVolcanoes`
- Magnitudo minimum yang tidak ada di kebijakan situs
- Angka korban dari overlay
- SK darurat, `status_darurat`, perintah evakuasi / `himbauan` otomatis
- Menjadikan raster InaRISK, patahan, pelabuhan, atau sensor seismik fixture sebagai calon
- Menggabungkan BMKG+MAGMA sebagai satu peristiwa
- Memakai `now()` sebagai `waktu_kejadian` jika sinyal tidak punya waktu

## Bukti

Putaran 1 — niat ditulis dari brief + field nyata (`KejadianOperasiRow`, `roles.ts`, `overlay-live.ts`, `overlay-layers.ts`, `tatonas/types.ts`, `jenis-bencana.ts`, rute `POST /api/sik/kejadian`).  
Putaran 2 — bacaan ulang niat: cabang “nanti” dihapus; MAGMA gunung ditolak; calon = tabel baru.  
Putaran 3 — naskah lengkap.  
Putaran 4 — bacaan ulang sebagai implementer BE-6: kontradiksi `admin_kabkota` vs calon tanpa kabupaten ditutup (GET: scope atau belum terikat; terima: kab wajib isi kabupaten scope sendiri). Waktu job otomatis dikunci: setelah persist layer sukses, bukan saat GET gagal. `kecamatan`/`desa` independen. Tidak ada cabang “nanti overlay menambah field”.

## Bacaan ulang bukti versus kriteria

- [x] Sinyal BMKG / MAGMA / Sipongi / Tatonas diputus ya/tidak + alasan operasional; MAGMA dipecah per layer
- [x] Otomatis + manual; ambang hanya yang sudah di overlay (Sipongi medium/high sudah terfilter; Tatonas AWAS/WASPADA/AMAN); tidak ada magnitudo minimum baru
- [x] Status awal `draf` di tabel baru; `kejadian_operasi` hanya setelah terima, dan itu pun `draft`+`dinamis`, bukan `aktif`
- [x] Terima/tolak = `requireOpsApi` / `canAccessModule("kejadian")` / `is_ops` / `matchesKabScope`; tanpa peran baru; `canLockStatis` tidak dipakai
- [x] Salinan field nyata; korban tidak disalin; `external_id` hanya di calon
- [x] Hulu hilang: calon tetap, kejadian tetap, tautan `putus`; definisi hilang vs stale tertulis
- [x] Tidak menebak Tatonas logger, KRB, korban, SK, evakuasi

## Keputusan

siap-kode
