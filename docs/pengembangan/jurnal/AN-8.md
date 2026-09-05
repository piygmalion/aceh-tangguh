# AN-8 — naskah Satu Data Bencana daerah

Agent: analis
Gelombang: 4
Status: selesai — naskah terpakai gelombang 5. Jangan ditulis ulang.

## Niat

- Tujuan: Mengunci kontrak SDI daerah agar DATA-5, BE-9, BE-10, dan FE-9 dikerjakan tanpa menebak peran, kolom `kejadian_operasi`, atau kanal BNPB. Tiket ini tulisan. Tidak mengimplementasikan tiket pelaksana. Tidak mengubah `src/`. Tidak menyunting migrasi lama. Tidak menabrak AN-6 / FE-7 / FE-8 (UI calon dan sisa hazards).
- Berkas:
  - `docs/pengembangan/jurnal/AN-8.md`
  - `docs/pengembangan/04-analis.md`
  - `docs/pengembangan/STATUS.md`
- Langkah:
  1. Tulis dual-track Pasal 32/33 di atas calon/fase yang ada, katalog + kelas akses, jejak validasi, kalender kirim, non-tujuan.
  2. Baca ulang; hapus peran baru, POST nasional, kolom DIBI, tebakan Tatonas/KRB/korban.
  3. Tulis naskah yang bisa dijalankan DATA-5 / BE-9 / BE-10 / FE-9.
  4. Lampiran status Juklak 7/9 agar P2 `tutup_celah` tidak dibuka ulang.
  5. `siap-kode` hanya jika setiap keputusan punya satu perilaku.
- Cara membuktikan:
  - Tidak ada peran di luar `roles.ts` / `is_ops()` / `canLockStatis`.
  - Tidak ada kolom baru pada `kejadian_operasi` atau `overlay_calon_kejadian`.
  - AN-4 tetap kontrak.
  - FE-8 tetap milik AN-6.
- Risiko: peran baru; perluasan `is_ops()`; POST `data.bnpb.go.id`; mengulang P2; fork `crypto.ts`; menimpa AN-6.

## Bacaan ulang niat

Pasal 32 = jangan paksa metadata SDI saat `dinamis` / `status_darurat`. Pasal 33 = checklist pada `POST .../fase` ke `statis`. Katalog/validasi/jadwal = tabel baru. UI calon sudah dikunci AN-6.

## Perubahan

| Berkas | Isi |
| --- | --- |
| `docs/pengembangan/jurnal/AN-8.md` | Naskah + lampiran Juklak |
| `docs/pengembangan/04-analis.md` | Brief AN-8 |
| `docs/pengembangan/STATUS.md` | AN-8 `siap-kode`; DATA-5 / BE-9 / BE-10 / FE-9 terdaftar |

## Naskah (untuk DATA-5, BE-9, BE-10, FE-9)

Jangan menambah peran, jenis bencana, ambang magnitudo, atau kolom pada `kejadian_operasi` / `overlay_calon_kejadian`. Jangan scrape hulu. Jangan POST ke `data.bnpb.go.id`.

### Istilah

- **SIK daerah** = Aceh Tangguh sebagai Satu Data Bencana Daerah (Perban 1/2023 Pasal 31).
- **Produsen kab** = `admin_kabkota`.
- **Walidata daerah** = `canLockStatis`.
- **Ops** = `requireOpsApi` / `is_ops()` — himpunan AN-4, tidak diperlebar.
- **Katalog** = `sdb_katalog`.
- **Validasi** = `sdb_validasi` (append-only).
- **Jadwal kirim** = `sdb_jadwal_kirim`.

### 1. Dual-track Pasal 32 / 33

| Keadaan | Perilaku tunggal |
| --- | --- |
| `fase_data = dinamis` | Metadata katalog tidak wajib. Dampak/kaji boleh parsial. |
| `status_darurat = true` | Sama. BE-10: peringatan jika belum ada `kejadian_dampak.tanggal` = hari ini `Asia/Jakarta`. |
| Calon `draf` | Bukan kejadian. AN-4 / AN-6. |
| Terima calon | AN-4: `draft` + `dinamis` + `is_bencana=false`. |
| `POST .../fase` ke `statis` | Hanya `canLockStatis`. Checklist di bawah. Tulis `rekap_statis`. Sisipkan `sdb_validasi` `diterima`. |
| Checklist gagal | 400; fase tidak berubah; tidak ada validasi `diterima`. |
| Kembalikan | Fase `statis` → `diajukan` (`canLockStatis`) + `sdb_validasi` `dikembalikan`. |

**Checklist kunci statis**

1. Minimal satu `kejadian_dampak` untuk kejadian itu.
2. `kode_jenis` tidak null dan ada di `jenis_bencana`.
3. `kode_kabupaten` lolos `findKabupaten` **atau** (`kib_sumber` ∈ {`episentrum`, `laut`} dan `kode_kabupaten_kib` lolos `findKabupaten`).
4. Jika `kib_sumber = lokasi`: `kode_kecamatan` 6 digit berawalan `kode_kabupaten`; `kode_desa_kelurahan` 10 digit berawalan `kode_kecamatan`.
5. Jika `kib_sumber` ∈ {`episentrum`, `laut`}: langkah 4 tidak wajib; `kib_catatan` wajib.
6. `latitude` dan `longitude` tidak null; representasi desimal ≥6 digit di belakang koma. Jangan mengarang desimal.
7. `kib` 16 digit sudah ada; jika tidak, 400.
8. Jangan menambah syarat korban, SK darurat, atau zona KRB.

**Peringatan dinamis**

- `GET /api/sik/kejadian/peringatan-dinamis` — `requireOpsApi`.
- Filter: `status_darurat = true` AND `fase_data = dinamis` AND tidak ada dampak tanggal hari ini `Asia/Jakarta`.
- Scope: `matchesKabScope` untuk kabkota; semua untuk provinsi / `super_admin`.
- Jangan WhatsApp / `notifikasi_wa`.
- FE-9 menampilkan jumlah di `/admin/sik/kejadian` jika > 0.

### 2. Peran — tidak berubah

| Aksi | Siapa | Ditolak |
| --- | --- | --- |
| Baca katalog | `isSikStaff` | anon |
| Ubah katalog / jadwal | `canLockStatis` | kabkota, desa, penilai, RR |
| Validasi `diajukan` | `requireOpsApi` + scope; `fase_data = diajukan` | desa / penilai / RR |
| Validasi `dikembalikan` | `canLockStatis` | kabkota |
| Validasi `diterima` | hanya otomatis dari kunci statis BE-10 | POST langsung 400 |
| UI calon | AN-6 / FE-8 | — |

Jangan menambah baris `admin_profiles_role_check`.

### 3. Katalog, kelas akses, kode referensi

#### 3.1 `sdb_katalog` (DATA-5)

| Kolom | Tipe | Aturan |
| --- | --- | --- |
| `kunci` | text PK | slug seed |
| `judul` | text not null | |
| `konsep` | text not null | |
| `definisi` | text not null | |
| `satuan` | text | boleh kosong |
| `klaster` | text not null | `pra` \| `darurat` \| `pasca` \| `pembiayaan` |
| `kelas_akses` | text not null | `terbuka` \| `terbatas` \| `rahasia` \| `sangat_rahasia` |
| `produsen` | text not null | `admin_kabkota` \| `admin_provinsi` \| `sistem` |
| `periode_kirim` | text not null | `harian` \| `bulanan` \| `triwulan` \| `semester` \| `tahunan` \| `insidental` |
| `kode_referensi` | text not null | `jenis_bencana` \| `wilayah_kemendagri` \| `kib` \| `tidak_ada` |
| `tabel_sumber` | text not null | tabel yang sudah ada |
| `updated_at` | timestamptz | default now |

RLS: `SELECT` `is_staff()`; tulis hanya `is_walidata()`. Tanpa anon.

Seed 12 kunci:

| kunci | klaster | kelas_akses | produsen | periode_kirim | kode_referensi | tabel_sumber |
| --- | --- | --- | --- | --- | --- | --- |
| `kejadian_operasi` | darurat | terbuka | admin_kabkota | insidental | kib | kejadian_operasi |
| `kejadian_dampak` | darurat | terbatas | admin_kabkota | harian | kib | kejadian_dampak |
| `pengungsian_kaji` | darurat | terbatas | admin_kabkota | harian | kib | pengungsian_kaji |
| `kejadian_korban` | darurat | rahasia | admin_kabkota | insidental | tidak_ada | kejadian_korban |
| `pengungsi_terpilah` | darurat | rahasia | admin_kabkota | insidental | tidak_ada | pengungsi_terpilah |
| `overlay_calon_kejadian` | darurat | terbatas | sistem | insidental | tidak_ada | overlay_calon_kejadian |
| `irbi` | pra | terbuka | admin_provinsi | tahunan | wilayah_kemendagri | irbi_documents |
| `krb` | pra | terbuka | admin_provinsi | tahunan | wilayah_kemendagri | krb_dokumen |
| `profil_desa` | pra | terbuka | admin_provinsi | tahunan | wilayah_kemendagri | profil_desa |
| `pkd` | pra | terbatas | admin_kabkota | tahunan | wilayah_kemendagri | pkd_tugas |
| `rehab_kebutuhan` | pasca | terbatas | admin_kabkota | insidental | kib | rehab_kebutuhan |
| `anggaran` | pembiayaan | terbuka | admin_provinsi | tahunan | tidak_ada | anggaran_analisis |

Jangan seed `sangat_rahasia`.

| Kelas | Publik | Staf |
| --- | --- | --- |
| terbuka | GET yang sudah ada | ya |
| terbatas | tidak untuk mikrodata | `is_ops()` atau modul yang sudah ada |
| rahasia | tidak | `is_ops()` |
| sangat_rahasia | tidak | jangan diimplementasi |

G4 tidak mengubah RLS tabel operasional lama.

#### 3.2 API (BE-9)

| Metode | Path | Gerbang | Isi |
| --- | --- | --- | --- |
| GET | `/api/sik/sdb/katalog` | staf | semua |
| GET | `/api/sik/sdb/katalog?kelas_akses=terbuka` | staf | filter |
| PATCH | `/api/sik/sdb/katalog/[kunci]` | `canLockStatis` | hanya `judul`, `konsep`, `definisi`, `satuan`, `periode_kirim` |

Jangan GET publik katalog. `/sumber-data` tidak wajib berubah.

Kode referensi: pakai `jenis_bencana`, `ACEH_KABUPATEN`, `allocateKib`. Tidak ada tabel referensi baru.

### 4. Validasi dan jadwal

#### 4.1 `sdb_validasi`

Kolom: `id`, `kejadian_id` FK cascade, `status` (`diajukan` \| `dikembalikan` \| `diterima`), `catatan` (wajib jika dikembalikan), `created_by`, `created_at`. Append-only.

| Metode | Path | Aturan |
| --- | --- | --- |
| GET | `/api/sik/kejadian/[id]/validasi` | `requireOpsApi` + scope |
| POST | `/api/sik/kejadian/[id]/validasi` | `{ status, catatan? }` sesuai §2 |

#### 4.2 `sdb_jadwal_kirim`

Kolom: `id`, `kunci` FK katalog, `periode_label`, `jatuh_tempo`, `status` (`terbuka` \| `terkirim` \| `terlambat`), `updated_at`. Unique `(kunci, periode_label)`. Tanpa seed baris.

- GET/POST `/api/sik/sdb/jadwal` — `canLockStatis`. GET kosong = `[]`. POST status awal `terbuka`. GET menandai `terlambat` jika `jatuh_tempo < today` dan masih `terbuka`. `PATCH` `terkirim` oleh walidata. Jangan mengunci fase dari jadwal. Jangan cron G4.

### 5. FE-9 — banner dinamis + katalog baca

- Banner jumlah peringatan di `/admin/sik/kejadian` jika GET > 0.
- Halaman staf `/admin/sik/sdb` (boleh nested `/admin/sik/kejadian/sdb` jika FE ingin menghindari sidebar baru — **perilaku tunggal:** `/admin/sik/sdb`, tautan dari daftar kejadian, **bukan** item sidebar baru).
- GET katalog BE-9. Jangan edit `kelas_akses` di UI.
- i18n `sikSdb`.
- Jangan mengerjakan UI calon (FE-8) di tiket ini.

### 6. Non-tujuan

- POST/CKAN `data.bnpb.go.id`
- Kolom `dibi_id` pada `kejadian_operasi`
- Analisis per KIB; filter ambang `/data-bencana` historis
- Rehab↔KIB; ARG; PUG IRBI
- Destana 7/2025 (AN-7)
- DATA-4; fork `crypto.ts`; mengubah `rekapStatis` / `allocateKib`
- Mengulang P2 tutup celah
- FE-7 / FE-8

### 7. Urutan

1. DATA-5 — tiga tabel + seed 12 kunci. Tanpa TypeScript.
2. BE-9 — API katalog / jadwal / validasi ajukan+kembalikan. Tipe di `db-tables.ts` boleh.
3. BE-10 — checklist kunci + validasi `diterima` + GET peringatan. Jangan ubah calon.
4. FE-9 — setelah BE-9 dan BE-10.

FE-8 boleh paralel (setelah AN-6) dan tidak menunggu AN-8.

---

## Lampiran — status Juklak 7/2023 + 9/2023 (4 September 2026)

Canvas `juklak-7-2023-telaah-kepatuhan` diselaraskan 4 September 2026 ke tabel ini. **Jangan membuka rencana `tutup_celah_juklak` sebagai P2.**

| id | butir | status 4 Sep 2026 | tiket |
| --- | --- | --- | --- |
| jenis | 13 jenis / 3 klasifikasi | selaras | — |
| tarikh | tarikh vs jam | selaras | — |
| kib | KIB 16 digit | selaras | — |
| kib-multi | episentrum / laut | selaras — `kib_sumber` | jangan ulang |
| ambang | `is_bencana` otomatis | selaras | — |
| manusia | matriks L/P × umur | selaras | — |
| warga | masyarakat bukan produsen KIB | selaras | — |
| ekonomi | `kerugian_rinci` | selaras | jangan ulang |
| sapras | rinci + rollup | selaras | jangan ulang |
| rumah-layan | RB/RS/RR di form | selaras | jangan ulang |
| pengungsi9 | `pengungsian_kaji` | selaras | jangan ulang |
| sdb | paket JSON manual | selaras sebagian; POST nasional dilarang | jangan buka API BNPB |
| publik | ambang SIK operasi | selaras `loadKejadianOperasiPublik`; historis `/data-bencana` tidak | kemudian, bukan P2 |
| rekap | terakhir vs puncak | selaras `rekapStatis` | — |
| kebutuhan-aset | ikut rekap | selaras | — |
| definisi-rusak | `DEFINISI_KERUSAKAN` | selaras di form dampak | jangan ulang |
| lokasi | kode kec/desa | parsial — kolom ada, belum wajib | BE-10 |
| koordinat | ≥6 desimal | parsial — GPS `toFixed(6)` | BE-10 butir 6 |
| fase | kalender kirim | parsial | `sdb_jadwal_kirim` |
| cetak | `rekap_statis` + matriks | parsial — cetak masih snapshot `latest` | kemudian, bukan P2 |
| damkar | jenis 202 | celah | kemudian, bukan P2 |
| hitung | multi-kab | parsial | kemudian |
| analisis | 4 jenis per KIB | celah | non-tujuan |
| narasi | sebaran teks | parsial, cukup | jangan tiket |

## Bacaan ulang sebagai implementer

DATA-5 hanya DDL + seed. BE-9 tidak menyentuh overlay/`crypto.ts`. BE-10 delapan butir pada `fase/route.ts`. FE-9 banner + tabel. FE-8 bukan tiket ini. P2 Damkar/cetak/analisis ditolak.

## Bukti

Tulisan murni. Tidak ada perubahan `src/`.

## Bacaan ulang bukti versus kriteria

- [x] Dual-track tanpa peran baru
- [x] Katalog / kelas / referensi / validasi / jadwal satu perilaku
- [x] Tidak ada kolom baru di `kejadian_operasi`
- [x] AN-4 dan AN-6 tidak dilanggar
- [x] Lampiran Juklak memisahkan P2 tertutup vs sisa
- [x] Non-tujuan menutup POST nasional, DIBI id, Destana skor, DATA-4

## Keputusan

selesai — naskah `siap-kode`
