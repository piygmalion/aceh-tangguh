# AN-6 — naskah UI calon kejadian

Agent: analis
Gelombang: 4
Status: selesai — naskah terpakai gelombang 4. Jangan ditulis ulang.

## Niat

- Tujuan: Mengunci permukaan konsol staf untuk daftar + terima/tolak calon kejadian, agar FE-8 bisa dikode tanpa menebak rute, peran, kolom, field wajib, atau popup peta. Tiket ini tulisan. Tidak mengimplementasikan FE-8. Tidak mengubah `src/`. Tidak menyunting AN-4 (kontrak otorisasi + field tetap).
- Berkas:
  - `docs/pengembangan/jurnal/AN-6.md` — niat + naskah
  - Baris AN-6 di `docs/pengembangan/STATUS.md` (hanya setelah bacaan ulang kedua lolos)
- Langkah:
  1. Tulis niat sembilan butir brief (rute, guard, daftar/filter, kolom, form terima, form tolak, popup, i18n, celah API).
  2. Baca ulang niat sebagai orang yang tidak menulisnya; hapus opsi, tebakan `loggerKind` / KRB / korban, dan “nanti kita lihat”.
  3. Tulis naskah lengkap yang bisa dijalankan FE-8.
  4. Baca ulang seluruh naskah sebagai orang yang akan mengerjakan FE-8 besok.
  5. Status jurnal `siap-kode` hanya jika setiap keputusan punya satu perilaku.
- Cara membuktikan:
  - Sembilan butir `04-analis.md` AN-6 tertutup secara tertulis, satu perilaku per butir.
  - Rute konsol di bawah kejadian yang sudah ada; bukan item sidebar baru di `AdminShell`.
  - Guard = `requireStaffPage` + `canAccessModule(profile, "kejadian")` (AN-4).
  - Daftar memakai GET BE-6 yang sudah ada; kolom hanya field `OverlayCalonKejadianRow` yang disebut.
  - Form terima/tolak body sesuai AN-4; setelah terima arah ke detail kejadian; popup peta tertulis **bukan FE-8**.
  - Namespace i18n baru `sikCalon` (hanya menambah kunci).
  - BE-9 hanya jika API tidak cukup untuk UI itu; jika cukup, jangan membuat tiket backend.
- Risiko:
  - Menambah modul sidebar atau peran baru — dilarang.
  - Tombol popup peta publik menulis calon — dilarang; bukan FE-8.
  - Menampilkan `properties_snapshot` mentah atau angka korban — dilarang.
  - Mengisi `waktu_kejadian` dengan `now()` atau menebak `kode_jenis` dari `loggerKind` — dilarang.
  - Menjadikan kejadian `aktif` dari jalur ini — dilarang (AN-4: terima menghasilkan `draft` + `dinamis`).
  - Menimpa kunci i18n lama atau mengubah AN-4 — dilarang.

## Bacaan ulang niat

Niat tulisan murni. Sembilan keputusan harus berupa aturan, bukan opsi. Rute = anak kejadian yang sudah ada (`/admin/sik/kejadian/calon`), bukan item `AdminShell` baru. Guard = halaman kejadian. Daftar = GET BE-6 `?status=` (default `draf`), tiga tab, tanpa pagination. Kolom = tujuh field baris yang sudah ada; cuplikan mentah dan korban tidak tampil. Form terima hanya `draf`, field wajib mengikuti AN-4 (kabupaten untuk `admin_kabkota` belum terikat; waktu jika `waktu_sinyal` null; jenis jika `usulan_kode_jenis` null). Tolak: alasan opsional, tetap di daftar. Tombol popup peta **bukan FE-8**. i18n = namespace baru `sikCalon`. API BE-6 sudah cukup — jangan membuat BE-9.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `docs/pengembangan/jurnal/AN-6.md` | Naskah permukaan untuk FE-8 (bagian di bawah) |
| `docs/pengembangan/STATUS.md` | Baris AN-6 → `siap-kode` setelah bacaan ulang kedua |

## Naskah (untuk FE-8)

Naskah ini adalah kontrak permukaan. Jangan merancang otorisasi, status, atau field baru. AN-4 tetap kontrak terima/tolak. Jangan mengubah `src/` dari tiket analis ini. Jangan menebak `loggerKind` / `kd_hardware`, zona KRB, atau angka korban. Jangan membuat kejadian `aktif`. Jangan menambah peran.

---

### 1. Rute daftar — anak kejadian, bukan modul sidebar

**Keputusan.** Satu halaman konsol: `/admin/sik/kejadian/calon`.

Bukan modul sidebar baru. `AdminShell` tetap menautkan satu item `kejadian` ke `/admin/sik/kejadian`. `isActive` yang sudah ada (`pathname.startsWith("/admin/sik/kejadian/")`) akan menandai item itu aktif di halaman calon — itu cukup; jangan menambah `href` calon di array `items`.

**Berkas FE-8 (wilayah frontend + pengecualian routing):**

| Berkas | Perilaku |
| --- | --- |
| `src/i18n/routing.ts` | Tambah pathname `"/admin/sik/kejadian/calon": "/admin/sik/kejadian/calon"`. **Pengecualian FE-8** — typed `Link` membutuhkan ini. |
| `src/app/[locale]/admin/(console)/sik/kejadian/calon/page.tsx` | Halaman server baru. Guard butir 2. Render `<CalonKejadianList isKabScoped={isKabScoped(profile)} />`. |
| `src/components/sik/CalonKejadianList.tsx` | Komponen klien baru (nama ini). Fetch + tab + form. Operan hanya `isKabScoped: boolean`. |
| `src/components/sik/KejadianOpsList.tsx` | Di header, di samping "Buat", tambah `<Link href="/admin/sik/kejadian/calon"><Button size="sm" variant="outline">{tCalon("navFromList")}</Button></Link>`. |
| `src/app/[locale]/admin/(console)/page.tsx` | Jika `canAccessModule(profile, "kejadian")`, perluas spread menjadi dua kartu: kejadian yang sudah ada, lalu `{ href: "/admin/sik/kejadian/calon", title: tCalon("overviewTitle"), body: tCalon("overviewBody") }`. |
| `messages/id.json`, `messages/en.json` | Namespace akar baru `sikCalon` (butir 8). |

Jangan menambah rute `/admin/sik/calon`, `/admin/calon`, atau `/admin/sik/kejadian/calon/[id]`. Terima/tolak hidup di panel pada daftar, bukan halaman terpisah.

**Tautan masuk (hanya ini):**

1. Header `KejadianOpsList`: tautan di samping tombol "Buat".
2. Overview admin: kartu tambahan, hanya jika modul `kejadian`.

Jangan menambah tautan di peta publik, `MapToolbar`, atau popup overlay.

---

### 2. Guard halaman = kejadian

**Keputusan.** Sama persis dengan `src/app/[locale]/admin/(console)/sik/kejadian/page.tsx`:

```
const { profile } = await requireStaffPage();
if (!canAccessModule(profile, "kejadian")) return <SikForbidden />;
```

Peran yang lolos (`roles.ts` + AN-4): `super_admin`, `admin_provinsi`, `admin_kabkota`. Peran `admin` dinormalisasi menjadi `admin_provinsi`.

**Ditolak modul (jangan diperlebar):** `admin_desa`, `penilai_pkd`, `admin_rr` → `SikForbidden`. Mereka tidak melihat tautan berguna di overview (kartu tidak ditambah) dan tidak lolos halaman jika URL diketik.

API sudah memakai `requireOpsApi` = gerbang yang sama. UI tidak mengulang filter wilayah: GET sudah memotong lewat `calonVisibleToOps` (scope kab **atau** belum terikat). Jangan memfilter ulang di klien.

Operan ke komponen klien: hanya `isKabScoped={isKabScoped(profile)}` (`src/lib/sik/roles.ts`). Jangan mengirim objek `profile`. Select kabupaten menampilkan seluruh `ACEH_KABUPATEN` (sama wizard); jika `admin_kabkota` memilih di luar scope, API 403 — tampilkan `error` API.

---

### 3. Daftar dan filter

**Keputusan.** Satu permintaan: `GET /api/sik/calon-kejadian?status={tab}` dengan `cache: "no-store"` (pola `KejadianOpsList`).

| Aturan | Perilaku |
| --- | --- |
| Default | Tab `draf`. Fetch `?status=draf`. |
| Tab | Tiga tab saja: `draf` / `ditolak` / `diterima`. Nilai query = nilai `OverlayCalonStatus`. |
| Ganti tab | Set status, fetch ulang. Jangan menyimpan status di URL halaman. |
| Badan sukses | `{ items: OverlayCalonKejadianRow[] }`. Tampilkan `items` apa adanya. |
| Pagination | **Tidak ada.** Jangan menambah `page` / `pageSize`. Jangan memotong array. |
| Urutan | Sudah `created_at` desc di API. Jangan mengurutkan ulang. |
| Kosong | Satu baris/pesan `sikCalon.empty`. Bukan tabel palsu. |
| Gagal | `!res.ok` → `sikCalon.loadError`. Jangan mengosongkan seolah sukses. |
| Muat | `sikCalon.loading` selama fetch. |

Jangan memanggil `POST /api/sik/calon-kejadian` dari halaman ini. Membuat calon manual dari popup **bukan FE-8**.

---

### 4. Kolom daftar

**Keputusan.** Tujuh kolom data + satu kolom aksi. Kunci hanya dari `OverlayCalonKejadianRow`.

| Kolom | Field | Tampil |
| --- | --- | --- |
| Nama sinyal | `nama_sinyal` | Teks. Jika tab `diterima` **dan** `kejadian_id` terisi: tautan ke `/admin/sik/kejadian/[id]`. Selain itu teks biasa. |
| Sumber | `sumber_label` | Teks apa adanya. |
| Layer | `layer_key` | String tersimpan (`bmkgQuakes`, `magmaQuakes`, `sipongiHotspots`, `tatonasStations`). Jangan memetakan lewat `loggerKind`. |
| Waktu sinyal | `waktu_sinyal` | Jika string: `new Date(… ).toLocaleString("id-ID")` (sama daftar kejadian). Jika `null`: `—`. |
| Kabupaten | `kabupaten` | Jika `kabupaten` atau `kode_kabupaten` ada setelah `trim` → tampilkan `kabupaten` jika ada, else `kode_kabupaten`. Jika keduanya kosong (`calonBelumTerikat`): `sikCalon.belumTerikat`. |
| Tautan | `tautan_status` | `utuh` → `sikCalon.tautanUtuh`; `putus` → `sikCalon.tautanPutus`. |
| Asal | `asal_buat` | `otomatis` → `sikCalon.asalOtomatis`; `manual` → `sikCalon.asalManual`. |
| Aksi | — | Hanya tab `draf`: tombol Terima + Tolak. Tab lain: kosong. |

**Jangan tampilkan:** `properties_snapshot` (mentah atau JSON), angka korban, `logger_kind`, `kd_hardware`, `external_id`, koordinat sebagai kolom, `ditolak_alasan` sebagai kolom, `usulan_*` sebagai kolom (usulan hanya di form).

`properties_snapshot` boleh dibaca di memori karena GET `select("*")`; jangan dirender.

---

### 5. Form terima — hanya `draf`

**Keputusan.** Satu panel pada baris (bukan rute baru). Hanya jika `row.status === "draf"`. `POST /api/sik/calon-kejadian/{id}/terima` dengan `Content-Type: application/json`, kredensial sesi sama-origin.

`calonBelumTerikat` di UI = `!row.kode_kabupaten?.trim() && !row.kabupaten?.trim()` (sama `overlay-calon.ts`).

#### 5.1 Kabupaten / `kode_kabupaten`

Pakai `ACEH_KABUPATEN` + `findKabupaten` dari `@/lib/sik/juklak`. Jangan mengarang kabupaten. Select seperti `KejadianWizard`: `option value={k.kode}` → `{k.kode} · {k.nama}`.

| Kondisi | Perilaku UI | Body |
| --- | --- | --- |
| Calon sudah terikat | Jangan tampilkan select. Tampilkan nama yang sudah ada sebagai teks. | Jangan kirim `kabupaten` / `kode_kabupaten`. |
| Belum terikat **dan** `isKabScoped` (`admin_kabkota`) | Select **wajib**. Tanpa opsi kosong. Submit diblokir jika belum dipilih. | Kirim `kode_kabupaten` = kode katalog **dan** `kabupaten` = `findKabupaten(kode).nama`. |
| Belum terikat **dan** bukan kab-scoped (`super_admin` / `admin_provinsi`) | Select opsional. Opsi pertama kosong = `sikCalon.fieldKabupatenEmpty` (gempa laut). | Jika kosong: jangan kirim kedua field. Jika dipilih: kirim kode + nama katalog. |

Jangan mengisi diam-diam dari `title` overlay atau `properties_snapshot`.

#### 5.2 `waktu_kejadian`

| Kondisi | Perilaku UI | Body |
| --- | --- | --- |
| `waktu_sinyal` terisi | Jangan tampilkan input waktu. | Jangan kirim `waktu_kejadian` (API memakai `waktu_sinyal`). |
| `waktu_sinyal` `null` | Dua input seperti wizard: `type="date"` + `type="time"`. Keduanya wajib. **Jangan** pra-isi hari ini / `now()`. | Susun `${tarikh}T${jam}:00+07:00` lalu `new Date(…).toISOString()` (sama `KejadianWizard`). String hasil min 8 karakter. |

Jika tanggal atau jam kosong, blokir submit dengan `sikCalon.errorWaktuWajib`. Jangan memakai fallback wizard `jam || "00:00"`. Jangan mengirim string kosong agar API mengisi `now()`.

#### 5.3 `kode_jenis`

Pakai `JENIS_BENCANA_JUKLAK` dari `@/lib/sik/jenis-bencana` (select wizard: `{j.kode} · {j.jenis}`). Jangan menebak dari `loggerKind`, `kd_hardware`, `layer_key`, atau `properties_snapshot`.

| Kondisi | Perilaku UI | Body |
| --- | --- | --- |
| `usulan_kode_jenis` terisi (bukan `null`) | Jangan tampilkan select. Tampilkan teks baca `usulan_jenis_bencana` jika string, else `String(usulan_kode_jenis)`. | Jangan kirim `kode_jenis`. |
| `usulan_kode_jenis` `null` (Tatonas / AN-4: wajib di body) | Select **wajib**. Opsi pertama kosong. | Kirim `kode_jenis` sebagai **angka JSON** (`Number`), bukan string. Rute terima hanya menerima `typeof === "number"`. |

Submit tanpa pilihan → `sikCalon.errorJenisWajib`.

#### 5.4 `nama_kejadian`

Input teks opsional, nilai awal = `nama_sinyal`. Jika setelah trim panjang ≥ 2, kirim `nama_kejadian`. Jika kosong, jangan kirim (API `resolveNamaTerima`).

Jangan tampilkan select slug nama wizard. Jangan field korban, SK, himbauan, KRB.

#### 5.5 Setelah 200

Baca `kejadian.id` dari JSON (`{ item, kejadian }`). Itu `kejadian_id`. Arahkan dengan `useRouter` dari `@/i18n/routing`:

```
router.push({ pathname: "/admin/sik/kejadian/[id]", params: { id: kejadian.id } })
```

Jika 200 tetapi `kejadian.id` absen, tampilkan `sikCalon.errorTerima` dan **jangan** mengarang UUID. 409 (`bukan draf` / sudah diputus) atau 4xx/5xx: tampilkan `error` string API jika ada, else `sikCalon.errorTerima`; tetap di daftar; jangan navigasi.

Satu panel terbuka pada satu waktu: klik Terima atau Tolak di baris lain menutup panel yang terbuka. Batal menutup panel tanpa fetch. Jangan dua panel sekaligus.

---

### 6. Form tolak — hanya `draf`

**Keputusan.** Panel pada baris yang sama. `POST /api/sik/calon-kejadian/{id}/tolak`.

- `ditolak_alasan`: textarea opsional. Jika trim kosong, kirim `{}` — jangan mengarang alasan, jangan kirim `null`.
- Jika ada teks, kirim `{ ditolak_alasan: string }`.
- Setelah **200**: tetap di `/admin/sik/kejadian/calon`, tab tetap `draf`, fetch ulang `?status=draf`. Baris itu hilang dari tab draf (status API sudah `ditolak`). Jangan pindah ke tab `ditolak` otomatis.
- Gagal: `sikCalon.errorTolak` atau `error` API; panel tetap terbuka.

---

### 7. Tombol popup peta — **bukan FE-8**

**Keputusan.** FE-8 **tidak** menambah tombol, aksi, atau `POST /api/sik/calon-kejadian` di peta publik, `MapOverlays`, `MapToolbar`, atau popup overlay.

Peta publik **tidak** menulis calon. Calon otomatis tetap dari job overlay (AN-4 / BE-6). Calon manual dari popup staf, jika dikerjakan nanti, adalah tiket permukaan terpisah — **bukan FE-8**.

Jangan menaruh "buat calon dari peta" di `CalonKejadianList`.

---

### 8. Namespace i18n `sikCalon`

**Keputusan.** Tambah objek akar `sikCalon` di `messages/id.json` dan `messages/en.json`. Jangan menimpa kunci di `admin`, `map`, atau namespace lain. Jangan memakai `t("admin.create")` untuk judul halaman calon (tautan "Buat" di daftar kejadian tetap `admin`).

Hanya kunci di tabel ini. Jangan menambah kunci lain di `sikCalon`.

| Kunci | id | en |
| --- | --- | --- |
| `title` | Calon kejadian | Candidate incidents |
| `lead` | Sinyal overlay yang menunggu diterima atau ditolak. Menerima membuat kejadian draf, bukan kejadian aktif. | Overlay signals waiting to be accepted or rejected. Accepting creates a draft incident, not an active one. |
| `navFromList` | Calon | Candidates |
| `overviewTitle` | Calon kejadian | Candidate incidents |
| `overviewBody` | Tinjau sinyal overlay (BMKG, MAGMA, Sipongi, Tatonas) sebelum menjadi kejadian SIK. | Review overlay signals (BMKG, MAGMA, Sipongi, Tatonas) before they become SIK incidents. |
| `tabDraf` | Draf | Draft |
| `tabDitolak` | Ditolak | Rejected |
| `tabDiterima` | Diterima | Accepted |
| `colNama` | Nama sinyal | Signal name |
| `colSumber` | Sumber | Source |
| `colLayer` | Layer | Layer |
| `colWaktu` | Waktu sinyal | Signal time |
| `colKabupaten` | Kabupaten | Regency |
| `colTautan` | Tautan | Link |
| `colAsal` | Asal | Origin |
| `colAksi` | Aksi | Actions |
| `belumTerikat` | belum terikat | unbound |
| `tautanUtuh` | utuh | intact |
| `tautanPutus` | putus | broken |
| `asalOtomatis` | otomatis | automatic |
| `asalManual` | manual | manual |
| `empty` | Tidak ada calon pada tab ini. | No candidates in this tab. |
| `loading` | Memuat… | Loading… |
| `loadError` | Gagal memuat calon. | Failed to load candidates. |
| `actionTerima` | Terima | Accept |
| `actionTolak` | Tolak | Reject |
| `actionBatal` | Batal | Cancel |
| `actionKirimTerima` | Terima menjadi kejadian | Accept as incident |
| `actionKirimTolak` | Tolak calon | Reject candidate |
| `formTerimaTitle` | Terima calon | Accept candidate |
| `formTolakTitle` | Tolak calon | Reject candidate |
| `fieldKabupaten` | Kabupaten/Kota | Regency / city |
| `fieldKabupatenEmpty` | Tidak terikat (gempa laut) | Unbound (offshore quake) |
| `fieldWaktuTanggal` | Tanggal kejadian | Incident date |
| `fieldWaktuJam` | Jam kejadian | Incident time |
| `fieldJenis` | Jenis bencana | Hazard type |
| `fieldJenisEmpty` | Pilih jenis | Choose type |
| `fieldNama` | Nama kejadian | Incident name |
| `fieldAlasan` | Alasan (opsional) | Reason (optional) |
| `errorKabupatenWajib` | Kabupaten wajib untuk admin kab/kota jika calon belum terikat. | Regency is required for regency admins when the candidate is unbound. |
| `errorWaktuWajib` | Isi tanggal dan jam kejadian. Jangan dibiarkan kosong. | Enter the incident date and time. Do not leave them empty. |
| `errorJenisWajib` | Pilih jenis bencana dari katalog Juklak. | Choose a hazard type from the Juklak catalog. |
| `errorTerima` | Gagal menerima calon. | Failed to accept the candidate. |
| `errorTolak` | Gagal menolak calon. | Failed to reject the candidate. |

`KejadianOpsList` memakai `useTranslations("sikCalon")` hanya untuk `navFromList`. Overview memakai `getTranslations("sikCalon")` hanya untuk `overviewTitle` / `overviewBody`. Halaman calon memakai `sikCalon` untuk semua salinan di atas.

---

### 9. API — cukup; jangan membuat BE-9

**Keputusan.** Jangan membuat tiket backend baru untuk permukaan calon. GET daftar, filter `status`, potong wilayah, POST terima (body AN-4), POST tolak, dan `{ item, kejadian }` sudah ada di BE-6. FE-8 tidak membutuhkan endpoint baru, query baru, atau pagination.

`BE-9` di STATUS gelombang 4 (API katalog / jadwal SDI) **bukan** tiket celah UI calon. Jangan mengisinya dari AN-6 / FE-8.

Catatan implementasi (bukan celah backend): `kode_jenis` di body terima harus **number** JSON. Itu kewajiban FE-8, bukan alasan mengubah rute.

---

### Larangan (FE-8)

- `loggerKind` / `kd_hardware` / satuan sensor Tatonas
- Zona KRB atau erupsi dari `magmaVolcanoes`
- Angka korban; field dampak; `status_darurat` / SK / himbauan
- Men-set kejadian `aktif` dari UI ini
- Peran baru atau item sidebar baru
- Tombol popup peta (butir 7)
- Menimpa kunci i18n lama
- Mengubah AN-4 atau berkas `src/app/api/**`

## Bacaan ulang sebagai implementer FE-8

Dibaca dari awal seolah tiket besok adalah FE-8, tanpa menanyakan analis.

| Pertanyaan implementer | Jawaban terkunci |
| --- | --- |
| Halaman mana? | `src/app/[locale]/admin/(console)/sik/kejadian/calon/page.tsx` → `/admin/sik/kejadian/calon`. |
| Sidebar baru? | Tidak. `AdminShell` tidak diubah. Item Kejadian tetap aktif via `startsWith`. |
| Typed Link gagal? | Tambah pathname di `routing.ts` (pengecualian FE-8). |
| Siapa lolos? | Sama `kejadian/page.tsx`. Bukan desa / PKD / RR. |
| Flag form? | Hanya `isKabScoped`. Katalog kab penuh; 403 = error API. |
| Fetch? | `GET /api/sik/calon-kejadian?status=` default `draf`. `{ items }`. Tanpa page. |
| Kolom? | Tujuh field + aksi. Bukan snapshot, bukan korban. |
| `kode_jenis` string dari `<select>`? | `Number(value)` sebelum JSON. Rute menolak string. |
| Waktu kosong? | Jangan `now()`, jangan `jam \|\| "00:00"`. Blokir submit. |
| Setelah terima? | `kejadian.id` → `/admin/sik/kejadian/[id]`. |
| Setelah tolak? | Body `{}` jika alasan kosong. Tetap tab draf, fetch ulang. |
| Popup peta? | **Bukan FE-8.** Jangan `POST /api/sik/calon-kejadian`. |
| i18n? | Akar `sikCalon`, hanya kunci tabel. |
| Backend baru? | Tidak. BE-9 tidak dibuat. |

Tidak ada butir yang masih “pilih salah satu”.

## Bukti

Putaran 1 — niat ditulis dari brief AN-6 + AN-4 (hanya dirujuk) + rute GET/terima/tolak + `OverlayCalonKejadianRow` + `KejadianOpsList` / `AdminShell` / `routing.ts` / halaman kejadian / overview.  
Putaran 2 — bacaan ulang niat: cabang “nanti” dihapus; popup dikunci **bukan FE-8**; BE-9 tidak dibuat.  
Putaran 3 — naskah lengkap (rute, guard, kolom, form, i18n, API).  
Putaran 4 — bacaan ulang sebagai implementer FE-8: cabang yang tersisa dikunci (operan hanya boolean; tolak kosong = `{}`; usulan selalu teks baca; satu panel; daftar kunci i18n tertutup; tautan header = `Button outline`; jam tidak diisi `00:00` diam-diam). Tidak ada celah API wajib.

## Bacaan ulang bukti versus kriteria

- [x] Rute daftar terkunci: `/admin/sik/kejadian/calon`; bukan modul sidebar; tautan header + kartu overview
- [x] Guard = `requireStaffPage` + `canAccessModule(..., "kejadian")`; peran sama AN-4
- [x] GET `?status=` default `draf`; tab draf/ditolak/diterima; tanpa pagination
- [x] Kolom = field baris yang disebut; bukan snapshot mentah; bukan korban
- [x] Form terima: kabupaten / waktu / jenis wajib sesuai kondisi; katalog yang sudah ada; nama opsional; 200 → detail `kejadian.id`
- [x] Form tolak: alasan opsional; 200 tetap di daftar draf
- [x] Popup peta tertulis **bukan FE-8**; peta publik tidak menulis calon
- [x] Namespace `sikCalon` dengan daftar kunci; jangan menimpa kunci lama
- [x] API cukup; BE-9 tidak dibuat
- [x] Tidak menebak Tatonas logger, KRB, korban; tidak membuat kejadian aktif; tidak menambah peran

## Keputusan

siap-kode
